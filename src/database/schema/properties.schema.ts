import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  smallint,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  DEFAULT_RENT_DUE_DAY,
  MAX_RENT_DUE_DAY,
  MIN_RENT_DUE_DAY,
} from '../../common/constants/rent-due-day.constants.js';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { companies } from './companies.schema.js';
import { leases } from './leases.schema.js';
import { propertyTypes } from './property-types.schema.js';

export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    // Human-readable id (P-0001), issued from companies.next_property_number and never changed
    propertyNumber: varchar('property_number', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    addressLine1: varchar('address_line1', { length: 500 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    propertyTypeId: uuid('property_type_id').notNull(),
    // Day of the month the generated monthly rent invoice falls due
    rentDueDay: smallint('rent_due_day').notNull().default(DEFAULT_RENT_DUE_DAY),
    // true is active, false is deactivated — mirrors companies.is_active
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
    index('properties_property_type_id_idx').on(table.propertyTypeId),
    index('properties_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    // Lets leases/charges/payments composite-FK pin a row to this same company
    unique('properties_id_company_id_key').on(table.id, table.companyId),
    unique('properties_company_id_property_number_key').on(
      table.companyId,
      table.propertyNumber,
    ),
    check(
      'properties_rent_due_day_range_check',
      sql`${table.rentDueDay} between ${sql.raw(String(MIN_RENT_DUE_DAY))} and ${sql.raw(String(MAX_RENT_DUE_DAY))}`,
    ),
    // Composite FK pins property_type_id to a type owned by this same company
    foreignKey({
      columns: [table.propertyTypeId, table.companyId],
      foreignColumns: [propertyTypes.id, propertyTypes.companyId],
      name: 'properties_property_type_company_fk',
    }),
  ],
);

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  company: one(companies, {
    fields: [properties.companyId],
    references: [companies.id],
  }),
  propertyType: one(propertyTypes, {
    fields: [properties.propertyTypeId],
    references: [propertyTypes.id],
  }),
  leases: many(leases),
}));
