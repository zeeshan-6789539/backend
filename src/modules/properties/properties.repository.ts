import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  lte,
  type SQL,
} from 'drizzle-orm';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { buildIdNameList } from '../../common/utils/id-name-list.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type {
  INewPropertyRow,
  IPropertyRow,
} from '../../database/interfaces/i-property-row.js';
import {
  areas,
  cities,
  contacts,
  facilities,
  properties,
  propertyTypes,
} from '../../database/schema/index.js';
import type { IFindPropertiesOptions } from './interfaces/i-find-properties-options.js';
import type { IPropertyDetailRow } from './interfaces/i-property-detail-row.js';
import type { IPropertyListResult } from './interfaces/i-property-list-result.js';
import { PROPERTY_CONSTRAINT_MESSAGES } from './properties.constants.js';

const SEARCHABLE_COLUMNS = [
  properties.title,
  cities.name,
  areas.name,
  properties.address,
];

const DETAIL_COLUMNS = {
  ...getTableColumns(properties),
  facilityList: buildIdNameList(
    properties.facilities,
    facilities,
    facilities.id,
    facilities.name,
  ),
  propertyTypeName: propertyTypes.name,
  cityName: cities.name,
  areaName: areas.name,
  ownerName: contacts.name,
  ownerPhone: contacts.phone,
};

@Injectable()
export class PropertiesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findById(
    companyId: string,
    id: string,
  ): Promise<IPropertyRow | undefined> {
    const [row] = await this.db
      .select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.companyId, companyId)))
      .limit(1);

    return row;
  }

  async findDetailById(
    companyId: string,
    id: string,
  ): Promise<IPropertyDetailRow | undefined> {
    const [row] = await this.selectDetails()
      .where(and(eq(properties.id, id), eq(properties.companyId, companyId)))
      .limit(1);

    return row;
  }

  async findMany(options: IFindPropertiesOptions): Promise<IPropertyListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.selectDetails()
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(properties.createdAt), direction(properties.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      // Joined like the page query, because search matches city and area names
      this.db
        .select({ value: count() })
        .from(properties)
        .innerJoin(cities, eq(properties.cityId, cities.id))
        .leftJoin(areas, eq(properties.areaId, areas.id))
        .where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async create(data: INewPropertyRow): Promise<IPropertyRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db.insert(properties).values(data).returning();

      return row;
    }, PROPERTY_CONSTRAINT_MESSAGES);
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<INewPropertyRow>,
  ): Promise<IPropertyRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(properties)
        .set(data)
        .where(and(eq(properties.id, id), eq(properties.companyId, companyId)))
        .returning();

      return row;
    }, PROPERTY_CONSTRAINT_MESSAGES);
  }

  // "Delete" is a status flip — the row is kept for audit and referential integrity
  async setStatus(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<IPropertyRow | undefined> {
    return this.update(companyId, id, { isActive: status });
  }

  private selectDetails() {
    return this.db
      .select(DETAIL_COLUMNS)
      .from(properties)
      .innerJoin(propertyTypes, eq(properties.propertyTypeId, propertyTypes.id))
      .leftJoin(contacts, eq(properties.ownerContactId, contacts.id))
      .innerJoin(cities, eq(properties.cityId, cities.id))
      .leftJoin(areas, eq(properties.areaId, areas.id))
      .$dynamic();
  }

  private buildFilters(options: IFindPropertiesOptions): SQL | undefined {
    const conditions: (SQL | undefined)[] = [
      eq(properties.companyId, options.companyId),
      options.purpose ? eq(properties.purpose, options.purpose) : undefined,
      options.propertyTypeId
        ? eq(properties.propertyTypeId, options.propertyTypeId)
        : undefined,
      options.propertyStatus
        ? eq(properties.propertyStatus, options.propertyStatus)
        : undefined,
      options.ownerContactId
        ? eq(properties.ownerContactId, options.ownerContactId)
        : undefined,
      options.status !== undefined
        ? eq(properties.isActive, options.status)
        : undefined,
      options.minPrice !== undefined
        ? gte(properties.price, options.minPrice)
        : undefined,
      options.maxPrice !== undefined
        ? lte(properties.price, options.maxPrice)
        : undefined,
      options.facilityIds && options.facilityIds.length > 0
        ? arrayContains(properties.facilities, options.facilityIds)
        : undefined,
      options.cityId ? eq(properties.cityId, options.cityId) : undefined,
      options.areaIds && options.areaIds.length > 0
        ? inArray(properties.areaId, options.areaIds)
        : undefined,
      buildSearchCondition(options.search, SEARCHABLE_COLUMNS),
    ];

    return and(...conditions);
  }
}
