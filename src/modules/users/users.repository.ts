import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, type SQL } from 'drizzle-orm';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type {
  INewUserRow,
  IUserRow,
} from '../../database/interfaces/i-user-row.js';
import { users } from '../../database/schema/index.js';
import type { IFindUsersOptions } from './interfaces/i-find-users-options.js';
import type { IUserListResult } from './interfaces/i-user-list-result.js';
import { USER_CONSTRAINT_MESSAGES } from './users.constants.js';

const SEARCHABLE_COLUMNS = [users.email, users.name];

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findById(id: string): Promise<IUserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return row;
  }

  async findByEmail(email: string): Promise<IUserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return row;
  }

  async findMany(options: IFindUsersOptions): Promise<IUserListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(users.createdAt), direction(users.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db.select({ value: count() }).from(users).where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async countActiveByCompany(companyId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.companyId, companyId), eq(users.isActive, true)));

    return row?.value ?? 0;
  }

  async create(data: INewUserRow): Promise<IUserRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db.insert(users).values(data).returning();

      return row;
    }, USER_CONSTRAINT_MESSAGES);
  }

  async update(
    id: string,
    data: Partial<INewUserRow>,
  ): Promise<IUserRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning();

      return row;
    }, USER_CONSTRAINT_MESSAGES);
  }

  // "Delete" is a status flip — the row is kept for audit and referential integrity
  async setStatus(id: string, status: boolean): Promise<IUserRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(users)
        .set({ isActive: status })
        .where(eq(users.id, id))
        .returning();

      return row;
    }, USER_CONSTRAINT_MESSAGES);
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  private buildFilters(options: IFindUsersOptions): SQL | undefined {
    const conditions: SQL[] = [];

    if (options.companyId) {
      conditions.push(eq(users.companyId, options.companyId));
    }

    if (options.role) {
      conditions.push(eq(users.role, options.role));
    }

    if (options.status !== undefined) {
      conditions.push(eq(users.isActive, options.status));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
