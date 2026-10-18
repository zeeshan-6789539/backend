import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IPaginatedResult } from '../../common/interfaces/i-paginated-result.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { normalizeEmail } from '../../common/utils/string.util.js';
import type { IContactRow } from '../../database/interfaces/i-contact-row.js';
import { ContactsRepository } from './contacts.repository.js';
import type { ContactResponseDto } from './dto/contact-response.dto.js';
import type { CreateContactDto } from './dto/create-contact.dto.js';
import type { QueryContactsDto } from './dto/query-contacts.dto.js';
import type { UpdateContactDto } from './dto/update-contact.dto.js';
import { toContactResponse } from './mappers/contact.mapper.js';

@Injectable()
export class ContactsService {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  async create(
    companyId: string,
    dto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    await this.assertPhoneIsAvailable(companyId, dto.phone);

    const row = await this.contactsRepository.create({
      companyId,
      name: dto.name.trim(),
      phone: dto.phone,
      email: dto.email ? normalizeEmail(dto.email) : null,
      cnic: dto.cnic ?? null,
      address: dto.address ?? null,
      notes: dto.notes ?? null,
      isActive: dto.status,
    });

    return toContactResponse(row);
  }

  async findAll(
    companyId: string,
    query: QueryContactsDto,
  ): Promise<IPaginatedResult<ContactResponseDto>> {
    const { items, totalItems } = await this.contactsRepository.findMany({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResult(
      items.map(toContactResponse),
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findOne(companyId: string, id: string): Promise<ContactResponseDto> {
    return toContactResponse(await this.findRowOrFail(companyId, id));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    await this.findRowOrFail(companyId, id);

    if (dto.phone) {
      await this.assertPhoneIsAvailable(companyId, dto.phone, id);
    }

    // undefined leaves a column alone; null clears an optional one
    const row = await this.contactsRepository.update(companyId, id, {
      name: dto.name?.trim(),
      phone: dto.phone ?? undefined,
      email: dto.email ? normalizeEmail(dto.email) : dto.email,
      cnic: dto.cnic,
      address: dto.address,
      notes: dto.notes,
      isActive: dto.status ?? undefined,
      updatedAt: new Date(),
    });

    if (!row) {
      throw new NotFoundException(
        `No contact was found with id ${id} — it may have been removed while you were editing it`,
      );
    }

    return toContactResponse(row);
  }

  // Deleting a contact deactivates it: status goes false, the row is kept
  async remove(companyId: string, id: string): Promise<ContactResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (!current.isActive) {
      throw new ConflictException(`Contact "${current.name}" is already deactivated`);
    }

    return this.setStatusOrFail(companyId, id, false);
  }

  async restore(companyId: string, id: string): Promise<ContactResponseDto> {
    const current = await this.findRowOrFail(companyId, id);

    if (current.isActive) {
      throw new ConflictException(`Contact "${current.name}" is already active`);
    }

    return this.setStatusOrFail(companyId, id, true);
  }

  async findRowOrFail(companyId: string, id: string): Promise<IContactRow> {
    const row = await this.contactsRepository.findById(companyId, id);

    if (!row) {
      throw new NotFoundException(`No contact was found with id ${id}`);
    }

    return row;
  }

  // Used by properties and requirements before linking a contact to a record
  async assertUsable(companyId: string, id: string): Promise<IContactRow> {
    const row = await this.contactsRepository.findById(companyId, id);

    if (!row) {
      throw new BadRequestException(
        `No contact was found with id ${id}. Pick one from your contacts list, or add them first.`,
      );
    }

    if (!row.isActive) {
      throw new BadRequestException(
        `Contact "${row.name}" is deactivated. Reactivate them first, or pick another contact.`,
      );
    }

    return row;
  }

  private async setStatusOrFail(
    companyId: string,
    id: string,
    status: boolean,
  ): Promise<ContactResponseDto> {
    const row = await this.contactsRepository.setStatus(companyId, id, status);

    if (!row) {
      throw new NotFoundException(`No contact was found with id ${id}`);
    }

    return toContactResponse(row);
  }

  // Friendly pre-check; the unique index stays the authority
  private async assertPhoneIsAvailable(
    companyId: string,
    phone: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.contactsRepository.findByPhone(
      companyId,
      phone,
      excludeId,
    );

    if (existing) {
      throw new ConflictException(
        `Phone ${phone} already belongs to your contact "${existing.name}". Open that contact instead of adding a duplicate.`,
      );
    }
  }
}
