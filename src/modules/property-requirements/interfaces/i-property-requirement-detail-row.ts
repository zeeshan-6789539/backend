import type { IIdName } from '../../../common/interfaces/i-id-name.js';
import type { IPropertyRequirementRow } from '../../../database/interfaces/i-property-requirement-row.js';

export interface IPropertyRequirementDetailRow extends IPropertyRequirementRow {
  facilityList: IIdName[];
  preferredCityName: string | null;
  preferredAreaList: IIdName[];
  contactName: string;
  contactPhone: string;
  propertyTypeName: string | null;
  matchedPropertyTitle: string | null;
}
