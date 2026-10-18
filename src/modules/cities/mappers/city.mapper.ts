import type { ICityRow } from '../../../database/interfaces/i-city-row.js';
import type { CityResponseDto } from '../dto/city-response.dto.js';

export const toCityResponse = (row: ICityRow, areaCount: number): CityResponseDto => ({
  id: row.id,
  name: row.name,
  areaCount,
  status: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
