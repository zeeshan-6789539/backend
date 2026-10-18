import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { companies } from './companies.schema.js';
import { properties } from './properties.schema.js';

export const propertyTypes = pgTable(
  'property_types',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    // true is active, false is deactivated — inactive types drop out of the property form only
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
    index('property_types_is_active_idx').on(table.isActive),
    index('property_types_created_at_idx').on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('property_types_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    // Lets properties composite-FK pin its type to this same company
    unique('property_types_id_company_id_key').on(table.id, table.companyId),
    // "Shop" and "shop" are the same type within one company
    uniqueIndex('property_types_company_id_name_key').on(
      table.companyId,
      sql`lower(${table.name})`,
    ),
  ],
);

export const propertyTypesRelations = relations(
  propertyTypes,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [propertyTypes.companyId],
      references: [companies.id],
    }),
    properties: many(properties),
  }),
);
