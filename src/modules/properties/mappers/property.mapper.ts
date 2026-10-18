import type { IPropertyRow } from '../../../database/interfaces/i-property-row.js';
import type { PropertyListResponseDto } from '../dto/property-list-response.dto.js';
import type { PropertyResponseDto } from '../dto/property-response.dto.js';
import type { IPropertyListRow } from '../interfaces/i-property-list-row.js';

export const toPropertyResponse = (row: IPropertyRow): PropertyResponseDto => ({
  id: row.id,
  companyId: row.companyId,
  propertyNumber: row.propertyNumber,
  name: row.name,
  addressLine1: row.addressLine1,
  city: row.city,
  propertyType: row.propertyType,
  rentDueDay: row.rentDueDay,
  status: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toPropertyListResponse = (
  row: IPropertyListRow,
): PropertyListResponseDto => ({
  id: row.id,
  companyId: row.companyId,
  propertyNumber: row.propertyNumber,
  name: row.name,
  addressLine1: row.addressLine1,
  city: row.city,
  propertyType: row.propertyType,
  rentDueDay: row.rentDueDay,
  status: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  tenants: row.tenants,
});
