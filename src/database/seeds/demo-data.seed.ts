import type { Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ChargeType } from '../../common/enums/charge-type.enum.js';
import { DefaultPropertyType } from '../../common/enums/default-property-type.enum.js';
import { LeaseStatus } from '../../common/enums/lease-status.enum.js';
import { PaymentMethod } from '../../common/enums/payment-method.enum.js';
import { TransactionType } from '../../common/enums/transaction-type.enum.js';
import { hashSecret } from '../../common/utils/hash.util.js';
import { formatSequenceCode } from '../../common/utils/string.util.js';
import { PROPERTY_NUMBER_PREFIX } from '../../modules/properties/properties.constants.js';
import type { IDrizzleDb } from '../interfaces/i-drizzle-db.js';
import {
  charges,
  companies,
  leaseRentSchedules,
  leases,
  payments,
  properties,
  propertyTypes,
  tenants,
  users,
} from '../schema/index.js';
import {
  COMPANY_SEED_PLANS,
  DEMO_PASSWORD,
  OTHER_CHARGE_REASONS,
  PK_BANKS,
  PK_MOBILE_PREFIXES,
  PK_WALLETS,
} from './data/pakistan-demo-data.js';
import type { ICompanySeedPlan } from './interfaces/i-company-seed-plan.js';
import type { IPropertySeedPlan } from './interfaces/i-property-seed-plan.js';

const MONTHS_OF_HISTORY = 12;
// Fixed so re-seeding a fresh database always reproduces the same story
const RNG_SEED = 20260918;
// Every seeded property bills rent on the 5th
const SEED_RENT_DUE_DAY = 5;

type ChargeInsert = typeof charges.$inferInsert;
type PaymentInsert = typeof payments.$inferInsert;
type SeedTx = Parameters<Parameters<IDrizzleDb['transaction']>[0]>[0];
type PaymentProfile = 'normal' | 'problem';

const createRng = (seed: number): (() => number) => {
  let state = seed;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randInt = (rng: () => number, min: number, max: number): number =>
  Math.floor(rng() * (max - min + 1)) + min;

const pick = <T>(rng: () => number, items: readonly T[]): T => {
  const item = items[Math.floor(rng() * items.length)];

  if (item === undefined) {
    throw new Error('pick() called with an empty list');
  }

  return item;
};

const chance = (rng: () => number, probability: number): boolean => rng() < probability;

const money = (amount: number): string => amount.toFixed(2);

// All UTC — the process and the DB session are both pinned to UTC
const startOfMonthUtc = (year: number, monthIndex0: number): Date =>
  new Date(Date.UTC(year, monthIndex0, 1));

const addMonthsUtc = (date: Date, months: number): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));

const lastDayOfMonthUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));

const addDaysUtc = (date: Date, days: number): Date => new Date(date.getTime() + days * 86_400_000);

const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

const monthLabel = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const slugifyName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .join('.');

const pkPhone = (rng: () => number): string =>
  `${pick(rng, PK_MOBILE_PREFIXES)}${String(randInt(rng, 1000000, 9999999))}`;

function pickPaymentMethod(rng: () => number): PaymentMethod {
  const roll = rng();

  if (roll < 0.3) return PaymentMethod.CASH;
  if (roll < 0.65) return PaymentMethod.BANK_TRANSFER;
  if (roll < 0.85) return PaymentMethod.ONLINE;

  return PaymentMethod.CHEQUE;
}

interface IBuildPaymentRowParams {
  companyId: string;
  propertyId: string;
  tenantId: string;
  leaseId: string;
  amount: number;
  paymentDate: Date;
  createdBy: string;
  rng: () => number;
  method: PaymentMethod;
  receiptPrefix: string;
  receiptSeq: number;
  note: string;
}

function buildPaymentRow(params: IBuildPaymentRowParams): PaymentInsert {
  const { companyId, propertyId, tenantId, leaseId, amount, paymentDate, createdBy, rng, method, receiptPrefix, receiptSeq, note } = params;
  const receiptNumber = `RCPT-${receiptPrefix}-${String(receiptSeq).padStart(5, '0')}`;

  let bankName: string | undefined;
  let referenceNumber: string | undefined;
  let chequeClearanceDate: string | undefined;

  if (method === PaymentMethod.BANK_TRANSFER) {
    bankName = pick(rng, PK_BANKS);
    referenceNumber = `TXN-${randInt(rng, 100000, 999999)}`;
  } else if (method === PaymentMethod.CHEQUE) {
    bankName = pick(rng, PK_BANKS);
    referenceNumber = `CHQ-${randInt(rng, 10000, 99999)}`;
    chequeClearanceDate = toDateString(addDaysUtc(paymentDate, randInt(rng, 2, 5)));
  } else if (method === PaymentMethod.ONLINE) {
    bankName = pick(rng, PK_WALLETS);
    referenceNumber = `${bankName.toUpperCase()}-${randInt(rng, 1000000, 9999999)}`;
  }

  return {
    companyId,
    propertyId,
    tenantId,
    leaseId,
    amountPaid: money(amount),
    paymentDate: toDateString(paymentDate),
    paymentMethod: method,
    receiptNumber,
    referenceNumber,
    bankName,
    chequeClearanceDate,
    notes: note,
    createdBy,
    createdAt: paymentDate,
  };
}

interface IApplyPaymentParams {
  rng: () => number;
  now: Date;
  dueDate: Date;
  amount: number;
  isRecent: boolean;
  profile: PaymentProfile;
  companyId: string;
  propertyId: string;
  tenantId: string;
  leaseId: string;
  createdBy: string;
  receiptPrefix: string;
  nextReceiptSeq: () => number;
  paymentRows: PaymentInsert[];
  label: string;
}

function pushSinglePayment(params: IApplyPaymentParams, paymentDate: Date, amount: number, note: string): void {
  if (paymentDate > params.now || amount <= 0) {
    return;
  }

  const method = pickPaymentMethod(params.rng);

  params.paymentRows.push(
    buildPaymentRow({
      companyId: params.companyId,
      propertyId: params.propertyId,
      tenantId: params.tenantId,
      leaseId: params.leaseId,
      amount,
      paymentDate,
      createdBy: params.createdBy,
      rng: params.rng,
      method,
      receiptPrefix: params.receiptPrefix,
      receiptSeq: params.nextReceiptSeq(),
      note,
    }),
  );
}

// Decides whether a charge is paid on time, late, partially, or not at all yet —
// "problem" tenants skew heavily towards partial/unpaid so the outstanding
// balance feature has real data to show.
function applyPaymentOutcome(params: IApplyPaymentParams): void {
  const { rng, dueDate, amount, isRecent, profile, label } = params;
  const roll = rng();
  const thresholds = profile === 'problem' ? { onTime: 0.15, late: 0.4, partial: 0.65 } : { onTime: 0.55, late: 0.75, partial: 0.9 };

  if (roll < thresholds.onTime) {
    pushSinglePayment(params, addDaysUtc(dueDate, randInt(rng, 0, 4)), amount, `${label} — paid on time`);
    return;
  }

  if (roll < thresholds.late) {
    pushSinglePayment(params, addDaysUtc(dueDate, randInt(rng, 10, 25)), amount, `${label} — paid late`);
    return;
  }

  if (roll < thresholds.partial) {
    const firstShare = Math.round(amount * (randInt(rng, 40, 70) / 100));

    pushSinglePayment(params, addDaysUtc(dueDate, randInt(rng, 0, 5)), firstShare, `${label} — partial payment, remainder pending`);
    pushSinglePayment(params, addDaysUtc(dueDate, randInt(rng, 12, 22)), amount - firstShare, `${label} — remainder settled`);
    return;
  }

  if (!isRecent && profile === 'normal') {
    // A normal tenant can't stay unpaid this long — falls back to a very late payment instead
    pushSinglePayment(params, addDaysUtc(dueDate, randInt(rng, 26, 40)), amount, `${label} — paid very late`);
  }
  // else: left unpaid — a "problem" tenant stays unpaid regardless of month, a normal
  // tenant only for a recent month, which is what keeps the outstanding balance real
}

function applyUtilityPayment(params: IApplyPaymentParams): void {
  const { rng, dueDate, amount, isRecent, label } = params;

  if (chance(rng, 0.8)) {
    pushSinglePayment(params, addDaysUtc(dueDate, randInt(rng, 0, 10)), amount, `${label} — paid`);
    return;
  }

  if (!isRecent) {
    pushSinglePayment(params, addDaysUtc(dueDate, randInt(rng, 15, 30)), amount, `${label} — paid late`);
  }
  // else: left unpaid
}

interface ISeedMonthParams {
  rng: () => number;
  now: Date;
  monthStart: Date;
  isRecent: boolean;
  companyId: string;
  propertyId: string;
  tenantId: string;
  leaseId: string;
  rentAmount: number;
  isProblemTenant: boolean;
  createdBy: () => string;
  receiptPrefix: string;
  nextReceiptSeq: () => number;
  chargeRows: ChargeInsert[];
  paymentRows: PaymentInsert[];
}

function seedMonthForLease(params: ISeedMonthParams): void {
  const { rng, now, monthStart, isRecent, companyId, propertyId, tenantId, leaseId, rentAmount, isProblemTenant, createdBy, receiptPrefix, nextReceiptSeq, chargeRows, paymentRows } = params;
  const label = monthLabel(monthStart);
  const rentDueDate = addDaysUtc(monthStart, SEED_RENT_DUE_DAY - 1);

  chargeRows.push({
    companyId,
    propertyId,
    tenantId,
    leaseId,
    chargeType: ChargeType.MONTHLY_RENT,
    transactionType: TransactionType.DEBIT,
    amount: money(rentAmount),
    billingMonth: toDateString(monthStart),
    dueDate: toDateString(rentDueDate),
    description: `Monthly rent for ${label}`,
    createdBy: createdBy(),
    createdAt: monthStart,
  });

  const sharedPaymentParams = {
    rng,
    now,
    isRecent,
    companyId,
    propertyId,
    tenantId,
    leaseId,
    receiptPrefix,
    nextReceiptSeq,
    paymentRows,
  };

  applyPaymentOutcome({
    ...sharedPaymentParams,
    dueDate: rentDueDate,
    amount: rentAmount,
    profile: isProblemTenant ? 'problem' : 'normal',
    createdBy: createdBy(),
    label: `Rent for ${label}`,
  });

  const utilityDueDate = addDaysUtc(monthStart, 9);
  const utilityCreatedAt = addDaysUtc(monthStart, 2);

  if (chance(rng, 0.7)) {
    const amount = randInt(rng, 4000, 22000);

    chargeRows.push({
      companyId,
      propertyId,
      tenantId,
      leaseId,
      chargeType: ChargeType.ELECTRICITY_BILL,
      transactionType: TransactionType.DEBIT,
      amount: money(amount),
      dueDate: toDateString(utilityDueDate),
      description: `Electricity bill for ${label}`,
      createdBy: createdBy(),
      createdAt: utilityCreatedAt,
    });

    applyUtilityPayment({ ...sharedPaymentParams, dueDate: utilityDueDate, amount, profile: 'normal', createdBy: createdBy(), label: `Electricity bill for ${label}` });
  }

  if (chance(rng, 0.25)) {
    const amount = randInt(rng, 500, 2500);

    chargeRows.push({
      companyId,
      propertyId,
      tenantId,
      leaseId,
      chargeType: ChargeType.WATER_BILL,
      transactionType: TransactionType.DEBIT,
      amount: money(amount),
      dueDate: toDateString(utilityDueDate),
      description: `Water tanker charges for ${label}`,
      createdBy: createdBy(),
      createdAt: utilityCreatedAt,
    });

    applyUtilityPayment({ ...sharedPaymentParams, dueDate: utilityDueDate, amount, profile: 'normal', createdBy: createdBy(), label: `Water charges for ${label}` });
  }

  if (chance(rng, 0.4)) {
    const amount = randInt(rng, 2000, 9000);

    chargeRows.push({
      companyId,
      propertyId,
      tenantId,
      leaseId,
      chargeType: ChargeType.MAINTENANCE_CHARGE,
      transactionType: TransactionType.DEBIT,
      amount: money(amount),
      dueDate: toDateString(utilityDueDate),
      description: `Maintenance charges for ${label}`,
      createdBy: createdBy(),
      createdAt: utilityCreatedAt,
    });

    applyUtilityPayment({ ...sharedPaymentParams, dueDate: utilityDueDate, amount, profile: 'normal', createdBy: createdBy(), label: `Maintenance charges for ${label}` });
  }

  if (chance(rng, 0.08)) {
    const amount = randInt(rng, 1000, 5000);
    const reason = pick(rng, OTHER_CHARGE_REASONS);

    chargeRows.push({
      companyId,
      propertyId,
      tenantId,
      leaseId,
      chargeType: ChargeType.OTHER_CHARGE,
      transactionType: TransactionType.DEBIT,
      amount: money(amount),
      dueDate: toDateString(utilityDueDate),
      description: `${reason} — ${label}`,
      createdBy: createdBy(),
      createdAt: utilityCreatedAt,
    });

    applyUtilityPayment({ ...sharedPaymentParams, dueDate: utilityDueDate, amount, profile: 'normal', createdBy: createdBy(), label: reason });
  }
}

interface ILeaseSegmentPlan {
  startIdx: number;
  endIdx: number;
  tenantName: string;
  rent: number;
  status: LeaseStatus;
  forfeitAdvance: boolean;
}

function buildSegments(propertyPlan: IPropertySeedPlan, lastIndex: number): ILeaseSegmentPlan[] {
  if (!propertyPlan.turnover) {
    return [{ startIdx: 0, endIdx: lastIndex, tenantName: propertyPlan.tenantName, rent: propertyPlan.monthlyRent, status: LeaseStatus.ACTIVE, forfeitAdvance: false }];
  }

  const { turnover } = propertyPlan;

  return [
    {
      startIdx: 0,
      endIdx: turnover.atIndex,
      tenantName: propertyPlan.tenantName,
      rent: propertyPlan.monthlyRent,
      status: turnover.endStatus === 'expired' ? LeaseStatus.EXPIRED : LeaseStatus.TERMINATED,
      forfeitAdvance: turnover.forfeitAdvance ?? false,
    },
    {
      startIdx: turnover.atIndex + 1,
      endIdx: lastIndex,
      tenantName: propertyPlan.secondTenantName ?? propertyPlan.tenantName,
      rent: propertyPlan.secondSegmentRent ?? propertyPlan.monthlyRent,
      status: LeaseStatus.ACTIVE,
      forfeitAdvance: false,
    },
  ];
}

interface ISeedLeasesParams {
  tx: SeedTx;
  rng: () => number;
  now: Date;
  billingMonths: Date[];
  companyId: string;
  propertyId: string;
  userIds: string[];
  tenantIdByName: Map<string, string>;
  propertyPlan: IPropertySeedPlan;
  receiptPrefix: string;
  receiptSeq: number;
  chargeRows: ChargeInsert[];
  paymentRows: PaymentInsert[];
}

async function seedPropertyLeases(params: ISeedLeasesParams): Promise<number> {
  const { tx, rng, now, billingMonths, companyId, propertyId, userIds, tenantIdByName, propertyPlan, receiptPrefix, chargeRows, paymentRows } = params;
  const lastIndex = billingMonths.length - 1;
  const segments = buildSegments(propertyPlan, lastIndex);
  const createdBy = (): string => pick(rng, userIds);
  let receiptSeq = params.receiptSeq;

  for (const segment of segments) {
    const tenantId = tenantIdByName.get(segment.tenantName);

    if (!tenantId) {
      throw new Error(`Tenant "${segment.tenantName}" was not seeded before its lease`);
    }

    const startDate = billingMonths[segment.startIdx];
    const isFinalSegment = segment.endIdx === lastIndex;
    const endDate = isFinalSegment ? addMonthsUtc(startDate, 12) : lastDayOfMonthUtc(billingMonths[segment.endIdx]);
    const advanceAmount = segment.rent * propertyPlan.advanceMultiplier;
    // Deterministic, not rng-drawn, so adding it leaves every other seeded value unchanged
    const hasDocument = segment.status === LeaseStatus.ACTIVE && !propertyPlan.problemTenant;
    const documentUrl = hasDocument
      ? `https://drive.google.com/file/d/demo-${slugifyName(propertyPlan.name)}-${toDateString(startDate)}/view`
      : null;

    const [lease] = await tx
      .insert(leases)
      .values({
        companyId,
        propertyId,
        tenantId,
        status: segment.status,
        startDate: toDateString(startDate),
        endDate: toDateString(endDate),
        advanceAmount: money(advanceAmount),
        documentUrl,
      })
      .returning({ id: leases.id });

    if (!lease) {
      throw new Error(`Failed to create lease for "${propertyPlan.name}"`);
    }

    const appliesRentChange = isFinalSegment && segments.length === 1 && propertyPlan.rentChange !== undefined;

    if (appliesRentChange && propertyPlan.rentChange) {
      const { rentChange } = propertyPlan;
      const changeDate = billingMonths[rentChange.atIndex];

      await tx.insert(leaseRentSchedules).values({
        companyId,
        leaseId: lease.id,
        rentAmount: money(segment.rent),
        effectiveFrom: toDateString(startDate),
        effectiveTo: toDateString(changeDate),
        isCurrent: false,
      });
      await tx.insert(leaseRentSchedules).values({
        companyId,
        leaseId: lease.id,
        rentAmount: money(rentChange.newRent),
        effectiveFrom: toDateString(changeDate),
        isCurrent: true,
      });

      chargeRows.push({
        companyId,
        propertyId,
        tenantId,
        leaseId: lease.id,
        chargeType: ChargeType.RENT_CHANGE,
        transactionType: TransactionType.DEBIT,
        amount: '0.00',
        dueDate: toDateString(changeDate),
        description: `Rent changed from ${money(segment.rent)} to ${money(rentChange.newRent)}, effective ${toDateString(changeDate)}`,
        createdBy: createdBy(),
        createdAt: changeDate,
      });
    } else {
      await tx.insert(leaseRentSchedules).values({
        companyId,
        leaseId: lease.id,
        rentAmount: money(segment.rent),
        effectiveFrom: toDateString(startDate),
        isCurrent: true,
      });
    }

    // Security deposit: billed and paid in full on the day the tenancy starts
    chargeRows.push({
      companyId,
      propertyId,
      tenantId,
      leaseId: lease.id,
      chargeType: ChargeType.ADVANCE_PAYMENT,
      transactionType: TransactionType.DEBIT,
      amount: money(advanceAmount),
      dueDate: toDateString(startDate),
      description: `Security deposit / advance for the lease starting ${toDateString(startDate)}`,
      createdBy: createdBy(),
      createdAt: startDate,
    });

    if (startDate <= now) {
      const paymentDate = addDaysUtc(startDate, randInt(rng, 0, 2));

      if (paymentDate <= now) {
        const method = pickPaymentMethod(rng);

        paymentRows.push(
          buildPaymentRow({
            companyId,
            propertyId,
            tenantId,
            leaseId: lease.id,
            amount: advanceAmount,
            paymentDate,
            createdBy: createdBy(),
            rng,
            method,
            receiptPrefix,
            receiptSeq: receiptSeq++,
            note: 'Advance/security deposit received in full',
          }),
        );
      }
    }

    // Forfeited deposit on early move-out — the advance was already paid in full above and
    // is simply kept instead of refunded, so this is a zero-amount audit entry (same pattern
    // as the rent_change entry) rather than a new debit; the tenant doesn't owe it twice.
    if (segment.forfeitAdvance) {
      const forfeitDate = lastDayOfMonthUtc(billingMonths[segment.endIdx]);

      chargeRows.push({
        companyId,
        propertyId,
        tenantId,
        leaseId: lease.id,
        chargeType: ChargeType.ADVANCE_REFUND,
        transactionType: TransactionType.DEBIT,
        amount: '0.00',
        dueDate: toDateString(forfeitDate),
        description: `Advance deposit of ${money(advanceAmount)} forfeited against damages found at the move-out inspection — retained in full, not refunded`,
        createdBy: createdBy(),
        createdAt: forfeitDate,
      });
    }

    // One-off goodwill discount — only meaningful on a single continuous lease
    if (propertyPlan.discount && segments.length === 1) {
      const { discount } = propertyPlan;
      const discountDate = billingMonths[discount.atIndex];

      chargeRows.push({
        companyId,
        propertyId,
        tenantId,
        leaseId: lease.id,
        chargeType: ChargeType.DISCOUNT_ADJUSTMENT,
        transactionType: TransactionType.CREDIT,
        amount: money(discount.amount),
        dueDate: toDateString(discountDate),
        description: discount.reason,
        createdBy: createdBy(),
        createdAt: discountDate,
      });
    }

    for (let idx = segment.startIdx; idx <= segment.endIdx; idx += 1) {
      const monthStart = billingMonths[idx];
      const rentAmount =
        appliesRentChange && propertyPlan.rentChange && idx >= propertyPlan.rentChange.atIndex ? propertyPlan.rentChange.newRent : segment.rent;

      seedMonthForLease({
        rng,
        now,
        monthStart,
        isRecent: idx >= lastIndex - 1,
        companyId,
        propertyId,
        tenantId,
        leaseId: lease.id,
        rentAmount,
        isProblemTenant: propertyPlan.problemTenant ?? false,
        createdBy,
        receiptPrefix,
        nextReceiptSeq: () => receiptSeq++,
        chargeRows,
        paymentRows,
      });
    }
  }

  return receiptSeq;
}

async function seedCompany(tx: SeedTx, rng: () => number, now: Date, billingMonths: Date[], plan: ICompanySeedPlan, credentials: string[]): Promise<void> {
  const [company] = await tx
    .insert(companies)
    .values({
      name: plan.name,
      email: plan.email,
      phone: plan.phone,
      address: plan.address,
      city: plan.city,
      isActive: true,
      voiceAssistantEnabled: true,
      // Seeded properties take 1..n below, so the app continues from n + 1
      nextPropertyNumber: plan.properties.length + 1,
    })
    .returning();

  if (!company) {
    throw new Error(`Failed to create company "${plan.name}"`);
  }

  const emailDomain = plan.email.split('@')[1];
  const userIds: string[] = [];

  for (const userPlan of plan.users) {
    const username = `${slugifyName(userPlan.firstName)}.${slugifyName(userPlan.lastName)}`;
    const [user] = await tx
      .insert(users)
      .values({
        companyId: company.id,
        email: `${username}@${emailDomain}`,
        passwordHash: await hashSecret(DEMO_PASSWORD),
        name: `${userPlan.firstName} ${userPlan.lastName}`,
        phone: pkPhone(rng),
        role: userPlan.role,
        isActive: true,
      })
      .returning({ id: users.id });

    if (user) {
      userIds.push(user.id);
    }

    credentials.push(`${username} / ${DEMO_PASSWORD} — ${userPlan.role} at ${plan.name}`);
  }

  const tenantIdByName = new Map<string, string>();
  const tenantNames = [
    ...plan.properties.flatMap((property) => [property.tenantName, property.secondTenantName].filter((name): name is string => Boolean(name))),
    ...plan.spareTenantNames,
  ];

  for (const name of tenantNames) {
    const [tenant] = await tx
      .insert(tenants)
      .values({
        companyId: company.id,
        name,
        email: `${slugifyName(name)}@gmail.com`,
        phone: pkPhone(rng),
        isActive: true,
      })
      .returning({ id: tenants.id });

    if (tenant) {
      tenantIdByName.set(name, tenant.id);
    }
  }

  const seededTypes = await tx
    .insert(propertyTypes)
    .values(Object.values(DefaultPropertyType).map((name) => ({ companyId: company.id, name })))
    .returning({ id: propertyTypes.id, name: propertyTypes.name });
  const propertyTypeIdByName = new Map(seededTypes.map((type) => [type.name, type.id]));

  const chargeRows: ChargeInsert[] = [];
  const paymentRows: PaymentInsert[] = [];
  let receiptSeq = 1;

  for (const [index, propertyPlan] of plan.properties.entries()) {
    const propertyTypeId = propertyTypeIdByName.get(propertyPlan.propertyType);

    if (!propertyTypeId) {
      throw new Error(`Property type "${propertyPlan.propertyType}" was not seeded for "${plan.name}"`);
    }

    const [property] = await tx
      .insert(properties)
      .values({
        companyId: company.id,
        propertyNumber: formatSequenceCode(PROPERTY_NUMBER_PREFIX, index + 1),
        name: propertyPlan.name,
        addressLine1: propertyPlan.addressLine1,
        city: propertyPlan.city,
        propertyTypeId,
        rentDueDay: SEED_RENT_DUE_DAY,
        isActive: true,
      })
      .returning({ id: properties.id });

    if (!property) {
      throw new Error(`Failed to create property "${propertyPlan.name}"`);
    }

    receiptSeq = await seedPropertyLeases({
      tx,
      rng,
      now,
      billingMonths,
      companyId: company.id,
      propertyId: property.id,
      userIds,
      tenantIdByName,
      propertyPlan,
      receiptPrefix: plan.receiptPrefix,
      receiptSeq,
      chargeRows,
      paymentRows,
    });
  }

  if (chargeRows.length > 0) {
    await tx.insert(charges).values(chargeRows);
  }

  if (paymentRows.length > 0) {
    await tx.insert(payments).values(paymentRows);
  }
}

// Idempotent per company: re-running only fills in companies that don't exist yet
export const seedDemoData = async (db: IDrizzleDb, logger: Logger): Promise<void> => {
  const now = new Date();
  const currentMonthStart = startOfMonthUtc(now.getUTCFullYear(), now.getUTCMonth());
  const billingMonths = Array.from({ length: MONTHS_OF_HISTORY }, (_, i) => addMonthsUtc(currentMonthStart, i - (MONTHS_OF_HISTORY - 1)));
  const rng = createRng(RNG_SEED);
  const credentials: string[] = [];

  for (const plan of COMPANY_SEED_PLANS) {
    const [existing] = await db.select({ id: companies.id }).from(companies).where(eq(companies.name, plan.name)).limit(1);

    if (existing) {
      logger.log(`Company "${plan.name}" already exists — skipping`);
      continue;
    }

    await db.transaction((tx) => seedCompany(tx, rng, now, billingMonths, plan, credentials));
    logger.log(`Seeded company "${plan.name}" with a year of leases, charges and payments`);
  }

  if (credentials.length > 0) {
    logger.log('Demo login credentials:');

    for (const line of credentials) {
      logger.log(`  ${line}`);
    }
  }
};
