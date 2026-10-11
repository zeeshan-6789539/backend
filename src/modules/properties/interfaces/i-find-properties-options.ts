import type { PropertyPurpose } from '../../../common/enums/property-purpose.enum.js';
import type { PropertyStatus } from '../../../common/enums/property-status.enum.js';
import type { SortOrder } from '../../../common/enums/sort-order.enum.js';

export interface IFindPropertiesOptions {
  companyId: string;
  page: number;
  limit: number;
  search?: string;
  sortOrder: SortOrder;
  purpose?: PropertyPurpose;
  propertyTypeId?: string;
  propertyStatus?: PropertyStatus;
  ownerContactId?: string;
  cityId?: string;
  // Listings in any one of these areas
  areaIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  // Listings must have every one of these facilities
  facilityIds?: string[];
  status?: boolean;
}
