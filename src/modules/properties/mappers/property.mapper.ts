import type { PropertyResponseDto } from '../dto/property-response.dto.js';
import type { IPropertyDetailRow } from '../interfaces/i-property-detail-row.js';

// companyId and createdBy are internal, so they stay out of the API shape
export const toPropertyResponse = (row: IPropertyDetailRow): PropertyResponseDto => ({
  id: row.id,
  propertyTypeId: row.propertyTypeId,
  propertyTypeName: row.propertyTypeName,
  ownerContactId: row.ownerContactId,
  ownerName: row.ownerName,
  ownerPhone: row.ownerPhone,
  title: row.title,
  description: row.description,
  purpose: row.purpose,
  price: row.price,
  securityDeposit: row.securityDeposit,
  areaSqft: row.areaSqft,
  facilities: row.facilityList,
  floor: row.floor,
  cityId: row.cityId,
  city: row.cityName,
  areaId: row.areaId,
  areaName: row.areaName,
  address: row.address,
  propertyStatus: row.propertyStatus,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
