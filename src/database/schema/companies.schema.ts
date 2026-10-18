import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { users } from './users.schema.js';

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
    address: varchar('address', { length: 500 }),
    city: varchar('city', { length: 100 }),
    // true is active, false is deactivated — mirrors users.is_active
    isActive: boolean('is_active').notNull().default(true),
    // Gates the Gemini voice assistant for this company's client admins
    voiceAssistantEnabled: boolean('voice_assistant_enabled')
      .notNull()
      .default(false),
    // Opt-in per company: the monthly rent run emails invoices only when this is true
    invoiceMailSend: boolean('invoice_mail_send').notNull().default(false),
    // AES-256-GCM ciphertext of the SMTP password for `email`; never returned by the API
    mailPassword: text('mail_password'),
    // Next sequence value handed out as this company's property number (P-0001, P-0002, …)
    nextPropertyNumber: integer('next_property_number').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('companies_name_idx').on(table.name),
    index('companies_is_active_idx').on(table.isActive),
    index('companies_created_at_idx').on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
}));
