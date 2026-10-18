import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import { ChargeType } from '../../common/enums/charge-type.enum.js';
import { LeaseStatus } from '../../common/enums/lease-status.enum.js';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { TransactionType } from '../../common/enums/transaction-type.enum.js';
import { chunk } from '../../common/utils/array.util.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IChargeRow, INewChargeRow } from '../../database/interfaces/i-charge-row.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import {
  charges,
  companies,
  leaseRentSchedules,
  leases,
  payments,
  properties,
  tenants,
} from '../../database/schema/index.js';
import type { IActiveLeaseForBilling } from './interfaces/i-active-lease-for-billing.js';
import type { IFindLedgerOptions } from './interfaces/i-find-ledger-options.js';
import type { ILedgerEntryWithBalance } from './interfaces/i-ledger-entry-row.js';
import type { ILedgerStatementRawRow } from './interfaces/i-ledger-statement-raw-row.js';
import type { ILedgerStatementResult } from './interfaces/i-ledger-statement-result.js';
import { CHARGE_CONSTRAINT_MESSAGES, MONTHLY_RENT_INSERT_BATCH_SIZE } from './ledger.constants.js';
import { toLedgerEntry } from './mappers/ledger-entry.mapper.js';

const SEARCHABLE_COLUMNS = [properties.name, tenants.name];

@Injectable()
export class LedgerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  // Charges and payments as one statement, with the per-lease running balance and paging done in SQL
  async findStatement(options: IFindLedgerOptions): Promise<ILedgerStatementResult> {
    const entries = this.statementEntriesSql(options.companyId, options.leaseId, options.search);
    const order = this.statementOrderSql(options.sortOrder);

    const [page, count] = await Promise.all([
      this.db.execute<ILedgerStatementRawRow>(sql`
        ${this.statementSelectSql(entries)}
        ORDER BY ${order}
        LIMIT ${options.limit} OFFSET ${getOffset(options.page, options.limit)}`),
      this.db.execute<{ total: number }>(sql`
        WITH entries AS (${entries})
        SELECT count(*)::int AS "total" FROM entries`),
    ]);

    return {
      items: page.rows.map(toLedgerEntry),
      totalItems: count.rows[0]?.total ?? 0,
    };
  }

  // The balance is a window over the whole lease, so the id filter runs after it, not inside it
  async findStatementEntry(
    companyId: string,
    leaseId: string,
    id: string,
  ): Promise<ILedgerEntryWithBalance | undefined> {
    const entries = this.statementEntriesSql(companyId, leaseId, undefined);

    const result = await this.db.execute<ILedgerStatementRawRow>(sql`
      ${this.statementSelectSql(entries)}
      WHERE balanced."id" = ${id}`);

    const [row] = result.rows;

    return row ? toLedgerEntry(row) : undefined;
  }

  async findChargeLeaseId(id: string, companyId: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ leaseId: charges.leaseId })
      .from(charges)
      .where(and(eq(charges.id, id), eq(charges.companyId, companyId)));

    return row?.leaseId;
  }

  async findChargeById(id: string, companyId: string): Promise<IChargeRow | undefined> {
    const [row] = await this.db
      .select()
      .from(charges)
      .where(and(eq(charges.id, id), eq(charges.companyId, companyId)));

    return row;
  }

  // "Delete" is a status flip — the row is kept and stays visible in the ledger
  async setChargeStatus(
    id: string,
    companyId: string,
    status: boolean,
    userId: string,
  ): Promise<IChargeRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(charges)
        .set({
          isActive: status,
          deactivatedAt: status ? null : new Date(),
          deactivatedBy: status ? null : userId,
        })
        .where(and(eq(charges.id, id), eq(charges.companyId, companyId)))
        .returning();

      return row;
    }, CHARGE_CONSTRAINT_MESSAGES);
  }

  async findPaymentLeaseId(id: string, companyId: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ leaseId: payments.leaseId })
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.companyId, companyId)));

    return row?.leaseId;
  }

  async createCharge(data: INewChargeRow): Promise<IChargeRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db.insert(charges).values(data).returning();

      return row;
    }, CHARGE_CONSTRAINT_MESSAGES);
  }

  // No companyId filter — this billing run covers every company's active leases in one pass
  async findActiveLeasesForBilling(): Promise<IActiveLeaseForBilling[]> {
    return this.db
      .select({
        leaseId: leases.id,
        companyId: leases.companyId,
        propertyId: leases.propertyId,
        tenantId: leases.tenantId,
        propertyNumber: properties.propertyNumber,
        propertyName: properties.name,
        tenantName: tenants.name,
        tenantEmail: tenants.email,
        rentAmount: leaseRentSchedules.rentAmount,
        rentDueDay: properties.rentDueDay,
        invoiceMailSend: companies.invoiceMailSend,
      })
      .from(leases)
      .innerJoin(companies, eq(leases.companyId, companies.id))
      .innerJoin(properties, eq(leases.propertyId, properties.id))
      .innerJoin(tenants, eq(leases.tenantId, tenants.id))
      .leftJoin(
        leaseRentSchedules,
        and(eq(leaseRentSchedules.leaseId, leases.id), eq(leaseRentSchedules.isCurrent, true)),
      )
      .where(eq(leases.status, LeaseStatus.ACTIVE));
  }

  // Only an active charge counts as "generated" — a deactivated one lets the next run regenerate + resend the invoice
  async findGeneratedLeaseIds(billingMonth: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ leaseId: charges.leaseId })
      .from(charges)
      .where(
        and(
          eq(charges.chargeType, ChargeType.MONTHLY_RENT),
          eq(charges.billingMonth, billingMonth),
          eq(charges.isActive, true),
        ),
      );

    return new Set(rows.map((row) => row.leaseId));
  }

  // A lease a concurrent run already billed is skipped by the unique index, so it is simply absent from the result
  async insertMonthlyRentCharges(rows: INewChargeRow[]): Promise<IChargeRow[]> {
    if (rows.length === 0) {
      return [];
    }

    // One transaction so a mid-batch failure doesn't leave some leases charged and others not
    return withDatabaseErrors(async () => {
      return this.db.transaction(async (tx) => {
        const inserted: IChargeRow[] = [];

        for (const batch of chunk(rows, MONTHLY_RENT_INSERT_BATCH_SIZE)) {
          inserted.push(...(await tx.insert(charges).values(batch).onConflictDoNothing().returning()));
        }

        return inserted;
      });
    }, CHARGE_CONSTRAINT_MESSAGES);
  }

  // Both halves share one column list so they can be UNION ALL-ed into a single statement
  private statementEntriesSql(
    companyId: string,
    leaseId: string | undefined,
    search: string | undefined,
  ): SQL {
    const chargeWhere = this.buildStatementFilters(charges.companyId, charges.leaseId, companyId, leaseId, search);
    const paymentWhere = this.buildStatementFilters(payments.companyId, payments.leaseId, companyId, leaseId, search);

    return sql`
      SELECT ${charges.id} AS "id", ${charges.companyId} AS "companyId", ${charges.propertyId} AS "propertyId",
        ${charges.tenantId} AS "tenantId", ${charges.leaseId} AS "leaseId",
        ${properties.name} AS "propertyName", ${tenants.name} AS "tenantName",
        NULL::uuid AS "paymentId", ${charges.chargeType}::text AS "entryType",
        ${charges.transactionType}::text AS "transactionType", ${charges.amount} AS "amount",
        ${charges.billingMonth} AS "billingMonth", ${charges.dueDate} AS "dueDate",
        ${charges.description} AS "description", ${charges.isActive} AS "status",
        ${charges.createdAt} AS "createdAt", ${charges.createdBy} AS "createdBy"
      FROM ${charges}
      INNER JOIN ${properties} ON ${properties.id} = ${charges.propertyId}
      INNER JOIN ${tenants} ON ${tenants.id} = ${charges.tenantId}
      WHERE ${chargeWhere}
      UNION ALL
      SELECT ${payments.id}, ${payments.companyId}, ${payments.propertyId},
        ${payments.tenantId}, ${payments.leaseId},
        ${properties.name}, ${tenants.name},
        ${payments.id}, 'payment_received',
        ${TransactionType.CREDIT}::text, ${payments.amountPaid},
        NULL::date, ${payments.paymentDate},
        'Payment received (' || replace(${payments.paymentMethod}::text, '_', ' ') || ')'
          || CASE WHEN coalesce(${payments.referenceNumber}, '') <> ''
            THEN ' – ref ' || ${payments.referenceNumber} ELSE '' END,
        ${payments.isActive}, ${payments.createdAt}, ${payments.createdBy}
      FROM ${payments}
      INNER JOIN ${properties} ON ${properties.id} = ${payments.propertyId}
      INNER JOIN ${tenants} ON ${tenants.id} = ${payments.tenantId}
      WHERE ${paymentWhere}`;
  }

  // Deactivated entries stay listed but add 0, so the balance carries over them unchanged
  private statementSelectSql(entries: SQL): SQL {
    return sql`
      WITH entries AS (${entries}),
      balanced AS (
        SELECT entries.*,
          (SUM(CASE WHEN "status" THEN
                 CASE WHEN "transactionType" = ${TransactionType.CREDIT} THEN -"amount" ELSE "amount" END
               ELSE 0 END)
            OVER (PARTITION BY "leaseId" ORDER BY "createdAt", "id" ROWS UNBOUNDED PRECEDING))::numeric(14, 2)
            AS "runningBalance"
        FROM entries
      )
      SELECT balanced."id", balanced."companyId", balanced."propertyId", balanced."tenantId", balanced."leaseId",
        balanced."propertyName", balanced."tenantName", balanced."paymentId", balanced."entryType",
        balanced."transactionType", balanced."amount", balanced."billingMonth"::text AS "billingMonth",
        balanced."dueDate"::text AS "dueDate", balanced."description", balanced."status",
        to_char(balanced."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
        balanced."createdBy", balanced."runningBalance"
      FROM balanced`;
  }

  // Newest billing month first, undated entries (payments, manual charges) after them, then newest created
  private statementOrderSql(sortOrder: SortOrder): SQL {
    return sortOrder === SortOrder.ASC
      ? sql`balanced."billingMonth" ASC NULLS FIRST, balanced."createdAt" ASC, balanced."id" ASC`
      : sql`balanced."billingMonth" DESC NULLS LAST, balanced."createdAt" DESC, balanced."id" DESC`;
  }

  private buildStatementFilters(
    companyIdColumn: typeof charges.companyId | typeof payments.companyId,
    leaseIdColumn: typeof charges.leaseId | typeof payments.leaseId,
    companyId: string,
    leaseId: string | undefined,
    search: string | undefined,
  ): SQL {
    const conditions: SQL[] = [eq(companyIdColumn, companyId)];

    if (leaseId) {
      conditions.push(eq(leaseIdColumn, leaseId));
    }

    const searchCondition = buildSearchCondition(search, SEARCHABLE_COLUMNS);

    if (searchCondition) {
      conditions.push(searchCondition);
    }

    return and(...conditions) as SQL;
  }
}
