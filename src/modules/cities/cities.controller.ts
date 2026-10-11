import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentCompanyId } from '../../common/decorators/current-company-id.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UuidParamDto } from '../../common/dto/uuid-param.dto.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { CitiesService } from './cities.service.js';
import { CityResponseDto } from './dto/city-response.dto.js';
import { CreateCityDto } from './dto/create-city.dto.js';
import { QueryCitiesDto } from './dto/query-cities.dto.js';
import { UpdateCityDto } from './dto/update-city.dto.js';

// Dealer routes — every query is scoped to the caller's company
@ApiTags('Cities')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'cities', version: '1' })
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Post()
  @ResponseMessage('City created successfully')
  @ApiOperation({ summary: 'Add a city (client_admin only)' })
  create(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateCityDto,
  ): Promise<CityResponseDto> {
    return this.citiesService.create(companyId, dto);
  }

  @Get()
  @ResponseMessage('Cities retrieved successfully')
  @ApiOperation({
    summary: 'List cities, paginated and searchable (client_admin only)',
    description:
      'Newest first by default. Filter with status; search matches the name. Each city carries its active area count.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryCitiesDto,
  ): Promise<IPaginatedResult<CityResponseDto>> {
    return this.citiesService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('City retrieved successfully')
  @ApiOperation({ summary: 'Get a city by id (client_admin only)' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<CityResponseDto> {
    return this.citiesService.findOne(companyId, params.id);
  }

  @Patch(':id')
  @ResponseMessage('City updated successfully')
  @ApiOperation({ summary: 'Rename or change the status of a city (client_admin only)' })
  update(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Body() dto: UpdateCityDto,
  ): Promise<CityResponseDto> {
    return this.citiesService.update(companyId, params.id, dto);
  }

  @Patch(':id/restore')
  @ResponseMessage('City reactivated successfully')
  @ApiOperation({ summary: 'Set status back to active (client_admin only)' })
  restore(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<CityResponseDto> {
    return this.citiesService.restore(companyId, params.id);
  }

  // 200, not 204 — a 204 carries no body, so the envelope would never arrive
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('City deleted successfully')
  @ApiOperation({
    summary: 'Delete a city (client_admin only)',
    description:
      'Sets status to false. Refused while the city still has active areas. The row is kept for audit purposes.',
  })
  remove(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<CityResponseDto> {
    return this.citiesService.remove(companyId, params.id);
  }
}
