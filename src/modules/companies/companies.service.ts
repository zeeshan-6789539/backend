import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { normalizeEmail } from '../../common/utils/string.util.js';
import type { ICompanyRow } from '../../database/interfaces/i-company-row.js';
import { FacilitiesService } from '../facilities/facilities.service.js';
import { PropertyTypesService } from '../property-types/property-types.service.js';
import { UsersService } from '../users/users.service.js';
import { CompaniesRepository } from './companies.repository.js';
import type { CompanyResponseDto } from './dto/company-response.dto.js';
import type { CreateCompanyDto } from './dto/create-company.dto.js';
import type { QueryCompaniesDto } from './dto/query-companies.dto.js';
import type { UpdateCompanyDto } from './dto/update-company.dto.js';
import { toCompanyResponse } from './mappers/company.mapper.js';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly usersService: UsersService,
    private readonly propertyTypesService: PropertyTypesService,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  async create(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    // One transaction, so a company never exists without its starter catalogue
    const row = await this.companiesRepository.transaction(async (tx) => {
      const company = await this.companiesRepository.create(
        {
          name: dto.name.trim(),
          email: dto.email ? normalizeEmail(dto.email) : undefined,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          isActive: dto.status,
          voiceAssistantEnabled: dto.voiceAssistantEnabled,
        },
        tx,
      );

      await this.propertyTypesService.seedDefaults(company.id, tx);
      await this.facilitiesService.seedDefaults(company.id, tx);

      return company;
    });

    return toCompanyResponse(row);
  }

  async findAll(
    query: QueryCompaniesDto,
  ): Promise<IPaginatedResult<CompanyResponseDto>> {
    const { items, totalItems } = await this.companiesRepository.findMany({
      page: query.page,
      limit: query.limit,
      search: query.search,
      city: query.city,
      status: query.status,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toCompanyResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string): Promise<CompanyResponseDto> {
    return toCompanyResponse(await this.findRowOrFail(id));
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyResponseDto> {
    await this.findRowOrFail(id);

    // Drizzle skips undefined keys, so unset DTO fields leave the column alone
    const row = await this.companiesRepository.update(id, {
      name: dto.name?.trim(),
      email: dto.email ? normalizeEmail(dto.email) : undefined,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      isActive: dto.status,
      voiceAssistantEnabled: dto.voiceAssistantEnabled,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No company was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return toCompanyResponse(row);
  }

  // Deleting a company deactivates it: status goes false, the row is kept
  async remove(id: string): Promise<CompanyResponseDto> {
    const current = await this.findRowOrFail(id);

    if (!current.isActive) {
      throw new ConflictException(
        `Company "${current.name}" is already deactivated`,
      );
    }

    await this.assertHasNoActiveUsers(current);

    const row = await this.companiesRepository.setStatus(id, false);

    if (!row) {
      throw new NotFoundException(`No company was found with id ${id}`);
    }

    return toCompanyResponse(row);
  }

  async restore(id: string): Promise<CompanyResponseDto> {
    const current = await this.findRowOrFail(id);

    if (current.isActive) {
      throw new ConflictException(
        `Company "${current.name}" is already active`,
      );
    }

    const row = await this.companiesRepository.setStatus(id, true);

    if (!row) {
      throw new NotFoundException(`No company was found with id ${id}`);
    }

    return toCompanyResponse(row);
  }

  async findRowOrFail(id: string): Promise<ICompanyRow> {
    const row = await this.companiesRepository.findById(id);

    if (!row) {
      throw new NotFoundException(`No company was found with id ${id}`);
    }

    return row;
  }

  // users.company_id is ON DELETE RESTRICT, so a live company must stay reachable
  private async assertHasNoActiveUsers(company: ICompanyRow): Promise<void> {
    const activeUsers = await this.usersService.countActiveByCompany(
      company.id,
    );

    if (activeUsers > 0) {
      throw new ConflictException(
        `Company "${company.name}" still has ${activeUsers} active user(s). Deactivate them first, then retry.`,
      );
    }
  }
}
