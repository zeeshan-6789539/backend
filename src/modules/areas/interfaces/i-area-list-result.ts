import type { IAreaWithCityRow } from '../../../database/interfaces/i-area-row.js';

export interface IAreaListResult {
  items: IAreaWithCityRow[];
  totalItems: number;
}
