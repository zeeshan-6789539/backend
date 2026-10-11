import type { RequirementPurpose } from '../../../common/enums/requirement-purpose.enum.js';
import type { RequirementStatus } from '../../../common/enums/requirement-status.enum.js';

export interface IDemoRequirement {
  contactKey: string;
  purpose: RequirementPurpose;
  typeName?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredCity?: string;
  // Area names inside preferredCity
  preferredAreaNames?: string[];
  // Built-in or custom facility names
  facilityNames?: string[];
  notes?: string;
  requirementStatus: RequirementStatus;
  createdDaysAgo: number;
  updatedDaysAgo?: number;
  isDeactivated?: boolean;
}
