import type { IPropertyTypeRow } from '../../../database/interfaces/i-property-type-row.js';
import type { PropertyTypeResponseDto } from '../dto/property-type-response.dto.js';

export const toPropertyTypeResponse = (
  row: IPropertyTypeRow,
): PropertyTypeResponseDto => ({
  id: row.id,
  name: row.name,
  isBuiltIn: row.companyId === null,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
