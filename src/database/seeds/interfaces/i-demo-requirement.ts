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
  // Default or custom facility names
  facilityNames?: string[];
  notes?: string;
  requirementStatus: RequirementStatus;
  // Title of the sold or rented listing the seeker took; required when MATCHED
  matchedPropertyTitle?: string;
  createdDaysAgo: number;
  updatedDaysAgo?: number;
  isDeactivated?: boolean;
}
