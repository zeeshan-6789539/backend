import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
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
  INewPropertyTypeRow,
  IPropertyTypeRow,
} from '../../database/interfaces/i-property-type-row.js';
import { propertyTypes } from '../../database/schema/index.js';
import type { IFindPropertyTypesOptions } from './interfaces/i-find-property-types-options.js';
import type { IPropertyTypeListResult } from './interfaces/i-property-type-list-result.js';
import { PROPERTY_TYPE_CONSTRAINT_MESSAGES } from './property-types.constants.js';

const SEARCHABLE_COLUMNS = [propertyTypes.name];

// A dealer sees the built-in types plus its own
const visibleTo = (companyId: string): SQL | undefined =>
  or(eq(propertyTypes.companyId, companyId), isNull(propertyTypes.companyId));

@Injectable()
export class PropertyTypesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findVisibleById(
    companyId: string,
    id: string,
  ): Promise<IPropertyTypeRow | undefined> {
    const [row] = await this.db
      .select()
      .from(propertyTypes)
      .where(and(eq(propertyTypes.id, id), visibleTo(companyId)))
      .limit(1);

    return row;
  }

  // Case-insensitive, so "shop" clashes with the built-in "Shop"
  async findVisibleByName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<IPropertyTypeRow | undefined> {
    const [row] = await this.db
      .select()
      .from(propertyTypes)
      .where(
        and(
          sql`lower(${propertyTypes.name}) = ${name.toLowerCase()}`,
          visibleTo(companyId),
          excludeId ? ne(propertyTypes.id, excludeId) : undefined,
        ),
      )
      .limit(1);

    return row;
  }

  async findBuiltInByName(name: string): Promise<IPropertyTypeRow | undefined> {
    const [row] = await this.db
      .select()
      .from(propertyTypes)
      .where(
        and(
          sql`lower(${propertyTypes.name}) = ${name.toLowerCase()}`,
          isNull(propertyTypes.companyId),
        ),
      )
      .limit(1);

    return row;
  }

  async findMany(
    options: IFindPropertyTypesOptions,
  ): Promise<IPropertyTypeListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.db
        .select()
        .from(propertyTypes)
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(propertyTypes.createdAt), direction(propertyTypes.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db.select({ value: count() }).from(propertyTypes).where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async create(data: INewPropertyTypeRow): Promise<IPropertyTypeRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db.insert(propertyTypes).values(data).returning();

      return row;
    }, PROPERTY_TYPE_CONSTRAINT_MESSAGES);
  }

  // Scoped to the company, so built-in rows can never be changed through here
  async update(
    companyId: string,
    id: string,
    data: Partial<INewPropertyTypeRow>,
  ): Promise<IPropertyTypeRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(propertyTypes)
        .set(data)
        .where(
          and(eq(propertyTypes.id, id), eq(propertyTypes.companyId, companyId)),
        )
        .returning();

      return row;
    }, PROPERTY_TYPE_CONSTRAINT_MESSAGES);
  }

  async setStatus(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<IPropertyTypeRow | undefined> {
    return this.update(companyId, id, { status });
  }

  private buildFilters(options: IFindPropertyTypesOptions): SQL | undefined {
    const conditions: SQL[] = [];
    const visible = visibleTo(options.companyId);

    if (visible) {
      conditions.push(visible);
    }

    if (options.status !== undefined) {
      conditions.push(eq(propertyTypes.status, options.status));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
