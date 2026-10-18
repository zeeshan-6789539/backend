import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import type { IPropertyRow } from '../../database/interfaces/i-property-row.js';
import { PropertiesRepository } from './properties.repository.js';
import type { CreatePropertyDto } from './dto/create-property.dto.js';
import type { PropertyListResponseDto } from './dto/property-list-response.dto.js';
import type { PropertyResponseDto } from './dto/property-response.dto.js';
import type { QueryPropertiesDto } from './dto/query-properties.dto.js';
import type { UpdatePropertyDto } from './dto/update-property.dto.js';
import { toPropertyListResponse, toPropertyResponse } from './mappers/property.mapper.js';

@Injectable()
export class PropertiesService {
  constructor(private readonly propertiesRepository: PropertiesRepository) {}

  async create(
    companyId: string,
    dto: CreatePropertyDto,
  ): Promise<PropertyResponseDto> {
    const row = await this.propertiesRepository.create({
      companyId,
      name: dto.name.trim(),
      addressLine1: dto.addressLine1,
      city: dto.city,
      propertyType: dto.propertyType,
      rentDueDay: dto.rentDueDay,
      isActive: dto.status,
    });

    return toPropertyResponse(row);
  }

  async findAll(
    companyId: string,
    query: QueryPropertiesDto,
  ): Promise<IPaginatedResult<PropertyListResponseDto>> {
    const { items, totalItems } = await this.propertiesRepository.findMany({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      city: query.city,
      propertyType: query.propertyType,
      status: query.status,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toPropertyListResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<PropertyResponseDto> {
    return toPropertyResponse(await this.findRowOrFail(companyId, id));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    await this.findRowOrFail(companyId, id);

    // Drizzle skips undefined keys, so unset DTO fields leave the column alone
    const row = await this.propertiesRepository.update(id, companyId, {
      name: dto.name?.trim(),
      addressLine1: dto.addressLine1,
      city: dto.city,
      propertyType: dto.propertyType,
      rentDueDay: dto.rentDueDay,
      isActive: dto.status,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No property was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return toPropertyResponse(row);
  }

  // Deleting a property deactivates it: status goes false, the row is kept
  async remove(companyId: string, id: string): Promise<PropertyResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (!current.isActive) {
      throw new ConflictException(
        `Property "${current.name}" is already deactivated`,
      );
    }

    const row = await this.propertiesRepository.setStatus(id, companyId, false);

    if (!row) {
      throw new NotFoundException(`No property was found with id ${id}`);
    }

    return toPropertyResponse(row);
  }

  async restore(companyId: string, id: string): Promise<PropertyResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (current.isActive) {
      throw new ConflictException(
        `Property "${current.name}" is already active`,
      );
    }

    const row = await this.propertiesRepository.setStatus(id, companyId, true);

    if (!row) {
      throw new NotFoundException(`No property was found with id ${id}`);
    }

    return toPropertyResponse(row);
  }

  async findRowOrFail(companyId: string, id: string): Promise<IPropertyRow> {
    const row = await this.propertiesRepository.findById(id, companyId);

    if (!row) {
      throw new NotFoundException(`No property was found with id ${id}`);
    }

    return row;
  }
}
