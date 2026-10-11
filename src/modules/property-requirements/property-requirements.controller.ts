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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { UuidParamDto } from '../../common/dto/uuid-param.dto.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { PropertyResponseDto } from '../properties/dto/property-response.dto.js';
import { CreatePropertyRequirementDto } from './dto/create-property-requirement.dto.js';
import { MatchPropertyRequirementDto } from './dto/match-property-requirement.dto.js';
import { PropertyRequirementResponseDto } from './dto/property-requirement-response.dto.js';
import { QueryPropertyRequirementsDto } from './dto/query-property-requirements.dto.js';
import { UpdatePropertyRequirementDto } from './dto/update-property-requirement.dto.js';
import { PropertyRequirementsService } from './property-requirements.service.js';

// Dealer routes — every query is scoped to the caller's company
@ApiTags('Property requirements')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'property-requirements', version: '1' })
export class PropertyRequirementsController {
  constructor(
    private readonly propertyRequirementsService: PropertyRequirementsService,
  ) {}

  @Post()
  @ResponseMessage('Requirement created successfully')
  @ApiOperation({ summary: "Record a seeker's requirement (client_admin only)" })
  create(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreatePropertyRequirementDto,
  ): Promise<PropertyRequirementResponseDto> {
    return this.propertyRequirementsService.create(companyId, dto);
  }

  @Get()
  @ResponseMessage('Requirements retrieved successfully')
  @ApiOperation({
    summary: 'List requirements, paginated and searchable (client_admin only)',
    description:
      'Newest first by default. Filter with contact, type, purpose, requirement status and status; search matches seeker name and phone, preferred city and area, and notes.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryPropertyRequirementsDto,
  ): Promise<IPaginatedResult<PropertyRequirementResponseDto>> {
    return this.propertyRequirementsService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('Requirement retrieved successfully')
  @ApiOperation({ summary: 'Get a requirement by id (client_admin only)' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyRequirementResponseDto> {
    return this.propertyRequirementsService.findOne(companyId, params.id);
  }

  @Get(':id/matches')
  @ResponseMessage('Matching properties retrieved successfully')
  @ApiOperation({
    summary: 'Properties that fit this requirement (client_admin only)',
    description:
      'Active, available listings: buy matches sale and rent matches rent, plus type, budget, city, area and every requested facility when set.',
  })
  findMatches(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Query() query: PaginationQueryDto,
  ): Promise<IPaginatedResult<PropertyResponseDto>> {
    return this.propertyRequirementsService.findMatches(companyId, params.id, query);
  }

  @Patch(':id')
  @ResponseMessage('Requirement updated successfully')
  @ApiOperation({
    summary: 'Update a requirement (client_admin only)',
    description: 'Also used to mark it open, matched or closed.',
  })
  update(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Body() dto: UpdatePropertyRequirementDto,
  ): Promise<PropertyRequirementResponseDto> {
    return this.propertyRequirementsService.update(companyId, params.id, dto);
  }

  @Patch(':id/match')
  @ResponseMessage('Property chosen for requirement successfully')
  @ApiOperation({
    summary: 'Choose a matching property for this requirement (client_admin only)',
    description:
      'Marks the property sold (buy) or rented (rent), sets the requirement to matched and links the two. Both rows change together or not at all.',
  })
  match(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Body() dto: MatchPropertyRequirementDto,
  ): Promise<PropertyRequirementResponseDto> {
    return this.propertyRequirementsService.match(companyId, params.id, dto);
  }

  @Patch(':id/restore')
  @ResponseMessage('Requirement reactivated successfully')
  @ApiOperation({ summary: 'Set status back to active (client_admin only)' })
  restore(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyRequirementResponseDto> {
    return this.propertyRequirementsService.restore(companyId, params.id);
  }

  // 200, not 204 — a 204 carries no body, so the envelope would never arrive
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Requirement deleted successfully')
  @ApiOperation({
    summary: 'Delete a requirement (client_admin only)',
    description: 'Sets status to false. The row is kept for audit purposes.',
  })
  remove(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PropertyRequirementResponseDto> {
    return this.propertyRequirementsService.remove(companyId, params.id);
  }
}
