import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { cities } from './cities.schema.js';
import { companies } from './companies.schema.js';

// Localities inside a city, e.g. "Ward no 1" in Zafarwal
export const areas = pgTable(
  'areas',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
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
    // The same area name may exist in two cities, but only once per city
    uniqueIndex('areas_city_name_unique_idx').on(
      table.cityId,
      sql`lower(${table.name})`,
    ),
    index('areas_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('areas_city_created_at_idx').on(
      table.cityId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
