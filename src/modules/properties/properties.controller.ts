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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UuidParamDto } from '../../common/dto/uuid-param.dto.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { PropertyResponseDto } from './dto/property-response.dto.js';
import { QueryPropertiesDto } from './dto/query-properties.dto.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';
import { PropertiesService } from './properties.service.js';

// Dealer routes — every query is scoped to the caller's company
@ApiTags('Properties')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'properties', version: '1' })
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @ResponseMessage('Property created successfully')
  @ApiOperation({ summary: 'List a property for sale or rent (client_admin only)' })
  create(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePropertyDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.create(companyId, userId, dto);
  }

  @Get()
  @ResponseMessage('Properties retrieved successfully')
  @ApiOperation({
    summary: 'List properties, paginated and searchable (client_admin only)',
    description:
      'Newest first by default. Filter with purpose, type, property status, owner, city, area, price range, facilities and status; search matches title, city, area and address.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryPropertiesDto,
  ): Promise<IPaginatedResult<PropertyResponseDto>> {
    return this.propertiesService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('Property retrieved successfully')
  @ApiOperation({ summary: 'Get a property by id (client_admin only)' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.findOne(companyId, params.id);
  }

  @Patch(':id')
  @ResponseMessage('Property updated successfully')
  @ApiOperation({
    summary: 'Update a property (client_admin only)',
    description: 'Also used to mark a listing sold, rented or available again.',
  })
  update(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Body() dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.update(companyId, params.id, dto);
  }

  @Patch(':id/restore')
  @ResponseMessage('Property reactivated successfully')
  @ApiOperation({ summary: 'Set status back to active (client_admin only)' })
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
    summary: 'Delete a property (client_admin only)',
    description: 'Sets status to false. The row is kept for audit purposes.',
  })
  remove(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.remove(companyId, params.id);
  }
}
