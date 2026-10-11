import type { PropertyRequirementResponseDto } from '../dto/property-requirement-response.dto.js';
import type { IPropertyRequirementDetailRow } from '../interfaces/i-property-requirement-detail-row.js';

export const toPropertyRequirementResponse = (
  row: IPropertyRequirementDetailRow,
): PropertyRequirementResponseDto => ({
  id: row.id,
  contactId: row.contactId,
  contactName: row.contactName,
  contactPhone: row.contactPhone,
  propertyTypeId: row.propertyTypeId,
  propertyTypeName: row.propertyTypeName,
  purpose: row.purpose,
  budgetMin: row.budgetMin,
  budgetMax: row.budgetMax,
  preferredCityId: row.preferredCityId,
  preferredCity: row.preferredCityName,
  preferredAreas: row.preferredAreaList,
  facilities: row.facilityList,
  notes: row.notes,
  requirementStatus: row.requirementStatus,
  matchedPropertyId: row.matchedPropertyId,
  matchedPropertyTitle: row.matchedPropertyTitle,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
