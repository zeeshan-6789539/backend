import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PropertyStatus } from '../../common/enums/property-status.enum.js';
import { RequirementStatus } from '../../common/enums/requirement-status.enum.js';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import type { IPropertyRequirementRow } from '../../database/interfaces/i-property-requirement-row.js';
import { AreasService } from '../areas/areas.service.js';
import { CitiesService } from '../cities/cities.service.js';
import { ContactsService } from '../contacts/contacts.service.js';
import { FacilitiesService } from '../facilities/facilities.service.js';
import type { PropertyResponseDto } from '../properties/dto/property-response.dto.js';
import { CLOSING_STATUS_BY_PURPOSE } from '../properties/properties.constants.js';
import { PropertiesService } from '../properties/properties.service.js';
import { PropertyTypesService } from '../property-types/property-types.service.js';
import type { CreatePropertyRequirementDto } from './dto/create-property-requirement.dto.js';
import type { MatchPropertyRequirementDto } from './dto/match-property-requirement.dto.js';
import type { PropertyRequirementResponseDto } from './dto/property-requirement-response.dto.js';
import type { QueryPropertyRequirementsDto } from './dto/query-property-requirements.dto.js';
import type { QueryRequirementMatchesDto } from './dto/query-requirement-matches.dto.js';
import type { UpdatePropertyRequirementDto } from './dto/update-property-requirement.dto.js';
import { toPropertyRequirementResponse } from './mappers/property-requirement.mapper.js';
import {
  LISTING_PURPOSE_FOR_REQUIREMENT,
  MATCH_CRITERIA_BY_LEVEL,
} from './property-requirements.constants.js';
import { PropertyRequirementsRepository } from './property-requirements.repository.js';

@Injectable()
export class PropertyRequirementsService {
  constructor(
    private readonly propertyRequirementsRepository: PropertyRequirementsRepository,
    private readonly contactsService: ContactsService,
    private readonly propertyTypesService: PropertyTypesService,
    private readonly propertiesService: PropertiesService,
    private readonly facilitiesService: FacilitiesService,
    private readonly citiesService: CitiesService,
    private readonly areasService: AreasService,
  ) {}

  async create(
    companyId: string,
    dto: CreatePropertyRequirementDto,
  ): Promise<PropertyRequirementResponseDto> {
    this.assertMatchedHasProperty(dto.requirementStatus, null);
    await this.contactsService.assertUsable(companyId, dto.contactId);

    if (dto.propertyTypeId) {
      await this.propertyTypesService.assertUsable(companyId, dto.propertyTypeId);
    }

    this.assertBudgetRange(dto.budgetMin, dto.budgetMax);

    const facilityIds = dto.facilityIds ?? [];

    await this.facilitiesService.assertAllUsable(companyId, facilityIds);

    const preferredCityId = dto.preferredCityId ?? null;
    const preferredAreaIds = dto.preferredAreaIds ?? [];

    if (preferredCityId) {
      await this.citiesService.assertUsable(companyId, preferredCityId);
    }

    await this.assertPreferredAreas(companyId, preferredCityId, preferredAreaIds);

    const row = await this.propertyRequirementsRepository.create({
      companyId,
      contactId: dto.contactId,
      propertyTypeId: dto.propertyTypeId ?? null,
      purpose: dto.purpose,
      budgetMin: dto.budgetMin ?? null,
      budgetMax: dto.budgetMax ?? null,
      preferredCityId,
      preferredAreaIds,
      facilities: facilityIds,
      notes: dto.notes ?? null,
      requirementStatus: dto.requirementStatus,
      isActive: dto.status,
    });

    return this.findOne(companyId, row.id);
  }

  async findAll(
    companyId: string,
    query: QueryPropertyRequirementsDto,
  ): Promise<IPaginatedResult<PropertyRequirementResponseDto>> {
    const { items, totalItems } =
      await this.propertyRequirementsRepository.findMany({
        companyId,
        page: query.page,
        limit: query.limit,
        search: query.search,
        sortOrder: query.sortOrder,
        contactId: query.contactId,
        propertyTypeId: query.propertyTypeId,
        purpose: query.purpose,
        requirementStatus: query.requirementStatus,
        status: query.status,
      });

    return buildPaginatedResult(
      items.map(toPropertyRequirementResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(
    companyId: string,
    id: string,
  ): Promise<PropertyRequirementResponseDto> {
    const row = await this.propertyRequirementsRepository.findDetailById(
      companyId,
      id,
    );

    if (!row) {
      throw new NotFoundException(`No requirement was found with id ${id}`);
    }

    return toPropertyRequirementResponse(row);
  }

  // Active, available listings that satisfy the criteria the chosen match level keeps
  async findMatches(
    companyId: string,
    id: string,
    query: QueryRequirementMatchesDto,
  ): Promise<IPaginatedResult<PropertyResponseDto>> {
    const requirement = await this.findRowOrFail(companyId, id);
    const criteria = MATCH_CRITERIA_BY_LEVEL[query.matchLevel];

    return this.propertiesService.findPage({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortOrder: query.sortOrder,
      purpose: LISTING_PURPOSE_FOR_REQUIREMENT[requirement.purpose],
      propertyTypeId: criteria.propertyType
        ? (requirement.propertyTypeId ?? undefined)
        : undefined,
      propertyStatus: PropertyStatus.AVAILABLE,
      status: true,
      cityId: criteria.city ? (requirement.preferredCityId ?? undefined) : undefined,
      areaIds: criteria.area ? requirement.preferredAreaIds : undefined,
      minPrice: criteria.budget ? (requirement.budgetMin ?? undefined) : undefined,
      maxPrice: criteria.budget ? (requirement.budgetMax ?? undefined) : undefined,
      facilityIds: criteria.facilities ? requirement.facilities : undefined,
    });
  }

  // The seeker picked a listing: it becomes sold or rented and the requirement is matched
  async match(
    companyId: string,
    id: string,
    dto: MatchPropertyRequirementDto,
  ): Promise<PropertyRequirementResponseDto> {
    const requirement = await this.findRowOrFail(companyId, id);

    if (!requirement.isActive) {
      throw new ConflictException(
        'This requirement is deactivated. Reactivate it first, then choose a property.',
      );
    }

    if (requirement.matchedPropertyId) {
      throw new ConflictException(
        'A property has already been chosen for this requirement',
      );
    }

    const property = await this.propertiesService.findRowOrFail(
      companyId,
      dto.propertyId,
    );
    const listingPurpose = LISTING_PURPOSE_FOR_REQUIREMENT[requirement.purpose];

    if (property.purpose !== listingPurpose) {
      throw new BadRequestException(
        `Property "${property.title}" is listed for ${property.purpose}, but this client wants to ${requirement.purpose}. Pick a ${listingPurpose} listing.`,
      );
    }

    if (!property.isActive) {
      throw new ConflictException(
        `Property "${property.title}" is deactivated. Reactivate it first, or pick another.`,
      );
    }

    if (property.propertyStatus !== PropertyStatus.AVAILABLE) {
      throw new ConflictException(
        `Property "${property.title}" is already ${property.propertyStatus}. Pick another listing.`,
      );
    }

    const isMatched = await this.propertyRequirementsRepository.matchWithProperty({
      companyId,
      requirementId: id,
      propertyId: property.id,
      closingStatus: CLOSING_STATUS_BY_PURPOSE[property.purpose],
    });

    if (!isMatched) {
      throw new ConflictException(
        'This requirement or property was changed by another request. Refresh and try again.',
      );
    }

    return this.findOne(companyId, id);
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdatePropertyRequirementDto,
  ): Promise<PropertyRequirementResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    this.assertMatchedHasProperty(dto.requirementStatus, current.matchedPropertyId);

    if (dto.contactId && dto.contactId !== current.contactId) {
      await this.contactsService.assertUsable(companyId, dto.contactId);
    }

    if (dto.propertyTypeId && dto.propertyTypeId !== current.propertyTypeId) {
      await this.propertyTypesService.assertUsable(companyId, dto.propertyTypeId);
    }

    this.assertBudgetRange(
      dto.budgetMin === undefined ? current.budgetMin : dto.budgetMin,
      dto.budgetMax === undefined ? current.budgetMax : dto.budgetMax,
    );

    // Only newly added facilities must be active, so a later-deactivated one can stay
    const addedFacilityIds = (dto.facilityIds ?? []).filter(
      (facilityId) => !current.facilities.includes(facilityId),
    );

    await this.facilitiesService.assertAllUsable(companyId, addedFacilityIds);

    const preferredCityId =
      dto.preferredCityId === undefined ? current.preferredCityId : dto.preferredCityId;
    const isCityChanged = preferredCityId !== current.preferredCityId;
    // Areas left unspecified belong to the old city, so a city change clears them
    const preferredAreaIds =
      dto.preferredAreaIds ?? (isCityChanged ? [] : current.preferredAreaIds);

    if (isCityChanged && preferredCityId) {
      await this.citiesService.assertUsable(companyId, preferredCityId);
    }

    await this.assertPreferredAreas(
      companyId,
      preferredCityId,
      preferredAreaIds,
      isCityChanged ? [] : current.preferredAreaIds,
    );

    // undefined leaves a column alone; null clears an optional one
    const row = await this.propertyRequirementsRepository.update(companyId, id, {
      contactId: dto.contactId ?? undefined,
      propertyTypeId: dto.propertyTypeId,
      purpose: dto.purpose ?? undefined,
      budgetMin: dto.budgetMin,
      budgetMax: dto.budgetMax,
      preferredCityId,
      preferredAreaIds,
      facilities: dto.facilityIds,
      notes: dto.notes,
      requirementStatus: dto.requirementStatus ?? undefined,
      isActive: dto.status ?? undefined,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No requirement was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return this.findOne(companyId, id);
  }

  // Deleting a requirement deactivates it: status goes false, the row is kept
  async remove(
    companyId: string,
    id: string,
  ): Promise<PropertyRequirementResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (!current.isActive) {
      throw new ConflictException('This requirement is already deactivated');
    }

    return this.setStatusOrFail(companyId, id, false);
  }

  async restore(
    companyId: string,
    id: string,
  ): Promise<PropertyRequirementResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (current.isActive) {
      throw new ConflictException('This requirement is already active');
    }

    return this.setStatusOrFail(companyId, id, true);
  }

  async findRowOrFail(
    companyId: string,
    id: string,
  ): Promise<IPropertyRequirementRow> {
    const row = await this.propertyRequirementsRepository.findById(companyId, id);

    if (!row) {
      throw new NotFoundException(`No requirement was found with id ${id}`);
    }

    return row;
  }

  private async setStatusOrFail(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<PropertyRequirementResponseDto> {
    const row = await this.propertyRequirementsRepository.setStatus(
      companyId,
      id,
      status,
    );

    if (!row) {
      throw new NotFoundException(`No requirement was found with id ${id}`);
    }

    return this.findOne(companyId, id);
  }

  private assertBudgetRange(
    budgetMin: number | null | undefined,
    budgetMax: number | null | undefined,
  ): void {
    if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
      throw new BadRequestException(
        `budgetMin (${budgetMin}) cannot be greater than budgetMax (${budgetMax}). Swap them, or clear one.`,
      );
    }
  }

  // Mirrors the property_requirements_matched_has_property check constraint
  private assertMatchedHasProperty(
    requirementStatus: RequirementStatus | null | undefined,
    matchedPropertyId: string | null,
  ): void {
    if (requirementStatus === RequirementStatus.MATCHED && !matchedPropertyId) {
      throw new BadRequestException(
        'A requirement becomes matched only by choosing a property. Use "Choose property" from its matches instead.',
      );
    }
  }

  // Areas narrow a city, so they need one; already linked areas may stay if deactivated since
  private async assertPreferredAreas(
    companyId: string,
    preferredCityId: string | null,
    preferredAreaIds: readonly string[],
    keptIds: readonly string[] = [],
  ): Promise<void> {
    if (preferredAreaIds.length === 0) {
      return;
    }

    if (!preferredCityId) {
      throw new BadRequestException(
        'Preferred areas need a preferred city. Pick the city first, or clear the areas.',
      );
    }

    await this.areasService.assertAllInCity({
      companyId,
      cityId: preferredCityId,
      areaIds: preferredAreaIds,
      keptIds,
    });
  }
}
