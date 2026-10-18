import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
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
import { PROPERTY_TYPE_CONSTRAINT_MESSAGES } from './property-types.constants.js';
import type { IFindPropertyTypesOptions } from './interfaces/i-find-property-types-options.js';
import type { IPropertyTypeListResult } from './interfaces/i-property-type-list-result.js';

const SEARCHABLE_COLUMNS = [propertyTypes.name];

@Injectable()
export class PropertyTypesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findById(
    id: string,
    companyId: string,
  ): Promise<IPropertyTypeRow | undefined> {
    const [row] = await this.db
      .select()
      .from(propertyTypes)
      .where(
        and(eq(propertyTypes.id, id), eq(propertyTypes.companyId, companyId)),
      )
      .limit(1);

    return row;
  }

  // Case-insensitive, mirroring the property_types_company_id_name_key index
  async findByName(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<IPropertyTypeRow | undefined> {
    const conditions: SQL[] = [
      eq(propertyTypes.companyId, companyId),
      sql`lower(${propertyTypes.name}) = lower(${name})`,
    ];

    if (excludeId) {
      conditions.push(ne(propertyTypes.id, excludeId));
    }

    const [row] = await this.db
      .select()
      .from(propertyTypes)
      .where(and(...conditions))
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
        .orderBy(
          direction(propertyTypes.createdAt),
          direction(propertyTypes.id),
        )
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db.select({ value: count() }).from(propertyTypes).where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async create(data: INewPropertyTypeRow): Promise<IPropertyTypeRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .insert(propertyTypes)
        .values(data)
        .returning();

      if (!row) {
        throw new Error('Failed to create property type');
      }

      return row;
    }, PROPERTY_TYPE_CONSTRAINT_MESSAGES);
  }

  async update(
    id: string,
    companyId: string,
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

  // "Delete" is a status flip — properties already using the type keep it
  async setStatus(
    id: string,
    companyId: string,
    status: boolean,
  ): Promise<IPropertyTypeRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(propertyTypes)
        .set({ isActive: status })
        .where(
          and(eq(propertyTypes.id, id), eq(propertyTypes.companyId, companyId)),
        )
        .returning();

      return row;
    }, PROPERTY_TYPE_CONSTRAINT_MESSAGES);
  }

  private buildFilters(options: IFindPropertyTypesOptions): SQL | undefined {
    const conditions: SQL[] = [eq(propertyTypes.companyId, options.companyId)];

    if (options.status !== undefined) {
      conditions.push(eq(propertyTypes.isActive, options.status));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return and(...conditions);
  }
}
