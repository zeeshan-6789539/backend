import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { LeasesService } from '../leases/leases.service.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';
import type { PaymentResponseDto } from './dto/payment-response.dto.js';
import type { QueryPaymentsDto } from './dto/query-payments.dto.js';
import type { IPaymentListRow } from './interfaces/i-payment-list-row.js';
import { toPaymentResponse } from './mappers/payment.mapper.js';
import { PaymentsRepository } from './payments.repository.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly leasesService: LeasesService,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const lease = await this.leasesService.findRowOrFail(companyId, dto.leaseId);

    const row = await this.paymentsRepository.create({
      companyId,
      propertyId: lease.propertyId,
      tenantId: lease.tenantId,
      leaseId: lease.id,
      amountPaid: dto.amountPaid,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
      receiptNumber: dto.receiptNumber,
      referenceNumber: dto.referenceNumber,
      bankName: dto.bankName,
      chequeClearanceDate: dto.chequeClearanceDate,
      notes: dto.notes,
      createdBy: userId,
    });

    return this.findOne(companyId, row.id);
  }

  async findAll(
    companyId: string,
    query: QueryPaymentsDto,
  ): Promise<IPaginatedResult<PaymentResponseDto>> {
    const { items, totalItems } = await this.paymentsRepository.findMany({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      leaseId: query.leaseId,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toPaymentResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<PaymentResponseDto> {
    return toPaymentResponse(await this.findRowOrFail(companyId, id));
  }

  // Deleting a payment deactivates it: status goes false, the row is kept and stays
  // visible in the ledger, but is excluded from running-balance calculations
  async remove(companyId: string, userId: string, id: string): Promise<PaymentResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (!current.status) {
      throw new ConflictException(`Payment ${current.id} is already deactivated`);
    }

    const row = await this.paymentsRepository.setStatus(id, companyId, false, userId);

    if (!row) {
      throw new NotFoundException(`No payment was found with id ${id}`);
    }

    return this.findOne(companyId, row.id);
  }

  async restore(companyId: string, userId: string, id: string): Promise<PaymentResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (current.status) {
      throw new ConflictException(`Payment ${current.id} is already active`);
    }

    const row = await this.paymentsRepository.setStatus(id, companyId, true, userId);

    if (!row) {
      throw new NotFoundException(`No payment was found with id ${id}`);
    }

    return this.findOne(companyId, row.id);
  }

  private async findRowOrFail(companyId: string, id: string): Promise<IPaymentListRow> {
    const row = await this.paymentsRepository.findById(id, companyId);

    if (!row) {
      throw new NotFoundException(`No payment was found with id ${id}`);
    }

    return row;
  }
}
