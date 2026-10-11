import type { IDemoLocationIds } from './i-demo-location-ids.js';

export interface IDemoSeedContext extends IDemoLocationIds {
  companyId: string;
  adminId: string;
  // Property type name -> id, built-in and the dealer's own
  typeIds: ReadonlyMap<string, string>;
  // Facility name -> id, built-in and the dealer's own
  facilityIds: ReadonlyMap<string, string>;
  // Contact key -> id
  contactIds: ReadonlyMap<string, string>;
}
