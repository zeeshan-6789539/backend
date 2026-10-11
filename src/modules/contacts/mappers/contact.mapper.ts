import type { IContactRow } from '../../../database/interfaces/i-contact-row.js';
import type { ContactResponseDto } from '../dto/contact-response.dto.js';

export const toContactResponse = (row: IContactRow): ContactResponseDto => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  cnic: row.cnic,
  address: row.address,
  notes: row.notes,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
