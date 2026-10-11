import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { RequirementPurpose } from '../../common/enums/requirement-purpose.enum.js';
import { RequirementStatus } from '../../common/enums/requirement-status.enum.js';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { cities } from './cities.schema.js';
import { companies } from './companies.schema.js';
import { contacts } from './contacts.schema.js';
import { properties } from './properties.schema.js';
import { propertyTypes } from './property-types.schema.js';

export const requirementPurposeEnum = pgEnum(
  'requirement_purpose',
  Object.values(RequirementPurpose) as [
    RequirementPurpose,
    ...RequirementPurpose[],
  ],
);

export const requirementStatusEnum = pgEnum(
  'requirement_status',
  Object.values(RequirementStatus) as [
    RequirementStatus,
    ...RequirementStatus[],
  ],
);

// What a walk-in seeker is looking for, e.g. "a shop to rent in Gulberg"
export const propertyRequirements = pgTable(
  'property_requirements',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    // Null means the seeker is open to any type
    propertyTypeId: uuid('property_type_id').references(
      () => propertyTypes.id,
      { onDelete: 'restrict' },
    ),
    purpose: requirementPurposeEnum('purpose').notNull(),
    budgetMin: bigint('budget_min', { mode: 'number' }),
    budgetMax: bigint('budget_max', { mode: 'number' }),
    // Null means any city; areas can only be picked once a city is set
    preferredCityId: uuid('preferred_city_id').references(() => cities.id, {
      onDelete: 'restrict',
    }),
    // Area ids in preferredCityId; a listing in any one of them matches
    preferredAreaIds: uuid('preferred_area_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    // Facility ids every matching listing must have
    facilities: uuid('facilities').array().notNull().default(sql`'{}'::uuid[]`),
    notes: text('notes'),
    requirementStatus: requirementStatusEnum('requirement_status')
      .notNull()
      .default(RequirementStatus.OPEN),
    // The listing the seeker chose from the matches; it is marked sold or rented
    matchedPropertyId: uuid('matched_property_id').references(
      () => properties.id,
      { onDelete: 'restrict' },
    ),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('property_requirements_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('property_requirements_contact_idx').on(table.contactId),
    index('property_requirements_matched_property_idx').on(
      table.matchedPropertyId,
    ),
    index('property_requirements_company_status_idx').on(
      table.companyId,
      table.requirementStatus,
    ),
    check(
      'property_requirements_budget_range',
      sql`${table.budgetMin} IS NULL OR ${table.budgetMax} IS NULL OR ${table.budgetMin} <= ${table.budgetMax}`,
    ),
  ],
);
