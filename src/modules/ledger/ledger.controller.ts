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
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto.js';
import { GenerateMonthlyRentResponseDto } from './dto/generate-monthly-rent-response.dto.js';
import { LedgerEntryResponseDto } from './dto/ledger-entry-response.dto.js';
import { QueryLedgerDto } from './dto/query-ledger.dto.js';
import { LedgerService } from './ledger.service.js';

// Company-scoped routes here are client_admin only; generate-monthly-rent overrides to super_admin
@ApiTags('Ledger')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'ledger', version: '1' })
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post()
  @ResponseMessage('Ledger entry created successfully')
  @ApiOperation({ summary: 'Post a manual charge/credit to a lease\'s ledger' })
  create(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLedgerEntryDto,
  ): Promise<LedgerEntryResponseDto> {
    return this.ledgerService.create(companyId, userId, dto);
  }

  @Get()
  @ResponseMessage('Ledger entries retrieved successfully')
  @ApiOperation({
    summary: 'List ledger entries (charges + payments), paginated and searchable',
    description:
      'Newest first by default, with a running balance per lease. Filter with leaseId; search matches property and tenant name.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryLedgerDto,
  ): Promise<IPaginatedResult<LedgerEntryResponseDto>> {
    return this.ledgerService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('Ledger entry retrieved successfully')
  @ApiOperation({ summary: 'Get a single ledger entry by id' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<LedgerEntryResponseDto> {
    return this.ledgerService.findOne(companyId, params.id);
  }

  @Patch('charges/:id/restore')
  @ResponseMessage('Charge reactivated successfully')
  @ApiOperation({ summary: 'Set a charge (bill) status back to active' })
  restoreCharge(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Param() params: UuidParamDto,
  ): Promise<LedgerEntryResponseDto> {
    return this.ledgerService.restoreCharge(companyId, userId, params.id);
  }

  // 200, not 204 — a 204 carries no body, so the envelope would never arrive
  @Delete('charges/:id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Charge deleted successfully')
  @ApiOperation({
    summary: 'Deactivate a charge (bill)',
    description:
      'Sets status to false. The row is kept and stays visible in the ledger, but is excluded from running-balance calculations.',
  })
  removeCharge(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Param() params: UuidParamDto,
  ): Promise<LedgerEntryResponseDto> {
    return this.ledgerService.removeCharge(companyId, userId, params.id);
  }

  // super_admin only — overrides the class-level restriction, since this run spans every company
  @Post('generate-monthly-rent')
  @Roles(UserRole.SUPER_ADMIN)
  @ResponseMessage('Monthly rent charges generated successfully')
  @ApiOperation({
    summary:
      'Generate this month\'s rent charge for every active lease across all companies that is missing one (super_admin only)',
  })
  generateMonthlyRent(
    @CurrentUser('id') userId: string,
  ): Promise<GenerateMonthlyRentResponseDto> {
    return this.ledgerService.generateMonthlyRent(userId);
  }
}
