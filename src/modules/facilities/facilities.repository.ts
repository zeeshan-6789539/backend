import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type {
  INewFacilityRow,
  IFacilityRow,
} from '../../database/interfaces/i-facility-row.js';
import { facilities } from '../../database/schema/index.js';
import type { IFindFacilitiesOptions } from './interfaces/i-find-facilities-options.js';
import type { IFacilityListResult } from './interfaces/i-facility-list-result.js';
import { FACILITY_CONSTRAINT_MESSAGES } from './facilities.constants.js';

const SEARCHABLE_COLUMNS = [facilities.name];

// A dealer sees the built-in facilities plus its own
const visibleTo = (companyId: string): SQL | undefined =>
  or(eq(facilities.companyId, companyId), isNull(facilities.companyId));

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

  // Case-insensitive, so "furnished" clashes with the built-in "Furnished"
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

  async findBuiltInByName(name: string): Promise<IFacilityRow | undefined> {
    const [row] = await this.db
      .select()
      .from(facilities)
      .where(
        and(
          sql`lower(${facilities.name}) = ${name.toLowerCase()}`,
          isNull(facilities.companyId),
        ),
      )
      .limit(1);

    return row;
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

  // Scoped to the company, so built-in rows can never be changed through here
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
    return this.update(companyId, id, { status });
  }

  private buildFilters(options: IFindFacilitiesOptions): SQL | undefined {
    const conditions: SQL[] = [];
    const visible = visibleTo(options.companyId);

    if (visible) {
      conditions.push(visible);
    }

    if (options.status !== undefined) {
      conditions.push(eq(facilities.status, options.status));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
