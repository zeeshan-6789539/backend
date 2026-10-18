import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  isNull,
  TransactionRollbackError,
  type SQL,
} from 'drizzle-orm';
import { PropertyStatus } from '../../common/enums/property-status.enum.js';
import { RequirementStatus } from '../../common/enums/requirement-status.enum.js';
import { SortOrder } from '../../common/enums/sort-order.enum.js';
import { withDatabaseErrors } from '../../common/utils/database-error.util.js';
import { buildIdNameList } from '../../common/utils/id-name-list.util.js';
import { getOffset } from '../../common/utils/pagination.util.js';
import { buildSearchCondition } from '../../common/utils/query.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type {
  INewPropertyRequirementRow,
  IPropertyRequirementRow,
} from '../../database/interfaces/i-property-requirement-row.js';
import {
  areas,
  cities,
  contacts,
  facilities,
  properties,
  propertyRequirements,
  propertyTypes,
} from '../../database/schema/index.js';
import { PROPERTY_CONSTRAINT_MESSAGES } from '../properties/properties.constants.js';
import type { IFindPropertyRequirementsOptions } from './interfaces/i-find-property-requirements-options.js';
import type { IMatchRequirementArgs } from './interfaces/i-match-requirement-args.js';
import type { IPropertyRequirementDetailRow } from './interfaces/i-property-requirement-detail-row.js';
import type { IPropertyRequirementListResult } from './interfaces/i-property-requirement-list-result.js';
import { PROPERTY_REQUIREMENT_CONSTRAINT_MESSAGES } from './property-requirements.constants.js';

// Seekers are usually looked up by who they are, so contact columns are searchable
const SEARCHABLE_COLUMNS = [
  contacts.name,
  contacts.phone,
  cities.name,
  propertyRequirements.notes,
];

const DETAIL_COLUMNS = {
  ...getTableColumns(propertyRequirements),
  facilityList: buildIdNameList(
    propertyRequirements.facilities,
    facilities,
    facilities.id,
    facilities.name,
  ),
  preferredCityName: cities.name,
  preferredAreaList: buildIdNameList(
    propertyRequirements.preferredAreaIds,
    areas,
    areas.id,
    areas.name,
  ),
  contactName: contacts.name,
  contactPhone: contacts.phone,
  propertyTypeName: propertyTypes.name,
  matchedPropertyTitle: properties.title,
};

@Injectable()
export class PropertyRequirementsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async findById(
    companyId: string,
    id: string,
  ): Promise<IPropertyRequirementRow | undefined> {
    const [row] = await this.db
      .select()
      .from(propertyRequirements)
      .where(this.ownedBy(companyId, id))
      .limit(1);

    return row;
  }

  async findDetailById(
    companyId: string,
    id: string,
  ): Promise<IPropertyRequirementDetailRow | undefined> {
    const [row] = await this.selectDetails()
      .where(this.ownedBy(companyId, id))
      .limit(1);

    return row;
  }

  async findMany(
    options: IFindPropertyRequirementsOptions,
  ): Promise<IPropertyRequirementListResult> {
    const where = this.buildFilters(options);
    const direction = options.sortOrder === SortOrder.ASC ? asc : desc;

    // The count joins contacts and cities too, because search matches their names
    const [items, [total]] = await Promise.all([
      this.selectDetails()
        .where(where)
        // id breaks ties so rows created in the same millisecond stay stable
        .orderBy(
          direction(propertyRequirements.createdAt),
          direction(propertyRequirements.id),
        )
        .limit(options.limit)
        .offset(getOffset(options.page, options.limit)),
      this.db
        .select({ value: count() })
        .from(propertyRequirements)
        .innerJoin(contacts, eq(propertyRequirements.contactId, contacts.id))
        .leftJoin(cities, eq(propertyRequirements.preferredCityId, cities.id))
        .where(where),
    ]);

    return { items, totalItems: total?.value ?? 0 };
  }

  async create(
    data: INewPropertyRequirementRow,
  ): Promise<IPropertyRequirementRow> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .insert(propertyRequirements)
        .values(data)
        .returning();

      return row;
    }, PROPERTY_REQUIREMENT_CONSTRAINT_MESSAGES);
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<INewPropertyRequirementRow>,
  ): Promise<IPropertyRequirementRow | undefined> {
    return withDatabaseErrors(async () => {
      const [row] = await this.db
        .update(propertyRequirements)
        .set(data)
        .where(this.ownedBy(companyId, id))
        .returning();

      return row;
    }, PROPERTY_REQUIREMENT_CONSTRAINT_MESSAGES);
  }

  // "Delete" is a status flip — the row is kept for audit and referential integrity
  async setStatus(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<IPropertyRequirementRow | undefined> {
    return this.update(companyId, id, { isActive: status });
  }

  // Closes the listing and links it in one transaction; false when either row was taken meanwhile
  async matchWithProperty(args: IMatchRequirementArgs): Promise<boolean> {
    return withDatabaseErrors(
      () =>
        this.db.transaction(async (tx) => {
          const now = new Date();

          const [requirement] = await tx
            .update(propertyRequirements)
            .set({
              requirementStatus: RequirementStatus.MATCHED,
              matchedPropertyId: args.propertyId,
              updatedAt: now,
            })
            .where(
              and(
                this.ownedBy(args.companyId, args.requirementId),
                eq(propertyRequirements.isActive, true),
                isNull(propertyRequirements.matchedPropertyId),
              ),
            )
            .returning({ id: propertyRequirements.id });

          if (!requirement) {
            return false;
          }

          const [property] = await tx
            .update(properties)
            .set({ propertyStatus: args.closingStatus, updatedAt: now })
            .where(
              and(
                eq(properties.id, args.propertyId),
                eq(properties.companyId, args.companyId),
                eq(properties.isActive, true),
                eq(properties.propertyStatus, PropertyStatus.AVAILABLE),
              ),
            )
            .returning({ id: properties.id });

          if (!property) {
            // Undo the requirement change; the rollback error is caught below
            tx.rollback();
          }

          return true;
        }),
      { ...PROPERTY_REQUIREMENT_CONSTRAINT_MESSAGES, ...PROPERTY_CONSTRAINT_MESSAGES },
    ).catch((error: unknown) => {
      if (error instanceof TransactionRollbackError) {
        return false;
      }

      throw error;
    });
  }

  private ownedBy(companyId: string, id: string): SQL | undefined {
    return and(
      eq(propertyRequirements.id, id),
      eq(propertyRequirements.companyId, companyId),
    );
  }

  private selectDetails() {
    return this.db
      .select(DETAIL_COLUMNS)
      .from(propertyRequirements)
      .innerJoin(contacts, eq(propertyRequirements.contactId, contacts.id))
      .leftJoin(
        propertyTypes,
        eq(propertyRequirements.propertyTypeId, propertyTypes.id),
      )
      .leftJoin(
        properties,
        eq(propertyRequirements.matchedPropertyId, properties.id),
      )
      .leftJoin(cities, eq(propertyRequirements.preferredCityId, cities.id))
      .$dynamic();
  }

  private buildFilters(
    options: IFindPropertyRequirementsOptions,
  ): SQL | undefined {
    const conditions: (SQL | undefined)[] = [
      eq(propertyRequirements.companyId, options.companyId),
      options.contactId
        ? eq(propertyRequirements.contactId, options.contactId)
        : undefined,
      options.propertyTypeId
        ? eq(propertyRequirements.propertyTypeId, options.propertyTypeId)
        : undefined,
      options.purpose
        ? eq(propertyRequirements.purpose, options.purpose)
        : undefined,
      options.requirementStatus
        ? eq(propertyRequirements.requirementStatus, options.requirementStatus)
        : undefined,
      options.status !== undefined
        ? eq(propertyRequirements.isActive, options.status)
        : undefined,
      buildSearchCondition(options.search, SEARCHABLE_COLUMNS),
    ];

    return and(...conditions);
  }
}
