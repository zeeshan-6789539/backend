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
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentResponseDto } from './dto/payment-response.dto.js';
import { QueryPaymentsDto } from './dto/query-payments.dto.js';
import { PaymentsService } from './payments.service.js';

// Every route here is client_admin only — payments are scoped to the caller's company
@ApiTags('Payments')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ResponseMessage('Payment recorded successfully')
  @ApiOperation({ summary: 'Record a payment against a lease' })
  create(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.create(companyId, userId, dto);
  }

  @Get()
  @ResponseMessage('Payments retrieved successfully')
  @ApiOperation({
    summary: 'List payments, paginated and searchable',
    description:
      'Newest first by default. Filter with leaseId; search matches property and tenant name.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryPaymentsDto,
  ): Promise<IPaginatedResult<PaymentResponseDto>> {
    return this.paymentsService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('Payment retrieved successfully')
  @ApiOperation({ summary: 'Get a payment by id' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.findOne(companyId, params.id);
  }

  @Patch(':id/restore')
  @ResponseMessage('Payment reactivated successfully')
  @ApiOperation({ summary: 'Set status back to active' })
  restore(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Param() params: UuidParamDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.restore(companyId, userId, params.id);
  }

  // 200, not 204 — a 204 carries no body, so the envelope would never arrive
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Payment deleted successfully')
  @ApiOperation({
    summary: 'Deactivate a payment',
    description:
      'Sets status to false. The row is kept and stays visible in the ledger, but is excluded from running-balance calculations.',
  })
  remove(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Param() params: UuidParamDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.remove(companyId, userId, params.id);
  }
}
