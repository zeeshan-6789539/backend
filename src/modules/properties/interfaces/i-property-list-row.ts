import type { IAssignedEntity } from '../../../common/interfaces/i-assigned-entity.js';
import type { IPropertyWithType } from './i-property-with-type.js';

// Property row plus the tenant(s) currently holding an active lease on it
export interface IPropertyListRow extends IPropertyWithType {
  tenants: IAssignedEntity[];
}
