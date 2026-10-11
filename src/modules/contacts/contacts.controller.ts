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
import { ContactsService } from './contacts.service.js';
import { ContactResponseDto } from './dto/contact-response.dto.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { QueryContactsDto } from './dto/query-contacts.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

// Dealer routes — every query is scoped to the caller's company
@ApiTags('Contacts')
@ApiBearerAuth()
@Roles(UserRole.CLIENT_ADMIN)
@Controller({ path: 'contacts', version: '1' })
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ResponseMessage('Contact created successfully')
  @ApiOperation({ summary: 'Add an owner or seeker contact (client_admin only)' })
  create(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    return this.contactsService.create(companyId, dto);
  }

  @Get()
  @ResponseMessage('Contacts retrieved successfully')
  @ApiOperation({
    summary: 'List contacts, paginated and searchable (client_admin only)',
    description:
      'Newest first by default. Filter with status; search matches name, phone, CNIC and email.',
  })
  findAll(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryContactsDto,
  ): Promise<IPaginatedResult<ContactResponseDto>> {
    return this.contactsService.findAll(companyId, query);
  }

  @Get(':id')
  @ResponseMessage('Contact retrieved successfully')
  @ApiOperation({ summary: 'Get a contact by id (client_admin only)' })
  findOne(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<ContactResponseDto> {
    return this.contactsService.findOne(companyId, params.id);
  }

  @Patch(':id')
  @ResponseMessage('Contact updated successfully')
  @ApiOperation({ summary: 'Update a contact (client_admin only)' })
  update(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
    @Body() dto: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    return this.contactsService.update(companyId, params.id, dto);
  }

  @Patch(':id/restore')
  @ResponseMessage('Contact reactivated successfully')
  @ApiOperation({ summary: 'Set status back to active (client_admin only)' })
  restore(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<ContactResponseDto> {
    return this.contactsService.restore(companyId, params.id);
  }

  // 200, not 204 — a 204 carries no body, so the envelope would never arrive
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Contact deleted successfully')
  @ApiOperation({
    summary: 'Delete a contact (client_admin only)',
    description: 'Sets status to false. The row is kept for audit purposes.',
  })
  remove(
    @CurrentCompanyId() companyId: string,
    @Param() params: UuidParamDto,
  ): Promise<ContactResponseDto> {
    return this.contactsService.remove(companyId, params.id);
  }
}
