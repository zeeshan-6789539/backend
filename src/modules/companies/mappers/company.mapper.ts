import type { ICompanyRow } from '../../../database/interfaces/i-company-row.js';
import type { CompanyResponseDto } from '../dto/company-response.dto.js';

// Keeps the API shape decoupled from the table, as user.mapper does for users
export const toCompanyResponse = (row: ICompanyRow): CompanyResponseDto => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  address: row.address,
  city: row.city,
  status: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
