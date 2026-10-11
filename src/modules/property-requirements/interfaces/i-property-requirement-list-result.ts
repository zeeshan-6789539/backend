import type { IPropertyRequirementDetailRow } from './i-property-requirement-detail-row.js';

export interface IPropertyRequirementListResult {
  items: IPropertyRequirementDetailRow[];
  totalItems: number;
}
