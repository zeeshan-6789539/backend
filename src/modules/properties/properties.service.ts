import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { PropertyTypesService } from '../property-types/property-types.service.js';
import { PropertiesRepository } from './properties.repository.js';
import type { CreatePropertyDto } from './dto/create-property.dto.js';
import type { PropertyListResponseDto } from './dto/property-list-response.dto.js';
import type { PropertyResponseDto } from './dto/property-response.dto.js';
import type { QueryPropertiesDto } from './dto/query-properties.dto.js';
import type { UpdatePropertyDto } from './dto/update-property.dto.js';
import type { IPropertyWithType } from './interfaces/i-property-with-type.js';
import { toPropertyListResponse, toPropertyResponse } from './mappers/property.mapper.js';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly propertiesRepository: PropertiesRepository,
    private readonly propertyTypesService: PropertyTypesService,
  ) {}

  async create(
    companyId: string,
    dto: CreatePropertyDto,
  ): Promise<PropertyResponseDto> {
    const propertyType = await this.propertyTypesService.assertAssignable(
      companyId,
      dto.propertyTypeId,
    );

    const row = await this.propertiesRepository.create({
      companyId,
      name: dto.name.trim(),
      addressLine1: dto.addressLine1,
      city: dto.city,
      propertyTypeId: propertyType.id,
      rentDueDay: dto.rentDueDay,
      isActive: dto.status,
    });

    return toPropertyResponse({ ...row, propertyTypeName: propertyType.name });
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
      propertyTypeId: query.propertyTypeId,
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
    const current = await this.findRowOrFail(companyId, id);

    // Keeping a since-deactivated type is fine; only switching to a new one must pass the check
    const nextTypeId = dto.propertyTypeId;
    const propertyTypeName =
      nextTypeId !== undefined && nextTypeId !== current.propertyTypeId
        ? (await this.propertyTypesService.assertAssignable(companyId, nextTypeId)).name
        : current.propertyTypeName;

    // Drizzle skips undefined keys, so unset DTO fields leave the column alone
    const row = await this.propertiesRepository.update(id, companyId, {
      name: dto.name?.trim(),
      addressLine1: dto.addressLine1,
      city: dto.city,
      propertyTypeId: dto.propertyTypeId,
      rentDueDay: dto.rentDueDay,
      isActive: dto.status,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No property was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return toPropertyResponse({ ...row, propertyTypeName });
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

    return toPropertyResponse({ ...row, propertyTypeName: current.propertyTypeName });
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

    return toPropertyResponse({ ...row, propertyTypeName: current.propertyTypeName });
  }

  async findRowOrFail(companyId: string, id: string): Promise<IPropertyWithType> {
    const row = await this.propertiesRepository.findById(id, companyId);

    if (!row) {
      throw new NotFoundException(`No property was found with id ${id}`);
    }

    return row;
  }
}
