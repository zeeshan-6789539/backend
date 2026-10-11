import type { PropertyStatus } from '../../../common/enums/property-status.enum.js';

export interface IMatchRequirementArgs {
  companyId: string;
  requirementId: string;
  propertyId: string;
  closingStatus: PropertyStatus;
}
