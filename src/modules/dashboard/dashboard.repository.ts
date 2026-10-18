import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { DashboardTrendRange } from '../../common/enums/dashboard-trend-range.enum.js';
import { LeaseStatus } from '../../common/enums/lease-status.enum.js';
import { OUTSTANDING_BALANCE_SQL } from '../../common/utils/outstanding-balance.util.js';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import { leases, payments, properties, tenants } from '../../database/schema/index.js';
import {
  DASHBOARD_OUTSTANDING_LEASES_LIMIT,
  DASHBOARD_RECENT_PAYMENTS_LIMIT,
  DASHBOARD_TREND_RANGE_MONTHS,
} from './dashboard.constants.js';
import type { IRawDashboardStats } from './interfaces/i-raw-dashboard-stats.js';

const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async getStats(companyId: string, trendRange: DashboardTrendRange): Promise<IRawDashboardStats> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const trendMonths = DASHBOARD_TREND_RANGE_MONTHS[trendRange];
    // 'all' has no lower bound — trendMonths is undefined so the trend query is unfiltered by date
    const trendStart = trendMonths
      ? new Date(now.getFullYear(), now.getMonth() - (trendMonths - 1), 1)
      : undefined;

    const [
      tenantsTotalRows,
      activeTenantsTotalRows,
      propertiesTotalRows,
      activeLeasesTotalRows,
      propertyStatusBreakdown,
      thisMonthRows,
      lastMonthRows,
      paymentsTrendRows,
      recentPayments,
      outstandingLeases,
    ] = await Promise.all([
      this.db.select({ total: count() }).from(tenants).where(eq(tenants.companyId, companyId)),
      this.db
        .select({ total: count() })
        .from(tenants)
        .where(and(eq(tenants.companyId, companyId), eq(tenants.isActive, true))),
      this.db.select({ total: count() }).from(properties).where(eq(properties.companyId, companyId)),
      this.db
        .select({ total: count() })
        .from(leases)
        .where(and(eq(leases.companyId, companyId), eq(leases.status, LeaseStatus.ACTIVE))),
      this.db
        .select({ status: properties.isActive, count: count() })
        .from(properties)
        .where(eq(properties.companyId, companyId))
        .groupBy(properties.isActive),
      this.db
        .select({ count: count(), total: sql<string>`coalesce(sum(${payments.amountPaid}), 0)` })
        .from(payments)
        .where(and(eq(payments.companyId, companyId), gte(payments.paymentDate, toDateString(monthStart)))),
      this.db
        .select({ total: sql<string>`coalesce(sum(${payments.amountPaid}), 0)` })
        .from(payments)
        .where(
          and(
            eq(payments.companyId, companyId),
            gte(payments.paymentDate, toDateString(lastMonthStart)),
            lt(payments.paymentDate, toDateString(monthStart)),
          ),
        ),
      this.db
        .select({
          month: sql<string>`to_char(${payments.paymentDate}, 'YYYY-MM')`,
          total: sql<string>`coalesce(sum(${payments.amountPaid}), 0)`,
        })
        .from(payments)
        .where(
          trendStart
            ? and(eq(payments.companyId, companyId), gte(payments.paymentDate, toDateString(trendStart)))
            : eq(payments.companyId, companyId),
        )
        .groupBy(sql`to_char(${payments.paymentDate}, 'YYYY-MM')`),
      this.db
        .select({
          id: payments.id,
          amountPaid: payments.amountPaid,
          paymentDate: payments.paymentDate,
          paymentMethod: payments.paymentMethod,
          tenantName: tenants.name,
          propertyName: properties.name,
          status: payments.isActive,
        })
        .from(payments)
        .innerJoin(tenants, eq(payments.tenantId, tenants.id))
        .innerJoin(properties, eq(payments.propertyId, properties.id))
        .where(eq(payments.companyId, companyId))
        .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
        .limit(DASHBOARD_RECENT_PAYMENTS_LIMIT),
      this.db
        .select({
          id: leases.id,
          propertyName: properties.name,
          tenantName: tenants.name,
          status: leases.status,
          outstandingBalance: OUTSTANDING_BALANCE_SQL,
        })
        .from(leases)
        .innerJoin(properties, eq(leases.propertyId, properties.id))
        .innerJoin(tenants, eq(leases.tenantId, tenants.id))
        .where(and(eq(leases.companyId, companyId), sql`${OUTSTANDING_BALANCE_SQL} > 0`))
        .orderBy(sql`${OUTSTANDING_BALANCE_SQL} desc`)
        .limit(DASHBOARD_OUTSTANDING_LEASES_LIMIT),
    ]);

    return {
      tenantsTotal: tenantsTotalRows[0]?.total ?? 0,
      activeTenantsTotal: activeTenantsTotalRows[0]?.total ?? 0,
      propertiesTotal: propertiesTotalRows[0]?.total ?? 0,
      activeLeasesTotal: activeLeasesTotalRows[0]?.total ?? 0,
      paymentsThisMonthCount: thisMonthRows[0]?.count ?? 0,
      paymentsThisMonthTotal: thisMonthRows[0]?.total ?? '0.00',
      paymentsLastMonthTotal: lastMonthRows[0]?.total ?? '0.00',
      propertyStatusBreakdown,
      paymentsTrendRows,
      recentPayments,
      outstandingLeases,
    };
  }
}
