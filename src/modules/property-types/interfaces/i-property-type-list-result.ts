import type { IPropertyTypeRow } from '../../../database/interfaces/i-property-type-row.js';

export interface IPropertyTypeListResult {
  items: IPropertyTypeRow[];
  totalItems: number;
}
