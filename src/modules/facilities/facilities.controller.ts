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
import { CreateFacilityDto } from './dto/create-facility.dto.js';
import { FacilityResponseDto } from './dto/facility-response.dto.js';
import { QueryFacilitiesDto } from './dto/query-facilities.dto.js';
import { UpdateFacilityDto } from './dto/update-facility.dto.js';
import { FacilitiesService } from './facilities.service.js';

// Dealer routes — every query is scoped to the caller's company
@ApiTags('Facilities')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'facilities', version: '1' })
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  @ResponseMessage('Facility created successfully')
  @ApiOperation({ summary: 'Add a custom facility (client_admin only)' })
  create(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateFacilityDto,
  ): Promise<FacilityResponseDto> {
    return this.facilitiesService.create(companyId, dto);
  }

  @Get()
  @ResponseMessage('Facilities retrieved successfully')
  @ApiOperation({
    summary: "List the company's facilities (client_admin only)",
    description: 'Newest first by default. Filter with status; search matches name.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryFacilitiesDto,
  ): Promise<IPaginatedResult<FacilityResponseDto>> {
    return this.facilitiesService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('Facility retrieved successfully')
  @ApiOperation({ summary: 'Get a facility by id (client_admin only)' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<FacilityResponseDto> {
    return this.facilitiesService.findOne(companyId, params.id);
  }

  @Patch(':id')
  @ResponseMessage('Facility updated successfully')
  @ApiOperation({
    summary: 'Update a facility (client_admin only)',
  })
  update(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Body() dto: UpdateFacilityDto,
  ): Promise<FacilityResponseDto> {
    return this.facilitiesService.update(companyId, params.id, dto);
  }

  @Patch(':id/restore')
  @ResponseMessage('Facility reactivated successfully')
  @ApiOperation({ summary: 'Set status back to active (client_admin only)' })
  restore(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<FacilityResponseDto> {
    return this.facilitiesService.restore(companyId, params.id);
  }

  // 200, not 204 — a 204 carries no body, so the envelope would never arrive
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Facility deleted successfully')
  @ApiOperation({
    summary: 'Delete a facility (client_admin only)',
    description: 'Sets status to false.',
  })
  remove(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<FacilityResponseDto> {
    return this.facilitiesService.remove(companyId, params.id);
  }
}
