import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  ne,
  sql,
  type SQL,
} from 'drizzle-orm';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type {
  IAreaRow,
  IAreaWithCityRow,
  INewAreaRow,
} from '../../database/interfaces/i-area-row.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import { areas, cities } from '../../database/schema/index.js';
import { AREA_CONSTRAINT_MESSAGES } from './areas.constants.js';
import type { IAreaListResult } from './interfaces/i-area-list-result.js';
import type { IFindAreasOptions } from './interfaces/i-find-areas-options.js';

const SEARCHABLE_COLUMNS = [areas.name, cities.name];

const AREA_WITH_CITY_COLUMNS = {
  ...getTableColumns(areas),
  cityName: cities.name,
};

@Injectable()
export class AreasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findById(
    companyId: string,
    id: string,
  ): Promise<IAreaWithCityRow | undefined> {
    const [row] = await this.db
      .select(AREA_WITH_CITY_COLUMNS)
      .from(areas)
      .innerJoin(cities, eq(areas.cityId, cities.id))
      .where(and(eq(areas.id, id), eq(areas.companyId, companyId)))
      .limit(1);

    return row;
  }

  async findByIds(
    companyId: string,
    ids: readonly string[],
  ): Promise<IAreaWithCityRow[]> {
    return this.db
      .select(AREA_WITH_CITY_COLUMNS)
      .from(areas)
      .innerJoin(cities, eq(areas.cityId, cities.id))
      .where(and(inArray(areas.id, [...ids]), eq(areas.companyId, companyId)));
  }

  async findByName(
    cityId: string,
    name: string,
    excludeId?: string,
  ): Promise<IAreaRow | undefined> {
    const [row] = await this.db
      .select()
      .from(areas)
      .where(
        and(
          eq(areas.cityId, cityId),
          sql`lower(${areas.name}) = ${name.toLowerCase()}`,
          excludeId ? ne(areas.id, excludeId) : undefined,
        ),
      )
      .limit(1);

    return row;
  }

  async findMany(options: IFindAreasOptions): Promise<IAreaListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.db
        .select(AREA_WITH_CITY_COLUMNS)
        .from(areas)
        .innerJoin(cities, eq(areas.cityId, cities.id))
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(areas.createdAt), direction(areas.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db
        .select({ value: count() })
        .from(areas)
        .innerJoin(cities, eq(areas.cityId, cities.id))
        .where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async create(data: INewAreaRow): Promise<IAreaRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db.insert(areas).values(data).returning();

      return row;
    }, AREA_CONSTRAINT_MESSAGES);
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<INewAreaRow>,
  ): Promise<IAreaRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(areas)
        .set(data)
        .where(and(eq(areas.id, id), eq(areas.companyId, companyId)))
        .returning();

      return row;
    }, AREA_CONSTRAINT_MESSAGES);
  }

  // "Delete" is a status flip — the row is kept for audit and referential integrity
  async setStatus(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<IAreaRow | undefined> {
    return this.update(companyId, id, { status });
  }

  private buildFilters(options: IFindAreasOptions): SQL | undefined {
    const conditions: SQL[] = [eq(areas.companyId, options.companyId)];

    if (options.cityId) {
      conditions.push(eq(areas.cityId, options.cityId));
    }

    if (options.status !== undefined) {
      conditions.push(eq(areas.status, options.status));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return and(...conditions);
  }
}
