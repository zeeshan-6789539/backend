import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { companies } from './companies.schema.js';
import { leases } from './leases.schema.js';

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
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
    index('tenants_name_idx').on(table.name),
    index('tenants_is_active_idx').on(table.isActive),
    index('tenants_created_at_idx').on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('tenants_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    // Lets leases/charges/payments composite-FK pin a row to this same company
    unique('tenants_id_company_id_key').on(table.id, table.companyId),
  ],
);

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  company: one(companies, {
    fields: [tenants.companyId],
    references: [companies.id],
  }),
  leases: many(leases),
}));
