import type { SortOrder } from '../../../common/enums/sort-order.enum.js';

export interface IFindAreasOptions {
  companyId: string;
  page: number;
  limit: number;
  search?: string;
  cityId?: string;
  status?: boolean;
  sortOrder: SortOrder;
}
