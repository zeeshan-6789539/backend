import { isNull } from 'drizzle-orm';
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
import { companies } from './companies.schema.js';

export const facilities = pgTable(
  'facilities',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    // Null marks a built-in facility every dealer sees; set for a dealer's own facilities
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'restrict',
    }),
    name: varchar('name', { length: 100 }).notNull(),
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
    uniqueIndex('facilities_company_name_unique_idx').on(
      table.companyId,
      table.name,
    ),
    // NULLs are distinct in a plain unique index, so built-ins need their own
    uniqueIndex('facilities_built_in_name_unique_idx')
      .on(table.name)
      .where(isNull(table.companyId)),
    index('facilities_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('facilities_created_at_idx').on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
