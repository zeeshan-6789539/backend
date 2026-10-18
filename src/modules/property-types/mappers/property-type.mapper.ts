import type { IPropertyTypeRow } from '../../../database/interfaces/i-property-type-row.js';
import type { PropertyTypeResponseDto } from '../dto/property-type-response.dto.js';

export const toPropertyTypeResponse = (
  row: IPropertyTypeRow,
): PropertyTypeResponseDto => ({
  id: row.id,
  companyId: row.companyId,
  name: row.name,
  status: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
