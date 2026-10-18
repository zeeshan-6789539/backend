import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import type { IPropertyTypeRow } from '../../database/interfaces/i-property-type-row.js';
import { PropertyTypesRepository } from './property-types.repository.js';
import type { CreatePropertyTypeDto } from './dto/create-property-type.dto.js';
import type { PropertyTypeResponseDto } from './dto/property-type-response.dto.js';
import type { QueryPropertyTypesDto } from './dto/query-property-types.dto.js';
import type { UpdatePropertyTypeDto } from './dto/update-property-type.dto.js';
import { toPropertyTypeResponse } from './mappers/property-type.mapper.js';

@Injectable()
export class PropertyTypesService {
  constructor(
    private readonly propertyTypesRepository: PropertyTypesRepository,
  ) {}

  async create(
    companyId: string,
    dto: CreatePropertyTypeDto,
  ): Promise<PropertyTypeResponseDto> {
    const name = dto.name.trim();
    await this.assertNameIsAvailable(companyId, name);

    const row = await this.propertyTypesRepository.create({
      companyId,
      name,
      isActive: dto.status,
    });

    return toPropertyTypeResponse(row);
  }

  async findAll(
    companyId: string,
    query: QueryPropertyTypesDto,
  ): Promise<IPaginatedResult<PropertyTypeResponseDto>> {
    const { items, totalItems } = await this.propertyTypesRepository.findMany({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toPropertyTypeResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(
    companyId: string,
    id: string,
  ): Promise<PropertyTypeResponseDto> {
    return toPropertyTypeResponse(await this.findRowOrFail(companyId, id));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdatePropertyTypeDto,
  ): Promise<PropertyTypeResponseDto> {
    await this.findRowOrFail(companyId, id);

    const name = dto.name?.trim();

    if (name) {
      await this.assertNameIsAvailable(companyId, name, id);
    }

    // Drizzle skips undefined keys, so unset DTO fields leave the column alone
    const row = await this.propertyTypesRepository.update(id, companyId, {
      name,
      isActive: dto.status,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No property type was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return toPropertyTypeResponse(row);
  }

  // Deactivating hides the type from the property form; properties already using it keep it
  async remove(
    companyId: string,
    id: string,
  ): Promise<PropertyTypeResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (!current.isActive) {
      throw new ConflictException(
        `Property type "${current.name}" is already deactivated`,
      );
    }

    const row = await this.propertyTypesRepository.setStatus(
      id,
      companyId,
      false,
    );

    if (!row) {
      throw new NotFoundException(`No property type was found with id ${id}`);
    }

    return toPropertyTypeResponse(row);
  }

  async restore(
    companyId: string,
    id: string,
  ): Promise<PropertyTypeResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (current.isActive) {
      throw new ConflictException(
        `Property type "${current.name}" is already active`,
      );
    }

    const row = await this.propertyTypesRepository.setStatus(
      id,
      companyId,
      true,
    );

    if (!row) {
      throw new NotFoundException(`No property type was found with id ${id}`);
    }

    return toPropertyTypeResponse(row);
  }

  async findRowOrFail(
    companyId: string,
    id: string,
  ): Promise<IPropertyTypeRow> {
    const row = await this.propertyTypesRepository.findById(id, companyId);

    if (!row) {
      throw new NotFoundException(`No property type was found with id ${id}`);
    }

    return row;
  }

  // A property may only be given a type that belongs to its company and is still active
  async assertAssignable(
    companyId: string,
    id: string,
  ): Promise<IPropertyTypeRow> {
    const row = await this.propertyTypesRepository.findById(id, companyId);

    if (!row) {
      throw new BadRequestException(
        `No property type was found with id ${id} for your company. Pick one from the list.`,
      );
    }

    if (!row.isActive) {
      throw new BadRequestException(
        `Property type "${row.name}" is deactivated. Pick an active type, or reactivate it under Property Types.`,
      );
    }

    return row;
  }

  private async assertNameIsAvailable(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.propertyTypesRepository.findByName(
      companyId,
      name,
      excludeId,
    );

    if (existing) {
      throw new ConflictException(
        existing.isActive
          ? `This company already has a property type named "${existing.name}". Pick a different name.`
          : `A deactivated property type named "${existing.name}" already exists. Restore it instead of creating a new one.`,
      );
    }
  }
}
