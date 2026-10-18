import { relations, sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { LeaseStatus } from '../../common/enums/lease-status.enum.js';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { charges } from './charges.schema.js';
import { companies } from './companies.schema.js';
import { leaseRentSchedules } from './lease-rent-schedules.schema.js';
import { payments } from './payments.schema.js';
import { properties } from './properties.schema.js';
import { tenants } from './tenants.schema.js';

export const leaseStatusEnum = pgEnum(
  'lease_status',
  Object.values(LeaseStatus) as [LeaseStatus, ...LeaseStatus[]],
);

export const leases = pgTable(
  'leases',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    propertyId: uuid('property_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    status: leaseStatusEnum('status').notNull().default(LeaseStatus.ACTIVE),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    advanceAmount: numeric('advance_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0.00'),
    documentUrl: text('document_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('leases_property_id_idx').on(table.propertyId),
    index('leases_tenant_id_idx').on(table.tenantId),
    index('leases_company_created_at_idx').on(
      table.companyId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    // Lets lease_rent_schedules composite-FK pin a row to this same company
    unique('leases_id_company_id_key').on(table.id, table.companyId),
    // Lets charges/payments composite-FK pin a row to this lease's own property, tenant and company
    unique('leases_id_property_tenant_company_key').on(
      table.id,
      table.propertyId,
      table.tenantId,
      table.companyId,
    ),
    check('leases_end_after_start_check', sql`${table.endDate} >= ${table.startDate}`),
    check('leases_advance_amount_non_negative_check', sql`${table.advanceAmount} >= 0`),
    // At most one active lease per property, enforced at the DB level to close the check-then-act race
    uniqueIndex('leases_one_active_per_property_idx')
      .on(table.propertyId)
      .where(sql`${table.status} = 'active'`),
    // Composite FKs pin property_id/tenant_id to the same company_id as this lease, closing the cross-tenant gap
    foreignKey({
      columns: [table.propertyId, table.companyId],
      foreignColumns: [properties.id, properties.companyId],
      name: 'leases_property_company_fk',
    }),
    foreignKey({
      columns: [table.tenantId, table.companyId],
      foreignColumns: [tenants.id, tenants.companyId],
      name: 'leases_tenant_company_fk',
    }),
  ],
);

export const leasesRelations = relations(leases, ({ one, many }) => ({
  company: one(companies, {
    fields: [leases.companyId],
    references: [companies.id],
  }),
  property: one(properties, {
    fields: [leases.propertyId],
    references: [properties.id],
  }),
  tenant: one(tenants, {
    fields: [leases.tenantId],
    references: [tenants.id],
  }),
  rentSchedules: many(leaseRentSchedules),
  charges: many(charges),
  payments: many(payments),
}));
