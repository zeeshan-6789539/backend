import type { PropertyListResponseDto } from '../dto/property-list-response.dto.js';
import type { PropertyResponseDto } from '../dto/property-response.dto.js';
import type { IPropertyListRow } from '../interfaces/i-property-list-row.js';
import type { IPropertyWithType } from '../interfaces/i-property-with-type.js';

export const toPropertyResponse = (
  row: IPropertyWithType,
): PropertyResponseDto => ({
  id: row.id,
  companyId: row.companyId,
  propertyNumber: row.propertyNumber,
  name: row.name,
  addressLine1: row.addressLine1,
  city: row.city,
  propertyTypeId: row.propertyTypeId,
  propertyTypeName: row.propertyTypeName,
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
  propertyTypeId: row.propertyTypeId,
  propertyTypeName: row.propertyTypeName,
  rentDueDay: row.rentDueDay,
  status: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  tenants: row.tenants,
});
