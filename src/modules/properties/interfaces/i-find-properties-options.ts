import type { SortOrder } from '../../../common/enums/sort-order.enum.js';

export interface IFindPropertiesOptions {
  companyId: string;
  page: number;
  limit: number;
  search?: string;
  city?: string;
  propertyTypeId?: string;
  status?: boolean;
  sortOrder: SortOrder;
}
