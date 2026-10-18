import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
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
    propertyTypeId: uuid('property_type_id').notNull(),
    ownerContactId: uuid('owner_contact_id'),
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
    cityId: uuid('city_id').notNull(),
    // Optional, but when set it must be an area of cityId (composite key below)
    areaId: uuid('area_id'),
    address: varchar('address', { length: 500 }),
    // Deal lifecycle; isActive below is the active/deactivated flag
    propertyStatus: propertyStatusEnum('property_status')
      .notNull()
      .default(PropertyStatus.AVAILABLE),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Composite keys stop a listing from pointing at another company's rows
    foreignKey({
      name: 'properties_company_property_type_fk',
      columns: [table.companyId, table.propertyTypeId],
      foreignColumns: [propertyTypes.companyId, propertyTypes.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'properties_company_owner_contact_fk',
      columns: [table.companyId, table.ownerContactId],
      foreignColumns: [contacts.companyId, contacts.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'properties_company_city_fk',
      columns: [table.companyId, table.cityId],
      foreignColumns: [cities.companyId, cities.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'properties_city_area_fk',
      columns: [table.cityId, table.areaId],
      foreignColumns: [areas.cityId, areas.id],
    }).onDelete('restrict'),
    // Target of property_requirements' tenant-safe matched property key
    unique('properties_company_id_id_unique').on(table.companyId, table.id),
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
      'properties_deposit_non_negative',
      sql`${table.securityDeposit} IS NULL OR ${table.securityDeposit} >= 0`,
    ),
    check(
      'properties_area_sqft_positive',
      sql`${table.areaSqft} IS NULL OR ${table.areaSqft} > 0`,
    ),
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
