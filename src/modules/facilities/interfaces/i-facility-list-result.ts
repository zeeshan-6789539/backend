import type { IFacilityRow } from '../../../database/interfaces/i-facility-row.js';

export interface IFacilityListResult {
  items: IFacilityRow[];
  totalItems: number;
}
