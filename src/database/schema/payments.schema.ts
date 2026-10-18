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
  uuid,
} from 'drizzle-orm/pg-core';
import { PaymentMethod } from '../../common/enums/payment-method.enum.js';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { companies } from './companies.schema.js';
import { leases } from './leases.schema.js';
import { properties } from './properties.schema.js';
import { tenants } from './tenants.schema.js';
import { users } from './users.schema.js';

export const paymentMethodEnum = pgEnum(
  'payment_method',
  Object.values(PaymentMethod) as [PaymentMethod, ...PaymentMethod[]],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    propertyId: uuid('property_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    leaseId: uuid('lease_id').notNull(),
    amountPaid: numeric('amount_paid', { precision: 14, scale: 2 }).notNull(),
    paymentDate: date('payment_date').notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    receiptNumber: text('receipt_number'),
    referenceNumber: text('reference_number'),
    bankName: text('bank_name'),
    chequeClearanceDate: date('cheque_clearance_date'),
    notes: text('notes'),
    // Single lifecycle flag: true is active, false is deactivated. A deactivated
    // payment stays visible in the ledger but is excluded from running-balance calculations.
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id),
    // Who deactivated the payment and when; cleared again on restore
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
    index('payments_lease_balance_idx').on(
      table.leaseId,
      table.isActive,
      table.amountPaid,
    ),
    // Serves the list, the dashboard's recent payments and its monthly totals
    index('payments_company_payment_date_idx').on(
      table.companyId,
      table.paymentDate.desc(),
      table.id.desc(),
    ),
    check('payments_amount_paid_positive_check', sql`${table.amountPaid} > 0`),
    // Composite FKs pin property_id/tenant_id/lease_id to the same company_id as this payment
    foreignKey({
      columns: [table.propertyId, table.companyId],
      foreignColumns: [properties.id, properties.companyId],
      name: 'payments_property_company_fk',
    }),
    foreignKey({
      columns: [table.tenantId, table.companyId],
      foreignColumns: [tenants.id, tenants.companyId],
      name: 'payments_tenant_company_fk',
    }),
    // Also pins property_id/tenant_id to the lease's own property and tenant
    foreignKey({
      columns: [table.leaseId, table.propertyId, table.tenantId, table.companyId],
      foreignColumns: [leases.id, leases.propertyId, leases.tenantId, leases.companyId],
      name: 'payments_lease_fk',
    }),
  ],
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  company: one(companies, {
    fields: [payments.companyId],
    references: [companies.id],
  }),
  property: one(properties, {
    fields: [payments.propertyId],
    references: [properties.id],
  }),
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  lease: one(leases, {
    fields: [payments.leaseId],
    references: [leases.id],
  }),
  creator: one(users, {
    fields: [payments.createdBy],
    references: [users.id],
  }),
}));
