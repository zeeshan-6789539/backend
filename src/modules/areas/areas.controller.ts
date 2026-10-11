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
import { AreasService } from './areas.service.js';
import { AreaResponseDto } from './dto/area-response.dto.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { QueryAreasDto } from './dto/query-areas.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';

// Dealer routes — every query is scoped to the caller's company
@ApiTags('Areas')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'areas', version: '1' })
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @ResponseMessage('Area created successfully')
  @ApiOperation({ summary: 'Add an area to one of your cities (client_admin only)' })
  create(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateAreaDto,
  ): Promise<AreaResponseDto> {
    return this.areasService.create(companyId, dto);
  }

  @Get()
  @ResponseMessage('Areas retrieved successfully')
  @ApiOperation({
    summary: 'List areas, paginated and searchable (client_admin only)',
    description:
      'Newest first by default. Filter with cityId and status; search matches the area and city name.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryAreasDto,
  ): Promise<IPaginatedResult<AreaResponseDto>> {
    return this.areasService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('Area retrieved successfully')
  @ApiOperation({ summary: 'Get an area by id (client_admin only)' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<AreaResponseDto> {
    return this.areasService.findOne(companyId, params.id);
  }

  @Patch(':id')
  @ResponseMessage('Area updated successfully')
  @ApiOperation({
    summary: 'Rename an area, move it to another city or change its status (client_admin only)',
  })
  update(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Body() dto: UpdateAreaDto,
  ): Promise<AreaResponseDto> {
    return this.areasService.update(companyId, params.id, dto);
  }

  @Patch(':id/restore')
  @ResponseMessage('Area reactivated successfully')
  @ApiOperation({ summary: 'Set status back to active (client_admin only)' })
  restore(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<AreaResponseDto> {
    return this.areasService.restore(companyId, params.id);
  }

  // 200, not 204 — a 204 carries no body, so the envelope would never arrive
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Area deleted successfully')
  @ApiOperation({
    summary: 'Delete an area (client_admin only)',
    description: 'Sets status to false. The row is kept for audit purposes.',
  })
  remove(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<AreaResponseDto> {
    return this.areasService.remove(companyId, params.id);
  }
}
