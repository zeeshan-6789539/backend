export interface IAssertAreasOptions {
  companyId: string;
  // Every area must belong to this city
  cityId: string;
  areaIds: readonly string[];
  // Already linked ids that may stay even if deactivated since
  keptIds?: readonly string[];
}
