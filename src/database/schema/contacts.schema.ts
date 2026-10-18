import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
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
    // Always stored as 11 digits, e.g. 03001234567
    phone: varchar('phone', { length: 11 }).notNull(),
    email: varchar('email', { length: 255 }),
    cnic: varchar('cnic', { length: 15 }),
    address: varchar('address', { length: 500 }),
    notes: text('notes'),
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
    // A phone number identifies one person within a dealership
    uniqueIndex('contacts_company_phone_unique_idx').on(
      table.companyId,
      table.phone,
    ),
    // Target of the tenant-safe composite foreign keys
    unique('contacts_company_id_id_unique').on(table.companyId, table.id),
    index('contacts_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check('contacts_phone_format', sql`${table.phone} ~ '^03[0-9]{9}$'`),
    check(
      'contacts_cnic_format',
      sql`${table.cnic} IS NULL OR ${table.cnic} ~ '^[0-9]{5}-?[0-9]{7}-?[0-9]$'`,
    ),
  ],
);
