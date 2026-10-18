import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, getTableColumns, sql, type SQL } from 'drizzle-orm';
import { LeaseStatus } from '../../common/enums/lease-status.enum.js';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import type { IAssignedEntity } from '../../common/interfaces/i-assigned-entity.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { formatSequenceCode } from '../../common/utils/string.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type {
  INewPropertyRow,
  IPropertyRow,
} from '../../database/interfaces/i-property-row.js';
import { companies, leases, properties, tenants } from '../../database/schema/index.js';
import {
  PROPERTY_CONSTRAINT_MESSAGES,
  PROPERTY_NUMBER_PREFIX,
} from './properties.constants.js';
import type { IFindPropertiesOptions } from './interfaces/i-find-properties-options.js';
import type { IPropertyListResult } from './interfaces/i-property-list-result.js';

const SEARCHABLE_COLUMNS = [properties.propertyNumber, properties.name, properties.city];

// The tenant(s) with an active lease on this property — every column below is hand-qualified
// because leases and tenants both have id/status, and sql`` interpolation renders columns bare
const ASSIGNED_TENANTS_SQL = sql<IAssignedEntity[]>`COALESCE((
  SELECT json_agg(json_build_object('id', "tenants"."id", 'name', "tenants"."name") ORDER BY "tenants"."name")
  FROM ${leases}
  INNER JOIN ${tenants} ON "tenants"."id" = "leases"."tenant_id"
  WHERE "leases"."property_id" = "properties"."id" AND "leases"."status" = ${LeaseStatus.ACTIVE}
), '[]'::json)`;

@Injectable()
export class PropertiesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findById(
    id: string,
    companyId: string,
  ): Promise<IPropertyRow | undefined> {
    const [row] = await this.db
      .select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.companyId, companyId)))
      .limit(1);

    return row;
  }

  async findMany(options: IFindPropertiesOptions): Promise<IPropertyListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    const [items, [total]] = await Promise.all([
      this.db
        .select({ ...getTableColumns(properties), tenants: ASSIGNED_TENANTS_SQL })
        .from(properties)
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(direction(properties.createdAt), direction(properties.id))
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db.select({ value: count() }).from(properties).where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  // The counter UPDATE row-locks the company, so concurrent creates queue up and each gets its own number
  async create(data: Omit<INewPropertyRow, 'propertyNumber'>): Promise<IPropertyRow> {
    return withDatabaseErrors(async () => {
      return this.db.transaction(async (tx) => {
        const [counter] = await tx
          .update(companies)
          .set({ nextPropertyNumber: sql`${companies.nextPropertyNumber} + 1` })
          .where(eq(companies.id, data.companyId))
          .returning({ issued: sql<number>`${companies.nextPropertyNumber} - 1` });

        if (!counter) {
          throw new NotFoundException(`No company was found with id ${data.companyId}`);
        }

        const [row] = await tx
          .insert(properties)
          .values({
            ...data,
            propertyNumber: formatSequenceCode(PROPERTY_NUMBER_PREFIX, counter.issued),
          })
          .returning();

        if (!row) {
          throw new Error('Failed to create property');
        }

        return row;
      });
    }, PROPERTY_CONSTRAINT_MESSAGES);
  }

  async update(
    id: string,
    companyId: string,
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
    id: string,
    companyId: string,
    status: boolean,
  ): Promise<IPropertyRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(properties)
        .set({ isActive: status })
        .where(and(eq(properties.id, id), eq(properties.companyId, companyId)))
        .returning();

      return row;
    }, PROPERTY_CONSTRAINT_MESSAGES);
  }

  private buildFilters(options: IFindPropertiesOptions): SQL | undefined {
    const conditions: SQL[] = [eq(properties.companyId, options.companyId)];

    if (options.city) {
      conditions.push(eq(properties.city, options.city));
    }

    if (options.propertyType) {
      conditions.push(eq(properties.propertyType, options.propertyType));
    }

    if (options.status !== undefined) {
      conditions.push(eq(properties.isActive, options.status));
    }

    const search = buildSearchCondition(options.search, SEARCHABLE_COLUMNS);

    if (search) {
      conditions.push(search);
    }

    return and(...conditions);
  }
}
