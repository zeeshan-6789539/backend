import { relations } from 'drizzle-orm';
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
  unique,
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
    amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull(),
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
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('payments_lease_id_idx').on(table.leaseId),
    index('payments_is_active_idx').on(table.isActive),
    index('payments_created_at_idx').on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('payments_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    unique('payments_id_company_id_key').on(table.id, table.companyId),
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
    foreignKey({
      columns: [table.leaseId, table.companyId],
      foreignColumns: [leases.id, leases.companyId],
      name: 'payments_lease_company_fk',
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
