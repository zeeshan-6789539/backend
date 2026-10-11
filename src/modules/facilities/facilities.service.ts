import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import type { IFacilityRow } from '../../database/interfaces/i-facility-row.js';
import type { CreateFacilityDto } from './dto/create-facility.dto.js';
import type { FacilityResponseDto } from './dto/facility-response.dto.js';
import type { QueryFacilitiesDto } from './dto/query-facilities.dto.js';
import type { UpdateFacilityDto } from './dto/update-facility.dto.js';
import { toFacilityResponse } from './mappers/facility.mapper.js';
import { FacilitiesRepository } from './facilities.repository.js';

@Injectable()
export class FacilitiesService {
  constructor(private readonly facilitiesRepository: FacilitiesRepository) {}

  async create(
    companyId: string,
    dto: CreateFacilityDto,
  ): Promise<FacilityResponseDto> {
    const name = dto.name.trim();

    await this.assertNameIsAvailable(companyId, name);

    const row = await this.facilitiesRepository.create({
      companyId,
      name,
      status: dto.status,
    });

    return toFacilityResponse(row);
  }

  async findAll(
    companyId: string,
    query: QueryFacilitiesDto,
  ): Promise<IPaginatedResult<FacilityResponseDto>> {
    const { items, totalItems } = await this.facilitiesRepository.findMany({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toFacilityResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<FacilityResponseDto> {
    return toFacilityResponse(await this.findRowOrFail(companyId, id));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateFacilityDto,
  ): Promise<FacilityResponseDto> {
    await this.findOwnedRowOrFail(companyId, id);

    const name = dto.name?.trim();

    if (name) {
      await this.assertNameIsAvailable(companyId, name, id);
    }

    const row = await this.facilitiesRepository.update(companyId, id, {
      name,
      status: dto.status ?? undefined,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No facility was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return toFacilityResponse(row);
  }

  // Deleting a facility deactivates it: status goes false, the row is kept
  async remove(companyId: string, id: string): Promise<FacilityResponseDto> {
    const current = await this.findOwnedRowOrFail(companyId, id);

    if (!current.status) {
      throw new ConflictException(
        `Facility "${current.name}" is already deactivated`,
      );
    }

    return this.setStatusOrFail(companyId, id, false);
  }

  async restore(companyId: string, id: string): Promise<FacilityResponseDto> {
    const current = await this.findOwnedRowOrFail(companyId, id);

    if (current.status) {
      throw new ConflictException(
        `Facility "${current.name}" is already active`,
      );
    }

    return this.setStatusOrFail(companyId, id, true);
  }

  async findRowOrFail(companyId: string, id: string): Promise<IFacilityRow> {
    const row = await this.facilitiesRepository.findVisibleById(companyId, id);

    if (!row) {
      throw new NotFoundException(`No facility was found with id ${id}`);
    }

    return row;
  }

  // Used by properties and requirements before linking facilities to a record
  async assertAllUsable(companyId: string, ids: readonly string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const rows = await this.facilitiesRepository.findVisibleByIds(companyId, ids);
    const missingId = ids.find((id) => !rows.some((row) => row.id === id));

    if (missingId) {
      throw new BadRequestException(
        `No facility was found with id ${missingId}. Pick one from your facilities list.`,
      );
    }

    const inactive = rows.find((row) => !row.status);

    if (inactive) {
      throw new BadRequestException(
        `Facility "${inactive.name}" is deactivated. Reactivate it first, or remove it from the selection.`,
      );
    }
  }

  // Idempotent: returns how many of the names were newly created
  async seedBuiltInFacilities(names: readonly string[]): Promise<number> {
    let created = 0;

    for (const name of names) {
      const existing = await this.facilitiesRepository.findBuiltInByName(name);

      if (!existing) {
        await this.facilitiesRepository.create({ name, status: true });
        created += 1;
      }
    }

    return created;
  }

  private async findOwnedRowOrFail(
    companyId: string,
    id: string,
  ): Promise<IFacilityRow> {
    const row = await this.findRowOrFail(companyId, id);

    if (row.companyId === null) {
      throw new ForbiddenException(
        `"${row.name}" is a built-in facility and cannot be changed. Add your own facility instead.`,
      );
    }

    return row;
  }

  private async setStatusOrFail(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<FacilityResponseDto> {
    const row = await this.facilitiesRepository.setStatus(companyId, id, status);

    if (!row) {
      throw new NotFoundException(`No facility was found with id ${id}`);
    }

    return toFacilityResponse(row);
  }

  // Friendly pre-check; the unique indexes stay the authority
  private async assertNameIsAvailable(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.facilitiesRepository.findVisibleByName(
      companyId,
      name,
      excludeId,
    );

    if (existing) {
      throw new ConflictException(
        existing.companyId === null
          ? `"${existing.name}" is already a built-in facility. Use it instead of adding a copy.`
          : `You already have a facility named "${existing.name}". Use it, or pick another name.`,
      );
    }
  }
}
