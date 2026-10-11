import type { PropertyPurpose } from '../../../common/enums/property-purpose.enum.js';
import type { PropertyStatus } from '../../../common/enums/property-status.enum.js';

export interface IDemoProperty {
  title: string;
  typeName: string;
  ownerKey?: string;
  purpose: PropertyPurpose;
  price: number;
  securityDeposit?: number;
  areaSqft?: number;
  // Built-in or custom facility names
  facilityNames?: string[];
  floor?: string;
  city: string;
  areaName?: string;
  address?: string;
  description?: string;
  propertyStatus: PropertyStatus;
  createdDaysAgo: number;
  // When it was sold, rented or otherwise last changed
  updatedDaysAgo?: number;
  isDeactivated?: boolean;
}
