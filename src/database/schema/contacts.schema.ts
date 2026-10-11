import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { companies } from './companies.schema.js';

// People a dealer works with — property owners and seekers. They never sign in.
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 255 }),
    cnic: varchar('cnic', { length: 15 }),
    address: varchar('address', { length: 500 }),
    notes: text('notes'),
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
    // A phone number identifies one person within a dealership
    uniqueIndex('contacts_company_phone_unique_idx').on(
      table.companyId,
      table.phone,
    ),
    index('contacts_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
