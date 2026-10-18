import type { DefaultPropertyType } from '../../../common/enums/default-property-type.enum.js';

export interface IRentChangeSeedPlan {
  atIndex: number;
  newRent: number;
}

export interface ITurnoverSeedPlan {
  atIndex: number;
  endStatus: 'expired' | 'terminated';
  forfeitAdvance?: boolean;
}

export interface IDiscountSeedPlan {
  atIndex: number;
  amount: number;
  reason: string;
}

export interface IPropertySeedPlan {
  name: string;
  addressLine1: string;
  city: string;
  propertyType: DefaultPropertyType;
  monthlyRent: number;
  // Only set when `turnover` is set — the rent charged to the incoming tenant
  secondSegmentRent?: number;
  advanceMultiplier: number;
  tenantName: string;
  // Only set when `turnover` is set — the incoming tenant after the first one moves out
  secondTenantName?: string;
  turnover?: ITurnoverSeedPlan;
  rentChange?: IRentChangeSeedPlan;
  problemTenant?: boolean;
  discount?: IDiscountSeedPlan;
}
