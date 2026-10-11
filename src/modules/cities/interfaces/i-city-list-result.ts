import type { ICityRow } from '../../../database/interfaces/i-city-row.js';

export interface ICityListResult {
  items: ICityRow[];
  totalItems: number;
}
