import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type { IDrizzleExecutor } from '../../database/interfaces/i-drizzle-executor.js';
import type {
  INewFacilityRow,
  IFacilityRow,
} from '../../database/interfaces/i-facility-row.js';
import { facilities } from '../../database/schema/index.js';
import type { IFindFacilitiesOptions } from './interfaces/i-find-facilities-options.js';
import type { IFacilityListResult } from './interfaces/i-facility-list-result.js';
import { FACILITY_CONSTRAINT_MESSAGES } from './facilities.constants.js';

const SEARCHABLE_COLUMNS = [facilities.name];

// A dealer only ever sees its own facilities
const visibleTo = (companyId: string): SQL => eq(facilities.companyId, companyId);

@Injectable()
export class FacilitiesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findVisibleById(
    companyId: string,
    id: string,
  ): Promise<IFacilityRow | undefined> {
    const [row] = await this.db
      .select()
      .from(facilities)
      .where(and(eq(facilities.id, id), visibleTo(companyId)))
      .limit(1);

    return row;
  }

  async findVisibleByIds(
    companyId: string,
    ids: readonly string[],
  ): Promise<IFacilityRow[]> {
    return this.db
      .select()
      .from(facilities)
      .where(and(inArray(facilities.id, [...ids]), visibleTo(companyId)));
  }

  // Case-insensitive, so "furnished" clashes with an existing "Furnished"
  async findVisibleByName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<IFacilityRow | undefined> {
    const [row] = await this.db
      .select()
      .from(facilities)
      .where(
        and(
          sql`lower(${facilities.name}) = ${name.toLowerCase()}`,
          visibleTo(companyId),
          excludeId ? ne(facilities.id, excludeId) : undefined,
        ),
      )
      .limit(1);

    return row;
  }

  // Names the company already has are skipped, so this is safe to repeat
  async createManyForCompany(
    companyId: string,
    names: readonly string[],
    executor: IDrizzleExecutor = this.db,
  ): Promise<number> {
    return withDatabaseErrors(async () => {
      const rows = await executor
        .insert(facilities)
        .values(names.map((name) => ({ companyId, name })))
        .onConflictDoNothing()
        .returning({ id: facilities.id });

      return rows.length;
    }, FACILITY_CONSTRAINT_MESSAGES);
  }

  async findMany(
    options: IFindFacilitiesOptions,
  ): Promise<IFacilityListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.db
        .select()
        .from(facilities)
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(facilities.createdAt), direction(facilities.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db.select({ value: count() }).from(facilities).where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async create(data: INewFacilityRow): Promise<IFacilityRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db.insert(facilities).values(data).returning();

      return row;
    }, FACILITY_CONSTRAINT_MESSAGES);
  }

  // Scoped to the company, so another dealer's rows can never be changed through here
  async update(
    companyId: string,
    id: string,
    data: Partial<INewFacilityRow>,
  ): Promise<IFacilityRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(facilities)
        .set(data)
        .where(
          and(eq(facilities.id, id), eq(facilities.companyId, companyId)),
        )
        .returning();

      return row;
    }, FACILITY_CONSTRAINT_MESSAGES);
  }

  async setStatus(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<IFacilityRow | undefined> {
    return this.update(companyId, id, { isActive: status });
  }

  private buildFilters(options: IFindFacilitiesOptions): SQL | undefined {
    const conditions: SQL[] = [visibleTo(options.companyId)];

    if (options.status !== undefined) {
      conditions.push(eq(facilities.isActive, options.status));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
