import type { IFacilityRow } from '../../../database/interfaces/i-facility-row.js';
import type { FacilityResponseDto } from '../dto/facility-response.dto.js';

export const toFacilityResponse = (
  row: IFacilityRow,
): FacilityResponseDto => ({
  id: row.id,
  name: row.name,
  status: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
