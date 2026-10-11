import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import type { IPropertyTypeRow } from '../../database/interfaces/i-property-type-row.js';
import type { CreatePropertyTypeDto } from './dto/create-property-type.dto.js';
import type { PropertyTypeResponseDto } from './dto/property-type-response.dto.js';
import type { QueryPropertyTypesDto } from './dto/query-property-types.dto.js';
import type { UpdatePropertyTypeDto } from './dto/update-property-type.dto.js';
import { toPropertyTypeResponse } from './mappers/property-type.mapper.js';
import { PropertyTypesRepository } from './property-types.repository.js';

@Injectable()
export class PropertyTypesService {
  constructor(private readonly propertyTypesRepository: PropertyTypesRepository) {}

  async create(
    companyId: string,
    dto: CreatePropertyTypeDto,
  ): Promise<PropertyTypeResponseDto> {
    const name = dto.name.trim();

    await this.assertNameIsAvailable(companyId, name);

    const row = await this.propertyTypesRepository.create({
      companyId,
      name,
      status: dto.status,
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

  async findOne(companyId: string, id: string): Promise<PropertyTypeResponseDto> {
    return toPropertyTypeResponse(await this.findRowOrFail(companyId, id));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdatePropertyTypeDto,
  ): Promise<PropertyTypeResponseDto> {
    await this.findOwnedRowOrFail(companyId, id);

    const name = dto.name?.trim();

    if (name) {
      await this.assertNameIsAvailable(companyId, name, id);
    }

    const row = await this.propertyTypesRepository.update(companyId, id, {
      name,
      status: dto.status ?? undefined,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No property type was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return toPropertyTypeResponse(row);
  }

  // Deleting a property type deactivates it: status goes false, the row is kept
  async remove(companyId: string, id: string): Promise<PropertyTypeResponseDto> {
    const current = await this.findOwnedRowOrFail(companyId, id);

    if (!current.status) {
      throw new ConflictException(
        `Property type "${current.name}" is already deactivated`,
      );
    }

    return this.setStatusOrFail(companyId, id, false);
  }

  async restore(companyId: string, id: string): Promise<PropertyTypeResponseDto> {
    const current = await this.findOwnedRowOrFail(companyId, id);

    if (current.status) {
      throw new ConflictException(
        `Property type "${current.name}" is already active`,
      );
    }

    return this.setStatusOrFail(companyId, id, true);
  }

  async findRowOrFail(companyId: string, id: string): Promise<IPropertyTypeRow> {
    const row = await this.propertyTypesRepository.findVisibleById(companyId, id);

    if (!row) {
      throw new NotFoundException(`No property type was found with id ${id}`);
    }

    return row;
  }

  // Used by properties and requirements before linking a type to a record
  async assertUsable(companyId: string, id: string): Promise<IPropertyTypeRow> {
    const row = await this.propertyTypesRepository.findVisibleById(companyId, id);

    if (!row) {
      throw new BadRequestException(
        `No property type was found with id ${id}. Pick one from your property types list.`,
      );
    }

    if (!row.status) {
      throw new BadRequestException(
        `Property type "${row.name}" is deactivated. Reactivate it first, or pick another type.`,
      );
    }

    return row;
  }

  // Idempotent: returns how many of the names were newly created
  async seedBuiltInTypes(names: readonly string[]): Promise<number> {
    let created = 0;

    for (const name of names) {
      const existing = await this.propertyTypesRepository.findBuiltInByName(name);

      if (!existing) {
        await this.propertyTypesRepository.create({ name, status: true });
        created += 1;
      }
    }

    return created;
  }

  private async findOwnedRowOrFail(
    companyId: string,
    id: string,
  ): Promise<IPropertyTypeRow> {
    const row = await this.findRowOrFail(companyId, id);

    if (row.companyId === null) {
      throw new ForbiddenException(
        `"${row.name}" is a built-in property type and cannot be changed. Add your own type instead.`,
      );
    }

    return row;
  }

  private async setStatusOrFail(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<PropertyTypeResponseDto> {
    const row = await this.propertyTypesRepository.setStatus(companyId, id, status);

    if (!row) {
      throw new NotFoundException(`No property type was found with id ${id}`);
    }

    return toPropertyTypeResponse(row);
  }

  // Friendly pre-check; the unique indexes stay the authority
  private async assertNameIsAvailable(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.propertyTypesRepository.findVisibleByName(
      companyId,
      name,
      excludeId,
    );

    if (existing) {
      throw new ConflictException(
        existing.companyId === null
          ? `"${existing.name}" is already a built-in property type. Use it instead of adding a copy.`
          : `You already have a property type named "${existing.name}". Use it, or pick another name.`,
      );
    }
  }
}
