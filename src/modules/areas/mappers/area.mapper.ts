import type { IAreaWithCityRow } from '../../../database/interfaces/i-area-row.js';
import type { AreaResponseDto } from '../dto/area-response.dto.js';

export const toAreaResponse = (row: IAreaWithCityRow): AreaResponseDto => ({
  id: row.id,
  cityId: row.cityId,
  cityName: row.cityName,
  name: row.name,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
