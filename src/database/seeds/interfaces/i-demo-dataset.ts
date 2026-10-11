import type { IDemoCity } from './i-demo-city.js';
import type { IDemoContact } from './i-demo-contact.js';
import type { IDemoFacility } from './i-demo-facility.js';
import type { IDemoProperty } from './i-demo-property.js';
import type { IDemoPropertyType } from './i-demo-property-type.js';
import type { IDemoRequirement } from './i-demo-requirement.js';

export interface IDemoDataset {
  companyName: string;
  companyPhone: string;
  companyCity: string;
  companyAddress: string;
  createdDaysAgo: number;
  propertyTypes: readonly IDemoPropertyType[];
  facilities: readonly IDemoFacility[];
  contacts: readonly IDemoContact[];
  cities: readonly IDemoCity[];
  properties: readonly IDemoProperty[];
  requirements: readonly IDemoRequirement[];
}
