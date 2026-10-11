import type { SortOrder } from '../../../common/enums/sort-order.enum.js';

export interface IFindFacilitiesOptions {
  companyId: string;
  page: number;
  limit: number;
  search?: string;
  status?: boolean;
  sortOrder: SortOrder;
}
