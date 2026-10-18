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
import { CreatePropertyTypeDto } from './dto/create-property-type.dto.js';
import { PropertyTypeResponseDto } from './dto/property-type-response.dto.js';
import { QueryPropertyTypesDto } from './dto/query-property-types.dto.js';
import { UpdatePropertyTypeDto } from './dto/update-property-type.dto.js';
import { PropertyTypesService } from './property-types.service.js';

// Dealer routes — every query is scoped to the caller's company
@ApiTags('Property types')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'property-types', version: '1' })
export class PropertyTypesController {
  constructor(private readonly propertyTypesService: PropertyTypesService) {}

  @Post()
  @ResponseMessage('Property type created successfully')
  @ApiOperation({ summary: 'Add a custom property type (client_admin only)' })
  create(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreatePropertyTypeDto,
  ): Promise<PropertyTypeResponseDto> {
    return this.propertyTypesService.create(companyId, dto);
  }

  @Get()
  @ResponseMessage('Property types retrieved successfully')
  @ApiOperation({
    summary: "List the company's property types (client_admin only)",
    description: 'Newest first by default. Filter with status; search matches name.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryPropertyTypesDto,
  ): Promise<IPaginatedResult<PropertyTypeResponseDto>> {
    return this.propertyTypesService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('Property type retrieved successfully')
  @ApiOperation({ summary: 'Get a property type by id (client_admin only)' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyTypeResponseDto> {
    return this.propertyTypesService.findOne(companyId, params.id);
  }

  @Patch(':id')
  @ResponseMessage('Property type updated successfully')
  @ApiOperation({
    summary: 'Update a property type (client_admin only)',
  })
  update(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Body() dto: UpdatePropertyTypeDto,
  ): Promise<PropertyTypeResponseDto> {
    return this.propertyTypesService.update(companyId, params.id, dto);
  }

  @Patch(':id/restore')
  @ResponseMessage('Property type reactivated successfully')
  @ApiOperation({ summary: 'Set status back to active (client_admin only)' })
  restore(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyTypeResponseDto> {
    return this.propertyTypesService.restore(companyId, params.id);
  }

  // 200, not 204 — a 204 carries no body, so the envelope would never arrive
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Property type deleted successfully')
  @ApiOperation({
    summary: 'Delete a property type (client_admin only)',
    description: 'Sets status to false.',
  })
  remove(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyTypeResponseDto> {
    return this.propertyTypesService.remove(companyId, params.id);
  }
}
