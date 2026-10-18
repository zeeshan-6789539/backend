import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, type SQL } from 'drizzle-orm';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type {
  ICompanyRow,
  INewCompanyRow,
} from '../../database/interfaces/i-company-row.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type { IDrizzleExecutor } from '../../database/interfaces/i-drizzle-executor.js';
import type { IDrizzleTransaction } from '../../database/interfaces/i-drizzle-transaction.js';
import { companies } from '../../database/schema/index.js';
import { COMPANY_CONSTRAINT_MESSAGES } from './companies.constants.js';
import type { ICompanyListResult } from './interfaces/i-company-list-result.js';
import type { IFindCompaniesOptions } from './interfaces/i-find-companies-options.js';

const SEARCHABLE_COLUMNS = [companies.name, companies.email, companies.city];

@Injectable()
export class CompaniesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findById(id: string): Promise<ICompanyRow | undefined> {
    const [row] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    return row;
  }

  async findMany(options: IFindCompaniesOptions): Promise<ICompanyListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.db
        .select()
        .from(companies)
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(companies.createdAt), direction(companies.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db.select({ value: count() }).from(companies).where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async transaction<T>(work: (tx: IDrizzleTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }

  async create(
    data: INewCompanyRow,
    executor: IDrizzleExecutor = this.db,
  ): Promise<ICompanyRow> {
    return withDatabaseErrors(async () => {
      const [row] = await executor.insert(companies).values(data).returning();

      return row;
    }, COMPANY_CONSTRAINT_MESSAGES);
  }

  async update(
    id: string,
    data: Partial<INewCompanyRow>,
  ): Promise<ICompanyRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(companies)
        .set(data)
        .where(eq(companies.id, id))
        .returning();

      return row;
    }, COMPANY_CONSTRAINT_MESSAGES);
  }

  // "Delete" is a status flip — the row is kept for audit and referential integrity
  async setStatus(
    id: string,
    status: boolean,
  ): Promise<ICompanyRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(companies)
        .set({ isActive: status })
        .where(eq(companies.id, id))
        .returning();

      return row;
    }, COMPANY_CONSTRAINT_MESSAGES);
  }

  private buildFilters(options: IFindCompaniesOptions): SQL | undefined {
    const conditions: SQL[] = [];

    if (options.city) {
      conditions.push(eq(companies.city, options.city));
    }

    if (options.status !== undefined) {
      conditions.push(eq(companies.isActive, options.status));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
