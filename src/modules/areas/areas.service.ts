import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import type { IAreaWithCityRow } from '../../database/interfaces/i-area-row.js';
import { CitiesService } from '../cities/cities.service.js';
import { AreasRepository } from './areas.repository.js';
import type { AreaResponseDto } from './dto/area-response.dto.js';
import type { CreateAreaDto } from './dto/create-area.dto.js';
import type { QueryAreasDto } from './dto/query-areas.dto.js';
import type { UpdateAreaDto } from './dto/update-area.dto.js';
import type { IAssertAreasOptions } from './interfaces/i-assert-areas-options.js';
import { toAreaResponse } from './mappers/area.mapper.js';

@Injectable()
export class AreasService {
  constructor(
    private readonly areasRepository: AreasRepository,
    private readonly citiesService: CitiesService,
  ) {}

  async create(companyId: string, dto: CreateAreaDto): Promise<AreaResponseDto> {
    const name = dto.name.trim();
    const city = await this.citiesService.assertUsable(companyId, dto.cityId);

    await this.assertNameIsAvailable(city.id, city.name, name);

    const row = await this.areasRepository.create({
      companyId,
      cityId: city.id,
      name,
      isActive: dto.status,
    });

    return toAreaResponse({ ...row, cityName: city.name });
  }

  async findAll(
    companyId: string,
    query: QueryAreasDto,
  ): Promise<IPaginatedResult<AreaResponseDto>> {
    const { items, totalItems } = await this.areasRepository.findMany({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      cityId: query.cityId,
      status: query.status,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toAreaResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<AreaResponseDto> {
    return toAreaResponse(await this.findRowOrFail(companyId, id));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateAreaDto,
  ): Promise<AreaResponseDto> {
    const current = await this.findRowOrFail(companyId, id);
    const isMoving = dto.cityId !== undefined && dto.cityId !== current.cityId;
    // Moving or reactivating needs an active target city
    const city =
      isMoving || dto.status === true
        ? await this.citiesService.assertUsable(companyId, dto.cityId ?? current.cityId)
        : { id: current.cityId, name: current.cityName };
    const name = dto.name?.trim();

    if (name || isMoving) {
      await this.assertNameIsAvailable(city.id, city.name, name ?? current.name, id);
    }

    const row = await this.areasRepository.update(companyId, id, {
      cityId: isMoving ? city.id : undefined,
      name,
      isActive: dto.status ?? undefined,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No area was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return toAreaResponse({ ...row, cityName: city.name });
  }

  // Deleting an area deactivates it: status goes false, the row is kept
  async remove(companyId: string, id: string): Promise<AreaResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (!current.isActive) {
      throw new ConflictException(`Area "${current.name}" is already deactivated`);
    }

    return this.setStatusOrFail(current, false);
  }

  async restore(companyId: string, id: string): Promise<AreaResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (current.isActive) {
      throw new ConflictException(`Area "${current.name}" is already active`);
    }

    // An active area must sit in an active city
    await this.citiesService.assertUsable(companyId, current.cityId);

    return this.setStatusOrFail(current, true);
  }

  async findRowOrFail(companyId: string, id: string): Promise<IAreaWithCityRow> {
    const row = await this.areasRepository.findById(companyId, id);

    if (!row) {
      throw new NotFoundException(`No area was found with id ${id}`);
    }

    return row;
  }

  // Used by listings and requirements before linking areas to a record
  async assertAllInCity(options: IAssertAreasOptions): Promise<void> {
    if (options.areaIds.length === 0) {
      return;
    }

    const rows = await this.areasRepository.findByIds(options.companyId, options.areaIds);
    const missingId = options.areaIds.find((id) => !rows.some((row) => row.id === id));

    if (missingId) {
      throw new BadRequestException(
        `No area was found with id ${missingId}. Pick one from your areas list, or add it under Cities & areas.`,
      );
    }

    const outside = rows.find((row) => row.cityId !== options.cityId);

    if (outside) {
      throw new BadRequestException(
        `Area "${outside.name}" is in ${outside.cityName}, not the chosen city. Pick an area of that city, or change the city.`,
      );
    }

    const inactive = rows.find(
      (row) => !row.isActive && !(options.keptIds ?? []).includes(row.id),
    );

    if (inactive) {
      throw new BadRequestException(
        `Area "${inactive.name}" is deactivated. Reactivate it first, or pick another area.`,
      );
    }
  }

  private async setStatusOrFail(
    current: IAreaWithCityRow,
    status: boolean,
  ): Promise<AreaResponseDto> {
    const row = await this.areasRepository.setStatus(current.companyId, current.id, status);

    if (!row) {
      throw new NotFoundException(`No area was found with id ${current.id}`);
    }

    return toAreaResponse({ ...row, cityName: current.cityName });
  }

  // Friendly pre-check; the unique index stays the authority
  private async assertNameIsAvailable(
    cityId: string,
    cityName: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.areasRepository.findByName(cityId, name, excludeId);

    if (existing) {
      throw new ConflictException(
        `${cityName} already has an area named "${existing.name}". Use the existing one, or pick another name.`,
      );
    }
  }
}
