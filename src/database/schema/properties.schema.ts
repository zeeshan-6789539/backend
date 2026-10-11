import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { PropertyPurpose } from '../../common/enums/property-purpose.enum.js';
import { PropertyStatus } from '../../common/enums/property-status.enum.js';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { areas } from './areas.schema.js';
import { cities } from './cities.schema.js';
import { companies } from './companies.schema.js';
import { contacts } from './contacts.schema.js';
import { propertyTypes } from './property-types.schema.js';
import { users } from './users.schema.js';

export const propertyPurposeEnum = pgEnum(
  'property_purpose',
  Object.values(PropertyPurpose) as [PropertyPurpose, ...PropertyPurpose[]],
);

export const propertyStatusEnum = pgEnum(
  'property_status',
  Object.values(PropertyStatus) as [PropertyStatus, ...PropertyStatus[]],
);

export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    propertyTypeId: uuid('property_type_id')
      .notNull()
      .references(() => propertyTypes.id, { onDelete: 'restrict' }),
    ownerContactId: uuid('owner_contact_id').references(() => contacts.id, {
      onDelete: 'restrict',
    }),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    purpose: propertyPurposeEnum('purpose').notNull(),
    // Sale price, or monthly rent when purpose is rent — whole rupees
    price: bigint('price', { mode: 'number' }).notNull(),
    securityDeposit: bigint('security_deposit', { mode: 'number' }),
    areaSqft: integer('area_sqft'),
    // Facility ids, e.g. "2 bedrooms", "Furnished"
    facilities: uuid('facilities').array().notNull().default(sql`'{}'::uuid[]`),
    floor: varchar('floor', { length: 50 }),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    // Optional, but when set it must be an area of cityId (service rule)
    areaId: uuid('area_id').references(() => areas.id, { onDelete: 'restrict' }),
    address: varchar('address', { length: 500 }),
    // Deal lifecycle; `status` below stays the active/deactivated flag
    propertyStatus: propertyStatusEnum('property_status')
      .notNull()
      .default(PropertyStatus.AVAILABLE),
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
    index('properties_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('properties_company_purpose_status_idx').on(
      table.companyId,
      table.purpose,
      table.propertyStatus,
    ),
    index('properties_property_type_idx').on(table.propertyTypeId),
    index('properties_owner_contact_idx').on(table.ownerContactId),
    index('properties_city_area_idx').on(table.cityId, table.areaId),
    index('properties_area_idx').on(table.areaId),
    // GIN so the "has every requested facility" match (@>) can use an index
    index('properties_facilities_idx').using('gin', table.facilities),
    check('properties_price_non_negative', sql`${table.price} >= 0`),
    check(
      'properties_deposit_only_for_rent',
      sql`${table.purpose} = 'rent' OR ${table.securityDeposit} IS NULL`,
    ),
    check(
      'properties_status_matches_purpose',
      sql`NOT (${table.purpose} = 'sale' AND ${table.propertyStatus} = 'rented') AND NOT (${table.purpose} = 'rent' AND ${table.propertyStatus} = 'sold')`,
    ),
  ],
);
