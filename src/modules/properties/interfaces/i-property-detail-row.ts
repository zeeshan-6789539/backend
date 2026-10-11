import type { IIdName } from '../../../common/interfaces/i-id-name.js';
import type { IPropertyRow } from '../../../database/interfaces/i-property-row.js';

export interface IPropertyDetailRow extends IPropertyRow {
  facilityList: IIdName[];
  propertyTypeName: string;
  cityName: string;
  areaName: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
}
