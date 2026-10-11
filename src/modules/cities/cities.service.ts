import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import type { ICityRow } from '../../database/interfaces/i-city-row.js';
import { CitiesRepository } from './cities.repository.js';
import type { CityResponseDto } from './dto/city-response.dto.js';
import type { CreateCityDto } from './dto/create-city.dto.js';
import type { QueryCitiesDto } from './dto/query-cities.dto.js';
import type { UpdateCityDto } from './dto/update-city.dto.js';
import { toCityResponse } from './mappers/city.mapper.js';

@Injectable()
export class CitiesService {
  constructor(private readonly citiesRepository: CitiesRepository) {}

  async create(companyId: string, dto: CreateCityDto): Promise<CityResponseDto> {
    const name = dto.name.trim();

    await this.assertNameIsAvailable(companyId, name);

    const row = await this.citiesRepository.create({
      companyId,
      name,
      status: dto.status,
    });

    return toCityResponse(row, 0);
  }

  async findAll(
    companyId: string,
    query: QueryCitiesDto,
  ): Promise<IPaginatedResult<CityResponseDto>> {
    const { items, totalItems } = await this.citiesRepository.findMany({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      sortOrder: query.sortOrder,
    });

    const areaCounts = await this.citiesRepository.countActiveAreas(
      items.map((item) => item.id),
    );

    return buildPaginatedResult(
      items.map((item) => toCityResponse(item, areaCounts.get(item.id) ?? 0)),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<CityResponseDto> {
    return this.toResponseWithCount(await this.findRowOrFail(companyId, id));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateCityDto,
  ): Promise<CityResponseDto> {
    const current = await this.findRowOrFail(companyId, id);
    const name = dto.name?.trim();

    if (name) {
      await this.assertNameIsAvailable(companyId, name, id);
    }

    if (dto.status === false && current.status) {
      await this.assertHasNoActiveAreas(current);
    }

    const row = await this.citiesRepository.update(companyId, id, {
      name,
      status: dto.status ?? undefined,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No city was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return this.toResponseWithCount(row);
  }

  // Deleting a city deactivates it: status goes false, the row is kept
  async remove(companyId: string, id: string): Promise<CityResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (!current.status) {
      throw new ConflictException(`City "${current.name}" is already deactivated`);
    }

    await this.assertHasNoActiveAreas(current);

    return this.setStatusOrFail(companyId, id, false);
  }

  async restore(companyId: string, id: string): Promise<CityResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (current.status) {
      throw new ConflictException(`City "${current.name}" is already active`);
    }

    return this.setStatusOrFail(companyId, id, true);
  }

  async findRowOrFail(companyId: string, id: string): Promise<ICityRow> {
    const row = await this.citiesRepository.findById(companyId, id);

    if (!row) {
      throw new NotFoundException(`No city was found with id ${id}`);
    }

    return row;
  }

  // Used by areas before linking one to a city
  async assertUsable(companyId: string, id: string): Promise<ICityRow> {
    const row = await this.citiesRepository.findById(companyId, id);

    if (!row) {
      throw new BadRequestException(
        `No city was found with id ${id}. Pick one from your cities list, or add it first.`,
      );
    }

    if (!row.status) {
      throw new BadRequestException(
        `City "${row.name}" is deactivated. Reactivate it first, or pick another city.`,
      );
    }

    return row;
  }

  private async toResponseWithCount(row: ICityRow): Promise<CityResponseDto> {
    const areaCounts = await this.citiesRepository.countActiveAreas([row.id]);

    return toCityResponse(row, areaCounts.get(row.id) ?? 0);
  }

  private async setStatusOrFail(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<CityResponseDto> {
    const row = await this.citiesRepository.setStatus(companyId, id, status);

    if (!row) {
      throw new NotFoundException(`No city was found with id ${id}`);
    }

    return this.toResponseWithCount(row);
  }

  // A deactivated city must not leave active areas pointing at it
  private async assertHasNoActiveAreas(city: ICityRow): Promise<void> {
    const areaCounts = await this.citiesRepository.countActiveAreas([city.id]);
    const activeAreas = areaCounts.get(city.id) ?? 0;

    if (activeAreas > 0) {
      throw new ConflictException(
        `City "${city.name}" still has ${activeAreas} active area(s). Deactivate them first, then retry.`,
      );
    }
  }

  // Friendly pre-check; the unique index stays the authority
  private async assertNameIsAvailable(
    companyId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.citiesRepository.findByName(companyId, name, excludeId);

    if (existing) {
      throw new ConflictException(
        `You already have a city named "${existing.name}". Use the existing one, or pick another name.`,
      );
    }
  }
}
