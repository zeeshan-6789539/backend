import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { normalizeEmail } from '../../common/utils/string.util.js';
import type { ITenantRow } from '../../database/interfaces/i-tenant-row.js';
import type { CreateTenantDto } from './dto/create-tenant.dto.js';
import type { QueryTenantsDto } from './dto/query-tenants.dto.js';
import type { TenantListResponseDto } from './dto/tenant-list-response.dto.js';
import type { TenantResponseDto } from './dto/tenant-response.dto.js';
import type { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { toTenantListResponse, toTenantResponse } from './mappers/tenant.mapper.js';
import { TenantsRepository } from './tenants.repository.js';

@Injectable()
export class TenantsService {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  async create(
    companyId: string,
    dto: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    const row = await this.tenantsRepository.create({
      companyId,
      name: dto.name.trim(),
      email: dto.email ? normalizeEmail(dto.email) : undefined,
      phone: dto.phone,
      isActive: dto.status,
    });

    return toTenantResponse(row);
  }

  async findAll(
    companyId: string,
    query: QueryTenantsDto,
  ): Promise<IPaginatedResult<TenantListResponseDto>> {
    const { items, totalItems } = await this.tenantsRepository.findMany({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toTenantListResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<TenantResponseDto> {
    return toTenantResponse(await this.findRowOrFail(companyId, id));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    await this.findRowOrFail(companyId, id);

    // Drizzle skips undefined keys, so unset DTO fields leave the column alone
    const row = await this.tenantsRepository.update(id, companyId, {
      name: dto.name?.trim(),
      email: dto.email ? normalizeEmail(dto.email) : undefined,
      phone: dto.phone,
      isActive: dto.status,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No tenant was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return toTenantResponse(row);
  }

  // Deleting a tenant deactivates it: status goes false, the row is kept
  async remove(companyId: string, id: string): Promise<TenantResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (!current.isActive) {
      throw new ConflictException(
        `Tenant "${current.name}" is already deactivated`,
      );
    }

    const row = await this.tenantsRepository.setStatus(id, companyId, false);

    if (!row) {
      throw new NotFoundException(`No tenant was found with id ${id}`);
    }

    return toTenantResponse(row);
  }

  async restore(companyId: string, id: string): Promise<TenantResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (current.isActive) {
      throw new ConflictException(`Tenant "${current.name}" is already active`);
    }

    const row = await this.tenantsRepository.setStatus(id, companyId, true);

    if (!row) {
      throw new NotFoundException(`No tenant was found with id ${id}`);
    }

    return toTenantResponse(row);
  }

  async findRowOrFail(companyId: string, id: string): Promise<ITenantRow> {
    const row = await this.tenantsRepository.findById(id, companyId);

    if (!row) {
      throw new NotFoundException(`No tenant was found with id ${id}`);
    }

    return row;
  }
}
