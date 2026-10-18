import type { IDemoLocationIds } from './i-demo-location-ids.js';

export interface IDemoSeedContext extends IDemoLocationIds {
  companyId: string;
  adminId: string;
  // Property type name -> id, the dealer's defaults and custom types
  typeIds: ReadonlyMap<string, string>;
  // Facility name -> id, the dealer's defaults and custom facilities
  facilityIds: ReadonlyMap<string, string>;
  // Contact key -> id
  contactIds: ReadonlyMap<string, string>;
}
