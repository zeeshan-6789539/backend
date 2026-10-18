import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaseStatus } from '../../common/enums/lease-status.enum.js';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { PropertiesService } from '../properties/properties.service.js';
import { TenantsService } from '../tenants/tenants.service.js';
import type { CreateLeaseDto } from './dto/create-lease.dto.js';
import type { LeaseResponseDto } from './dto/lease-response.dto.js';
import type { QueryLeasesDto } from './dto/query-leases.dto.js';
import type { UpdateLeaseDto } from './dto/update-lease.dto.js';
import type { UpdateLeaseRentDto } from './dto/update-lease-rent.dto.js';
import type { UpdateLeaseStatusDto } from './dto/update-lease-status.dto.js';
import type { ILeaseListRow } from './interfaces/i-lease-list-row.js';
import { toLeaseResponse } from './mappers/lease.mapper.js';
import { LeasesRepository } from './leases.repository.js';

@Injectable()
export class LeasesService {
  constructor(
    private readonly leasesRepository: LeasesRepository,
    private readonly propertiesService: PropertiesService,
    private readonly tenantsService: TenantsService,
  ) {}

  async create(companyId: string, dto: CreateLeaseDto): Promise<LeaseResponseDto> {
    const property = await this.propertiesService.findRowOrFail(companyId, dto.propertyId);
    const tenant = await this.tenantsService.findRowOrFail(companyId, dto.tenantId);

    if (!property.isActive) {
      throw new BadRequestException(`Property "${property.name}" is deactivated and cannot take on a new lease`);
    }

    if (!tenant.isActive) {
      throw new BadRequestException(`Tenant "${tenant.name}" is deactivated and cannot take on a new lease`);
    }

    await this.assertNoActiveLease(companyId, dto.propertyId);

    const lease = await this.leasesRepository.createWithRentSchedule({
      companyId,
      propertyId: dto.propertyId,
      tenantId: dto.tenantId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      advanceAmount: dto.advanceAmount ?? '0.00',
      documentUrl: dto.documentUrl ?? null,
      monthlyRent: dto.monthlyRent,
    });

    return this.findOne(companyId, lease.id);
  }

  async findAll(
    companyId: string,
    query: QueryLeasesDto,
  ): Promise<IPaginatedResult<LeaseResponseDto>> {
    const { items, totalItems } = await this.leasesRepository.findMany({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      propertyId: query.propertyId,
      tenantId: query.tenantId,
      status: query.status,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toLeaseResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<LeaseResponseDto> {
    return toLeaseResponse(await this.findRowOrFail(companyId, id));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateLeaseDto,
  ): Promise<LeaseResponseDto> {
    await this.findRowOrFail(companyId, id);

    // Drizzle skips undefined keys, so unset DTO fields leave the column alone
    const row = await this.leasesRepository.update(id, companyId, {
      startDate: dto.startDate,
      endDate: dto.endDate,
      advanceAmount: dto.advanceAmount,
      documentUrl: dto.documentUrl,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No lease was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return this.findOne(companyId, row.id);
  }

  async updateStatus(
    companyId: string,
    id: string,
    dto: UpdateLeaseStatusDto,
  ): Promise<LeaseResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (dto.status === LeaseStatus.ACTIVE) {
      await this.assertNoActiveLease(companyId, current.propertyId, id);
    }

    const row = await this.leasesRepository.updateStatus(id, companyId, dto.status);

    if (!row) {
      throw new NotFoundException(`No lease was found with id ${id}`);
    }

    return this.findOne(companyId, row.id);
  }

  // Closes the current rent schedule and opens a new one, logging a zero-amount
  // "rent_change" entry on the ledger so the change stays visible on the lease's statement
  async updateRent(
    companyId: string,
    id: string,
    userId: string,
    dto: UpdateLeaseRentDto,
  ): Promise<LeaseResponseDto> {
    const current = await this.findRowOrFail(companyId, id);
    const currentSchedule = await this.leasesRepository.findCurrentRentSchedule(id);

    if (currentSchedule && dto.effectiveFrom <= currentSchedule.effectiveFrom) {
      throw new BadRequestException(
        "Effective date must be after the current rent schedule's start date",
      );
    }

    const description = currentSchedule
      ? `Rent changed from ${Number(currentSchedule.rentAmount)} to ${Number(dto.rentAmount)}, effective ${dto.effectiveFrom}`
      : `Rent set to ${Number(dto.rentAmount)}, effective ${dto.effectiveFrom}`;

    await this.leasesRepository.updateRentWithChargeEntry({
      companyId,
      leaseId: id,
      propertyId: current.propertyId,
      tenantId: current.tenantId,
      currentScheduleId: currentSchedule?.id,
      rentAmount: dto.rentAmount,
      effectiveFrom: dto.effectiveFrom,
      notes: dto.notes,
      description,
      createdBy: userId,
    });

    return this.findOne(companyId, id);
  }

  async findRowOrFail(companyId: string, id: string): Promise<ILeaseListRow> {
    const row = await this.leasesRepository.findById(id, companyId);

    if (!row) {
      throw new NotFoundException(`No lease was found with id ${id}`);
    }

    return row;
  }

  private async assertNoActiveLease(
    companyId: string,
    propertyId: string,
    excludeLeaseId?: string,
  ): Promise<void> {
    const activeLeaseId = await this.leasesRepository.findActiveLeaseIdByProperty(
      companyId,
      propertyId,
    );

    if (activeLeaseId && activeLeaseId !== excludeLeaseId) {
      throw new ConflictException('This property already has an active lease');
    }
  }
}
