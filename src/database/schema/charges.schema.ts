import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { ChargeType } from '../../common/enums/charge-type.enum.js';
import { TransactionType } from '../../common/enums/transaction-type.enum.js';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { companies } from './companies.schema.js';
import { leases } from './leases.schema.js';
import { properties } from './properties.schema.js';
import { tenants } from './tenants.schema.js';
import { users } from './users.schema.js';

export const chargeTypeEnum = pgEnum(
  'charge_type',
  Object.values(ChargeType) as [ChargeType, ...ChargeType[]],
);

export const transactionTypeEnum = pgEnum(
  'transaction_type',
  Object.values(TransactionType) as [TransactionType, ...TransactionType[]],
);

// The company's general ledger: every rent/bill/adjustment charged to a lease
export const charges = pgTable(
  'charges',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    propertyId: uuid('property_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    leaseId: uuid('lease_id').notNull(),
    chargeType: chargeTypeEnum('charge_type').notNull(),
    transactionType: transactionTypeEnum('transaction_type').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    billingMonth: date('billing_month'),
    dueDate: date('due_date'),
    description: text('description'),
    // Single lifecycle flag: true is active, false is deactivated. A deactivated
    // charge stays visible in the ledger but is excluded from running-balance calculations.
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('charges_lease_id_created_at_idx').on(
      table.leaseId,
      table.createdAt,
    ),
    index('charges_is_active_idx').on(table.isActive),
    index('charges_created_at_idx').on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('charges_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    // At most one *active* monthly_rent charge per lease per billing month, closing the generate-monthly-rent
    // duplicate-click race. Scoped to is_active = true so deactivating a charge lets the next run regenerate it.
    uniqueIndex('charges_one_monthly_rent_per_lease_month_idx')
      .on(table.leaseId, table.billingMonth)
      .where(sql`${table.chargeType} = 'monthly_rent' and ${table.isActive} = true`),
    // Composite FKs pin property_id/tenant_id/lease_id to the same company_id as this charge
    foreignKey({
      columns: [table.propertyId, table.companyId],
      foreignColumns: [properties.id, properties.companyId],
      name: 'charges_property_company_fk',
    }),
    foreignKey({
      columns: [table.tenantId, table.companyId],
      foreignColumns: [tenants.id, tenants.companyId],
      name: 'charges_tenant_company_fk',
    }),
    foreignKey({
      columns: [table.leaseId, table.companyId],
      foreignColumns: [leases.id, leases.companyId],
      name: 'charges_lease_company_fk',
    }),
  ],
);

export const chargesRelations = relations(charges, ({ one }) => ({
  company: one(companies, {
    fields: [charges.companyId],
    references: [companies.id],
  }),
  property: one(properties, {
    fields: [charges.propertyId],
    references: [properties.id],
  }),
  tenant: one(tenants, {
    fields: [charges.tenantId],
    references: [tenants.id],
  }),
  lease: one(leases, {
    fields: [charges.leaseId],
    references: [leases.id],
  }),
  creator: one(users, {
    fields: [charges.createdBy],
    references: [users.id],
  }),
}));
