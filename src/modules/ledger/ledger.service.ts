import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChargeType } from '../../common/enums/charge-type.enum.js';
import { TransactionType } from '../../common/enums/transaction-type.enum.js';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { runInBackground } from '../../common/utils/background.util.js';
import { withDayOfMonth } from '../../common/utils/date.util.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import type { IChargeRow } from '../../database/interfaces/i-charge-row.js';
import { LeasesService } from '../leases/leases.service.js';
import { MailService } from '../mail/mail.service.js';
import type { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto.js';
import type { GenerateMonthlyRentResponseDto } from './dto/generate-monthly-rent-response.dto.js';
import type { LedgerEntryResponseDto } from './dto/ledger-entry-response.dto.js';
import type { QueryLedgerDto } from './dto/query-ledger.dto.js';
import type { IDueLease } from './interfaces/i-due-lease.js';
import type { ISkippedLease } from './interfaces/i-skipped-lease.js';
import { LedgerRepository } from './ledger.repository.js';
import { toLedgerEntryResponse } from './mappers/ledger-entry.mapper.js';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private readonly ledgerRepository: LedgerRepository,
    private readonly leasesService: LeasesService,
    private readonly mailService: MailService,
  ) {}

  async findAll(
    companyId: string,
    query: QueryLedgerDto,
  ): Promise<IPaginatedResult<LedgerEntryResponseDto>> {
    const { items, totalItems } = await this.ledgerRepository.findStatement({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      leaseId: query.leaseId,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toLedgerEntryResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<LedgerEntryResponseDto> {
    const leaseId =
      (await this.ledgerRepository.findChargeLeaseId(id, companyId)) ??
      (await this.ledgerRepository.findPaymentLeaseId(id, companyId));

    if (!leaseId) {
      throw new NotFoundException(`No ledger entry was found with id ${id}`);
    }

    const entry = await this.ledgerRepository.findStatementEntry(companyId, leaseId, id);

    if (!entry) {
      throw new NotFoundException(`No ledger entry was found with id ${id}`);
    }

    return toLedgerEntryResponse(entry);
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateLedgerEntryDto,
  ): Promise<LedgerEntryResponseDto> {
    const lease = await this.leasesService.findRowOrFail(companyId, dto.leaseId);

    const transactionType =
      dto.entryType === ChargeType.DISCOUNT_ADJUSTMENT
        ? TransactionType.CREDIT
        : TransactionType.DEBIT;

    const inserted = await this.ledgerRepository.createCharge({
      companyId,
      propertyId: lease.propertyId,
      tenantId: lease.tenantId,
      leaseId: lease.id,
      chargeType: dto.entryType,
      transactionType,
      amount: dto.amount,
      dueDate: dto.dueDate,
      description: dto.description,
      createdBy: userId,
    });

    return this.findOne(companyId, inserted.id);
  }

  // Deactivating a charge (bill) keeps the row visible in the ledger but excludes it
  // from running-balance calculations; status goes false, the row is kept
  async removeCharge(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<LedgerEntryResponseDto> {
    const current = await this.findChargeRowOrFail(companyId, id);

    if (!current.isActive) {
      throw new ConflictException(`Charge ${current.id} is already deactivated`);
    }

    const row = await this.ledgerRepository.setChargeStatus(id, companyId, false, userId);

    if (!row) {
      throw new NotFoundException(`No charge was found with id ${id}`);
    }

    return this.findOne(companyId, row.id);
  }

  async restoreCharge(
    companyId: string,
    userId: string,
    id: string,
  ): Promise<LedgerEntryResponseDto> {
    const current = await this.findChargeRowOrFail(companyId, id);

    if (current.isActive) {
      throw new ConflictException(`Charge ${current.id} is already active`);
    }

    const row = await this.ledgerRepository.setChargeStatus(id, companyId, true, userId);

    if (!row) {
      throw new NotFoundException(`No charge was found with id ${id}`);
    }

    return this.findOne(companyId, row.id);
  }

  // Platform-wide: super_admin only, covers every company's active leases in one run
  async generateMonthlyRent(userId: string): Promise<GenerateMonthlyRentResponseDto> {
    const billingMonth = this.currentBillingMonth();
    const monthLabel = this.billingMonthLabel(billingMonth);

    const activeLeases = await this.ledgerRepository.findActiveLeasesForBilling();
    const alreadyGeneratedLeaseIds = await this.ledgerRepository.findGeneratedLeaseIds(billingMonth);

    const skipped: ISkippedLease[] = [];
    const dueLeases: IDueLease[] = [];

    for (const lease of activeLeases) {
      if (lease.rentAmount === null) {
        skipped.push({
          leaseId: lease.leaseId,
          propertyName: lease.propertyName,
          tenantName: lease.tenantName,
          reason: 'no_rent_schedule',
        });
      } else if (alreadyGeneratedLeaseIds.has(lease.leaseId)) {
        skipped.push({
          leaseId: lease.leaseId,
          propertyName: lease.propertyName,
          tenantName: lease.tenantName,
          reason: 'already_generated',
        });
      } else {
        dueLeases.push({ ...lease, rentAmount: lease.rentAmount });
      }
    }

    const namesByLeaseId = new Map(dueLeases.map((lease) => [lease.leaseId, lease]));

    const insertedRows = await this.ledgerRepository.insertMonthlyRentCharges(
      dueLeases.map((lease) => ({
        companyId: lease.companyId,
        propertyId: lease.propertyId,
        tenantId: lease.tenantId,
        leaseId: lease.leaseId,
        chargeType: ChargeType.MONTHLY_RENT,
        transactionType: TransactionType.DEBIT,
        amount: lease.rentAmount,
        billingMonth,
        dueDate: withDayOfMonth(billingMonth, lease.rentDueDay),
        description: `Monthly rent for ${monthLabel}`,
        createdBy: userId,
      })),
    );

    // Not awaited: emails go out after the response; runInBackground keeps Vercel alive until they finish
    runInBackground(
      this.sendRentInvoiceEmails(insertedRows, namesByLeaseId, monthLabel).catch((error: Error) =>
        this.logger.error(`Rent invoice email batch failed: ${error.message}`),
      ),
    );

    // runningBalance is left null here (an N+1 recompute per lease isn't worth it for a bulk job)
    const generated: LedgerEntryResponseDto[] = insertedRows.map((row) => {
      const lease = namesByLeaseId.get(row.leaseId);

      return toLedgerEntryResponse({
        id: row.id,
        companyId: row.companyId,
        propertyId: row.propertyId,
        tenantId: row.tenantId,
        leaseId: row.leaseId,
        propertyName: lease?.propertyName ?? '',
        tenantName: lease?.tenantName ?? '',
        paymentId: null,
        entryType: row.chargeType,
        transactionType: row.transactionType,
        amount: row.amount,
        runningBalance: null,
        billingMonth: row.billingMonth,
        dueDate: row.dueDate,
        description: row.description,
        status: row.isActive,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
      });
    });

    return { billingMonth, generated, skipped };
  }

  // Best-effort notification: a mail failure must never affect the billing run itself
  private async sendRentInvoiceEmails(
    insertedRows: IChargeRow[],
    namesByLeaseId: Map<string, IDueLease>,
    monthLabel: string,
  ): Promise<void> {
    // Each company opts in via companies.invoice_mail_send, set by the super admin
    const invoices = insertedRows.flatMap((row) => {
      const lease = namesByLeaseId.get(row.leaseId);

      return lease?.invoiceMailSend && lease.tenantEmail
        ? [{ row, lease, tenantEmail: lease.tenantEmail }]
        : [];
    });

    // One credentials lookup per company, not per tenant
    const companyIds = [...new Set(invoices.map(({ row }) => row.companyId))];
    const sendersByCompanyId = new Map(
      await Promise.all(
        companyIds.map(async (companyId) => [companyId, await this.mailService.resolveSender(companyId)] as const),
      ),
    );

    await Promise.all(
      invoices.map(({ row, lease, tenantEmail }) =>
        this.mailService.sendMonthlyRentInvoiceEmail(
          sendersByCompanyId.get(row.companyId) ?? null,
          tenantEmail,
          lease.tenantName,
          lease.propertyName,
          lease.propertyNumber,
          row.amount,
          monthLabel,
          row.description ?? `Monthly rent for ${monthLabel}`,
          row.dueDate ?? row.billingMonth ?? this.currentBillingMonth(),
        ),
      ),
    );
  }

  private currentBillingMonth(): string {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private billingMonthLabel(billingMonth: string): string {
    return new Date(`${billingMonth}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  private async findChargeRowOrFail(companyId: string, id: string): Promise<IChargeRow> {
    const row = await this.ledgerRepository.findChargeById(id, companyId);

    if (!row) {
      throw new NotFoundException(`No charge was found with id ${id}`);
    }

    return row;
  }
}
