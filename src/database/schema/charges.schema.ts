import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
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
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    billingMonth: date('billing_month'),
    dueDate: date('due_date'),
    description: text('description'),
    // Single lifecycle flag: true is active, false is deactivated. A deactivated
    // charge stays visible in the ledger but is excluded from running-balance calculations.
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id),
    // Who deactivated the charge and when; cleared again on restore
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    deactivatedBy: uuid('deactivated_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Serves the lease filter and lets the outstanding-balance sum read from the index alone
    index('charges_lease_balance_idx').on(
      table.leaseId,
      table.isActive,
      table.transactionType,
      table.amount,
    ),
    index('charges_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    // At most one *active* monthly_rent charge per lease per billing month, closing the generate-monthly-rent
    // duplicate-click race. billing_month leads so the "already generated this month" lookup can use it too.
    uniqueIndex('charges_one_monthly_rent_per_lease_month_idx')
      .on(table.billingMonth, table.leaseId)
      .where(sql`${table.chargeType} = 'monthly_rent' and ${table.isActive} = true`),
    check('charges_amount_non_negative_check', sql`${table.amount} >= 0`),
    // The unique index above skips NULL billing months, so a monthly rent must always carry one
    check(
      'charges_monthly_rent_has_billing_month_check',
      sql`${table.chargeType} <> 'monthly_rent' or ${table.billingMonth} is not null`,
    ),
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
    // Also pins property_id/tenant_id to the lease's own property and tenant
    foreignKey({
      columns: [table.leaseId, table.propertyId, table.tenantId, table.companyId],
      foreignColumns: [leases.id, leases.propertyId, leases.tenantId, leases.companyId],
      name: 'charges_lease_fk',
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
