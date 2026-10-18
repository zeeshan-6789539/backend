import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, type SQL } from 'drizzle-orm';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type { INewPaymentRow, IPaymentRow } from '../../database/interfaces/i-payment-row.js';
import { payments, properties, tenants } from '../../database/schema/index.js';
import type { IFindPaymentsOptions } from './interfaces/i-find-payments-options.js';
import type { IPaymentListResult } from './interfaces/i-payment-list-result.js';
import { PAYMENT_CONSTRAINT_MESSAGES } from './payments.constants.js';

const SEARCHABLE_COLUMNS = [properties.name, tenants.name];

@Injectable()
export class PaymentsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  private selection() {
    return {
      id: payments.id,
      companyId: payments.companyId,
      propertyId: payments.propertyId,
      tenantId: payments.tenantId,
      leaseId: payments.leaseId,
      propertyName: properties.name,
      tenantName: tenants.name,
      amountPaid: payments.amountPaid,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      receiptNumber: payments.receiptNumber,
      referenceNumber: payments.referenceNumber,
      bankName: payments.bankName,
      chequeClearanceDate: payments.chequeClearanceDate,
      notes: payments.notes,
      status: payments.isActive,
      createdAt: payments.createdAt,
      createdBy: payments.createdBy,
    };
  }

  private baseQuery() {
    return this.db
      .select(this.selection())
      .from(payments)
      .innerJoin(properties, eq(payments.propertyId, properties.id))
      .innerJoin(tenants, eq(payments.tenantId, tenants.id));
  }

  async findById(id: string, companyId: string) {
    const [row] = await this.baseQuery().where(
      and(eq(payments.id, id), eq(payments.companyId, companyId)),
    );

    return row;
  }

  async findMany(options: IFindPaymentsOptions): Promise<IPaymentListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.baseQuery()
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(payments.paymentDate), direction(payments.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db
        .select({ value: count() })
        .from(payments)
        .innerJoin(properties, eq(payments.propertyId, properties.id))
        .innerJoin(tenants, eq(payments.tenantId, tenants.id))
        .where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async create(data: INewPaymentRow): Promise<IPaymentRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db.insert(payments).values(data).returning();

      return row;
    }, PAYMENT_CONSTRAINT_MESSAGES);
  }

  // "Delete" is a status flip — the row is kept for audit and stays visible in the ledger
  async setStatus(
    id: string,
    companyId: string,
    status: boolean,
    userId: string,
  ): Promise<IPaymentRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(payments)
        .set({
          isActive: status,
          deactivatedAt: status ? null : new Date(),
          deactivatedBy: status ? null : userId,
        })
        .where(and(eq(payments.id, id), eq(payments.companyId, companyId)))
        .returning();

      return row;
    }, PAYMENT_CONSTRAINT_MESSAGES);
  }

  private buildFilters(options: IFindPaymentsOptions): SQL | undefined {
    const conditions: SQL[] = [eq(payments.companyId, options.companyId)];

    if (options.leaseId) {
      conditions.push(eq(payments.leaseId, options.leaseId));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return and(...conditions);
  }
}
