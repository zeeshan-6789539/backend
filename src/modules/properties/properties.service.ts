import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PropertyPurpose } from '../../common/enums/property-purpose.enum.js';
import { PropertyStatus } from '../../common/enums/property-status.enum.js';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import type { IPropertyRow } from '../../database/interfaces/i-property-row.js';
import { AreasService } from '../areas/areas.service.js';
import { CitiesService } from '../cities/cities.service.js';
import { ContactsService } from '../contacts/contacts.service.js';
import { FacilitiesService } from '../facilities/facilities.service.js';
import { PropertyTypesService } from '../property-types/property-types.service.js';
import type { CreatePropertyDto } from './dto/create-property.dto.js';
import type { PropertyResponseDto } from './dto/property-response.dto.js';
import type { QueryPropertiesDto } from './dto/query-properties.dto.js';
import type { UpdatePropertyDto } from './dto/update-property.dto.js';
import type { IFindPropertiesOptions } from './interfaces/i-find-properties-options.js';
import { toPropertyResponse } from './mappers/property.mapper.js';
import { CLOSING_STATUS_BY_PURPOSE } from './properties.constants.js';
import { PropertiesRepository } from './properties.repository.js';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly propertiesRepository: PropertiesRepository,
    private readonly propertyTypesService: PropertyTypesService,
    private readonly contactsService: ContactsService,
    private readonly facilitiesService: FacilitiesService,
    private readonly citiesService: CitiesService,
    private readonly areasService: AreasService,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreatePropertyDto,
  ): Promise<PropertyResponseDto> {
    await this.propertyTypesService.assertUsable(companyId, dto.propertyTypeId);

    if (dto.ownerContactId) {
      await this.contactsService.assertUsable(companyId, dto.ownerContactId);
    }

    const propertyStatus = dto.propertyStatus ?? PropertyStatus.AVAILABLE;

    this.assertStatusMatchesPurpose(dto.purpose, propertyStatus);
    this.assertDepositMatchesPurpose(dto.purpose, dto.securityDeposit);

    const facilityIds = dto.facilityIds ?? [];

    await this.facilitiesService.assertAllUsable(companyId, facilityIds);
    await this.citiesService.assertUsable(companyId, dto.cityId);
    await this.areasService.assertAllInCity({
      companyId,
      cityId: dto.cityId,
      areaIds: dto.areaId ? [dto.areaId] : [],
    });

    const row = await this.propertiesRepository.create({
      companyId,
      createdBy: userId,
      propertyTypeId: dto.propertyTypeId,
      ownerContactId: dto.ownerContactId ?? null,
      title: dto.title.trim(),
      description: dto.description ?? null,
      purpose: dto.purpose,
      price: dto.price,
      securityDeposit: dto.securityDeposit ?? null,
      areaSqft: dto.areaSqft ?? null,
      facilities: facilityIds,
      floor: dto.floor ?? null,
      cityId: dto.cityId,
      areaId: dto.areaId ?? null,
      address: dto.address ?? null,
      propertyStatus,
      status: dto.status,
    });

    return this.findOne(companyId, row.id);
  }

  async findAll(
    companyId: string,
    query: QueryPropertiesDto,
  ): Promise<IPaginatedResult<PropertyResponseDto>> {
    return this.findPage({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortOrder: query.sortOrder,
      purpose: query.purpose,
      propertyTypeId: query.propertyTypeId,
      propertyStatus: query.propertyStatus,
      ownerContactId: query.ownerContactId,
      cityId: query.cityId,
      areaIds: query.areaId ? [query.areaId] : undefined,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      facilityIds: query.facilityIds,
      status: query.status,
    });
  }

  // Shared by the list endpoint and requirement matching
  async findPage(
    options: IFindPropertiesOptions,
  ): Promise<IPaginatedResult<PropertyResponseDto>> {
    const { items, totalItems } = await this.propertiesRepository.findMany(options);

    return buildPaginatedResult(
      items.map(toPropertyResponse),
      totalItems,
      options.page,
      options.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<PropertyResponseDto> {
    const row = await this.propertiesRepository.findDetailById(companyId, id);

    if (!row) {
      throw new NotFoundException(`No property was found with id ${id}`);
    }

    return toPropertyResponse(row);
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (dto.propertyTypeId && dto.propertyTypeId !== current.propertyTypeId) {
      await this.propertyTypesService.assertUsable(companyId, dto.propertyTypeId);
    }

    if (dto.ownerContactId && dto.ownerContactId !== current.ownerContactId) {
      await this.contactsService.assertUsable(companyId, dto.ownerContactId);
    }

    const purpose = dto.purpose ?? current.purpose;
    const propertyStatus = dto.propertyStatus ?? current.propertyStatus;

    this.assertStatusMatchesPurpose(purpose, propertyStatus);
    this.assertDepositMatchesPurpose(purpose, dto.securityDeposit);

    // Only newly added facilities must be active, so a later-deactivated one can stay
    const addedFacilityIds = (dto.facilityIds ?? []).filter(
      (facilityId) => !current.facilities.includes(facilityId),
    );

    await this.facilitiesService.assertAllUsable(companyId, addedFacilityIds);

    const cityId = dto.cityId ?? current.cityId;
    const isCityChanged = cityId !== current.cityId;
    // Moving to another city drops an unspecified area, since it belongs to the old city
    const areaId =
      dto.areaId === undefined ? (isCityChanged ? null : current.areaId) : dto.areaId;

    if (isCityChanged) {
      await this.citiesService.assertUsable(companyId, cityId);
    }

    // An unchanged area may stay even if it was deactivated since
    await this.areasService.assertAllInCity({
      companyId,
      cityId,
      areaIds: areaId ? [areaId] : [],
      keptIds: current.areaId ? [current.areaId] : [],
    });

    // Switching to sale drops any deposit left over from the rental listing
    const securityDeposit =
      purpose === PropertyPurpose.SALE ? null : dto.securityDeposit;

    // undefined leaves a column alone; null clears an optional one
    const row = await this.propertiesRepository.update(companyId, id, {
      propertyTypeId: dto.propertyTypeId ?? undefined,
      ownerContactId: dto.ownerContactId,
      title: dto.title?.trim(),
      description: dto.description,
      purpose: dto.purpose ?? undefined,
      price: dto.price ?? undefined,
      securityDeposit,
      areaSqft: dto.areaSqft,
      facilities: dto.facilityIds,
      floor: dto.floor,
      cityId: dto.cityId ?? undefined,
      areaId,
      address: dto.address,
      propertyStatus: dto.propertyStatus ?? undefined,
      status: dto.status ?? undefined,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No property was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return this.findOne(companyId, id);
  }

  // Deleting a property deactivates it: status goes false, the row is kept
  async remove(companyId: string, id: string): Promise<PropertyResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (!current.status) {
      throw new ConflictException(`Property "${current.title}" is already deactivated`);
    }

    return this.setStatusOrFail(companyId, id, false);
  }

  async restore(companyId: string, id: string): Promise<PropertyResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (current.status) {
      throw new ConflictException(`Property "${current.title}" is already active`);
    }

    return this.setStatusOrFail(companyId, id, true);
  }

  async findRowOrFail(companyId: string, id: string): Promise<IPropertyRow> {
    const row = await this.propertiesRepository.findById(companyId, id);

    if (!row) {
      throw new NotFoundException(`No property was found with id ${id}`);
    }

    return row;
  }

  private async setStatusOrFail(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<PropertyResponseDto> {
    const row = await this.propertiesRepository.setStatus(companyId, id, status);

    if (!row) {
      throw new NotFoundException(`No property was found with id ${id}`);
    }

    return this.findOne(companyId, id);
  }

  private assertStatusMatchesPurpose(
    purpose: PropertyPurpose,
    propertyStatus: PropertyStatus,
  ): void {
    const allowedClosing = CLOSING_STATUS_BY_PURPOSE[purpose];

    if (
      propertyStatus !== PropertyStatus.AVAILABLE &&
      propertyStatus !== allowedClosing
    ) {
      throw new BadRequestException(
        `A ${purpose} listing cannot be marked "${propertyStatus}". Use "${PropertyStatus.AVAILABLE}" or "${allowedClosing}".`,
      );
    }
  }

  private assertDepositMatchesPurpose(
    purpose: PropertyPurpose,
    securityDeposit: number | null | undefined,
  ): void {
    if (purpose === PropertyPurpose.SALE && securityDeposit != null) {
      throw new BadRequestException(
        'A security deposit only applies to rent listings. Clear it, or set purpose to rent.',
      );
    }
  }
}
