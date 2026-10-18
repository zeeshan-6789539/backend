import type { CompanyResponseDto } from '../dto/company-response.dto.js';
import type { ICompanyWithCounts } from '../interfaces/i-company-with-counts.js';

// Keeps the API shape decoupled from the table, as user.mapper does for users
export const toCompanyResponse = (
  row: ICompanyWithCounts,
): CompanyResponseDto => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  address: row.address,
  city: row.city,
  status: row.isActive,
  invoiceMailSend: row.invoiceMailSend,
  voiceAssistantEnabled: row.voiceAssistantEnabled,
  hasMailPassword: row.mailPassword !== null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  propertyCount: row.propertyCount,
  tenantCount: row.tenantCount,
});
