import type { RequirementPurpose } from '../../../common/enums/requirement-purpose.enum.js';
import type { RequirementStatus } from '../../../common/enums/requirement-status.enum.js';
import type { SortOrder } from '../../../common/enums/sort-order.enum.js';

export interface IFindPropertyRequirementsOptions {
  companyId: string;
  page: number;
  limit: number;
  search?: string;
  sortOrder: SortOrder;
  contactId?: string;
  propertyTypeId?: string;
  purpose?: RequirementPurpose;
  requirementStatus?: RequirementStatus;
  status?: boolean;
}
