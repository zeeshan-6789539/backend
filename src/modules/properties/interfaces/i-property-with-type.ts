import type { IPropertyRow } from '../../../database/interfaces/i-property-row.js';

// Property row plus the name of the company property type it points at
export interface IPropertyWithType extends IPropertyRow {
  propertyTypeName: string;
}
