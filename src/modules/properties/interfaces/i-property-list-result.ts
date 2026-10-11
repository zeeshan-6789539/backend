import type { IPropertyDetailRow } from './i-property-detail-row.js';

export interface IPropertyListResult {
  items: IPropertyDetailRow[];
  totalItems: number;
}
