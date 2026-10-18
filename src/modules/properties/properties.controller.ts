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
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { PropertyListResponseDto } from './dto/property-list-response.dto.js';
import { PropertyResponseDto } from './dto/property-response.dto.js';
import { QueryPropertiesDto } from './dto/query-properties.dto.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';
import { PropertiesService } from './properties.service.js';

// Every route here is client_admin only — properties are scoped to the caller's company
@ApiTags('Properties')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'properties', version: '1' })
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @ResponseMessage('Property created successfully')
  @ApiOperation({ summary: 'Create a property' })
  create(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreatePropertyDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.create(companyId, dto);
  }

  @Get()
  @ResponseMessage('Properties retrieved successfully')
  @ApiOperation({
    summary: 'List properties, paginated and searchable',
    description:
      'Newest first by default. Filter with city, propertyTypeId and status; search matches number, name, city and type name.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryPropertiesDto,
  ): Promise<IPaginatedResult<PropertyListResponseDto>> {
    return this.propertiesService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('Property retrieved successfully')
  @ApiOperation({ summary: 'Get a property by id' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.findOne(companyId, params.id);
  }

  @Patch(':id')
  @ResponseMessage('Property updated successfully')
  @ApiOperation({ summary: 'Update a property' })
  update(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Body() dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.update(companyId, params.id, dto);
  }

  @Patch(':id/restore')
  @ResponseMessage('Property reactivated successfully')
  @ApiOperation({ summary: 'Set status back to active' })
  restore(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.restore(companyId, params.id);
  }

  // 200, not 204 — a 204 carries no body, so the envelope would never arrive
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Property deleted successfully')
  @ApiOperation({
    summary: 'Delete a property',
    description: 'Sets status to false. The row is kept for audit purposes.',
  })
  remove(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.remove(companyId, params.id);
  }
}
