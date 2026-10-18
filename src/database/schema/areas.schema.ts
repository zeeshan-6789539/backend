import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  pgTable,
  timestamp,
  unique,
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
    cityId: uuid('city_id').notNull(),
    name: varchar('name', { length: 150 }).notNull(),
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
    // The city must belong to the same company as the area
    foreignKey({
      name: 'areas_company_city_fk',
      columns: [table.companyId, table.cityId],
      foreignColumns: [cities.companyId, cities.id],
    }).onDelete('restrict'),
    // Target of properties' (city_id, area_id) key, so an area is always in its listing's city
    unique('areas_city_id_id_unique').on(table.cityId, table.id),
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
