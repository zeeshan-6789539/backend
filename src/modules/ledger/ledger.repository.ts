import { Inject, Injectable } from '@nestjs/common';
import { and, eq, type SQL } from 'drizzle-orm';
import { ChargeType } from '../../common/enums/charge-type.enum.js';
import { LeaseStatus } from '../../common/enums/lease-status.enum.js';
import { TransactionType } from '../../common/enums/transaction-type.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
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
import type { ILedgerEntryRow } from './interfaces/i-ledger-entry-row.js';
import { CHARGE_CONSTRAINT_MESSAGES } from './ledger.constants.js';

const SEARCHABLE_COLUMNS = [properties.name, tenants.name];

@Injectable()
export class LedgerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findChargesForStatement(
    companyId: string,
    leaseId: string | undefined,
    search: string | undefined,
  ): Promise<ILedgerEntryRow[]> {
    const where = this.buildStatementFilters(charges.companyId, charges.leaseId, companyId, leaseId, search);

    const rows = await this.db
      .select({
        id: charges.id,
        companyId: charges.companyId,
        propertyId: charges.propertyId,
        tenantId: charges.tenantId,
        leaseId: charges.leaseId,
        entryType: charges.chargeType,
        transactionType: charges.transactionType,
        amount: charges.amount,
        billingMonth: charges.billingMonth,
        dueDate: charges.dueDate,
        description: charges.description,
        status: charges.isActive,
        createdAt: charges.createdAt,
        createdBy: charges.createdBy,
        propertyName: properties.name,
        tenantName: tenants.name,
      })
      .from(charges)
      .innerJoin(properties, eq(charges.propertyId, properties.id))
      .innerJoin(tenants, eq(charges.tenantId, tenants.id))
      .where(where);

    return rows.map((row) => ({ ...row, paymentId: null }));
  }

  async findPaymentsForStatement(
    companyId: string,
    leaseId: string | undefined,
    search: string | undefined,
  ): Promise<ILedgerEntryRow[]> {
    const where = this.buildStatementFilters(payments.companyId, payments.leaseId, companyId, leaseId, search);

    const rows = await this.db
      .select({
        id: payments.id,
        companyId: payments.companyId,
        propertyId: payments.propertyId,
        tenantId: payments.tenantId,
        leaseId: payments.leaseId,
        amount: payments.amountPaid,
        dueDate: payments.paymentDate,
        referenceNumber: payments.referenceNumber,
        paymentMethod: payments.paymentMethod,
        status: payments.isActive,
        createdAt: payments.createdAt,
        createdBy: payments.createdBy,
        propertyName: properties.name,
        tenantName: tenants.name,
      })
      .from(payments)
      .innerJoin(properties, eq(payments.propertyId, properties.id))
      .innerJoin(tenants, eq(payments.tenantId, tenants.id))
      .where(where);

    return rows.map((row) => {
      const methodLabel = row.paymentMethod.replace(/_/g, ' ');

      return {
        id: row.id,
        companyId: row.companyId,
        propertyId: row.propertyId,
        tenantId: row.tenantId,
        leaseId: row.leaseId,
        paymentId: row.id,
        entryType: 'payment_received' as const,
        transactionType: TransactionType.CREDIT,
        amount: row.amount,
        billingMonth: null,
        dueDate: row.dueDate,
        description: row.referenceNumber
          ? `Payment received (${methodLabel}) – ref ${row.referenceNumber}`
          : `Payment received (${methodLabel})`,
        status: row.status,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
        propertyName: row.propertyName,
        tenantName: row.tenantName,
      };
    });
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
  ): Promise<IChargeRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(charges)
        .set({ isActive: status })
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

  async insertMonthlyRentCharges(rows: INewChargeRow[]): Promise<IChargeRow[]> {
    if (rows.length === 0) {
      return [];
    }

    // One transaction so a mid-batch failure doesn't leave some leases charged and others not
    return withDatabaseErrors(async () => {
      return this.db.transaction(async (tx) => {
        const inserted: IChargeRow[] = [];

        for (const row of rows) {
          const [entry] = await tx.insert(charges).values(row).returning();

          if (entry) {
            inserted.push(entry);
          }
        }

        return inserted;
      });
    }, CHARGE_CONSTRAINT_MESSAGES);
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
