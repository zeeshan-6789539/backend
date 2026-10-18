import { sql } from 'drizzle-orm';
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

export const propertyTypes = pgTable(
  'property_types',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    // Every company owns its own types, starting from a copy of the defaults
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
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
    // Case-insensitive, so "Flat" and "flat" cannot both exist for one dealer
    uniqueIndex('property_types_company_name_unique_idx').on(
      table.companyId,
      sql`lower(${table.name})`,
    ),
    // Target of the tenant-safe composite foreign keys
    unique('property_types_company_id_id_unique').on(table.companyId, table.id),
    index('property_types_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
