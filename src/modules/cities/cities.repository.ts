import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { ICityRow, INewCityRow } from '../../database/interfaces/i-city-row.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import { areas, cities } from '../../database/schema/index.js';
import { CITY_CONSTRAINT_MESSAGES } from './cities.constants.js';
import type { ICityListResult } from './interfaces/i-city-list-result.js';
import type { IFindCitiesOptions } from './interfaces/i-find-cities-options.js';

@Injectable()
export class CitiesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findById(companyId: string, id: string): Promise<ICityRow | undefined> {
    const [row] = await this.db
      .select()
      .from(cities)
      .where(and(eq(cities.id, id), eq(cities.companyId, companyId)))
      .limit(1);

    return row;
  }

  async findByName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<ICityRow | undefined> {
    const [row] = await this.db
      .select()
      .from(cities)
      .where(
        and(
          eq(cities.companyId, companyId),
          sql`lower(${cities.name}) = ${name.toLowerCase()}`,
          excludeId ? ne(cities.id, excludeId) : undefined,
        ),
      )
      .limit(1);

    return row;
  }

  async findMany(options: IFindCitiesOptions): Promise<ICityListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.db
        .select()
        .from(cities)
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(cities.createdAt), direction(cities.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db.select({ value: count() }).from(cities).where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  // One grouped query for a whole page of cities, keyed by city id
  async countActiveAreas(cityIds: string[]): Promise<Map<string, number>> {
    if (cityIds.length === 0) return new Map();

    const rows = await this.db
      .select({ cityId: areas.cityId, value: count() })
      .from(areas)
      .where(and(inArray(areas.cityId, cityIds), eq(areas.status, true)))
      .groupBy(areas.cityId);

    return new Map(rows.map((row) => [row.cityId, row.value]));
  }

  async create(data: INewCityRow): Promise<ICityRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db.insert(cities).values(data).returning();

      return row;
    }, CITY_CONSTRAINT_MESSAGES);
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<INewCityRow>,
  ): Promise<ICityRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(cities)
        .set(data)
        .where(and(eq(cities.id, id), eq(cities.companyId, companyId)))
        .returning();

      return row;
    }, CITY_CONSTRAINT_MESSAGES);
  }

  // "Delete" is a status flip — the row is kept for audit and referential integrity
  async setStatus(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<ICityRow | undefined> {
    return this.update(companyId, id, { status });
  }

  private buildFilters(options: IFindCitiesOptions): SQL | undefined {
    const conditions: SQL[] = [eq(cities.companyId, options.companyId)];

    if (options.status !== undefined) {
      conditions.push(eq(cities.status, options.status));
    }

    const search = buildSearchCondition(options.search, [cities.name]);

    if (search) {
      conditions.push(search);
    }

    return and(...conditions);
  }
}
