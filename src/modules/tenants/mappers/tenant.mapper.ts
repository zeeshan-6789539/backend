import type { ITenantRow } from '../../../database/interfaces/i-tenant-row.js';
import type { TenantListResponseDto } from '../dto/tenant-list-response.dto.js';
import type { TenantResponseDto } from '../dto/tenant-response.dto.js';
import type { ITenantListRow } from '../interfaces/i-tenant-list-row.js';

export const toTenantResponse = (row: ITenantRow): TenantResponseDto => ({
  id: row.id,
  companyId: row.companyId,
  name: row.name,
  email: row.email,
  phone: row.phone,
  status: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toTenantListResponse = (row: ITenantListRow): TenantListResponseDto => ({
  id: row.id,
  companyId: row.companyId,
  name: row.name,
  email: row.email,
  phone: row.phone,
  status: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  properties: row.properties,
});
