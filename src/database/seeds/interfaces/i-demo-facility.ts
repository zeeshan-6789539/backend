export interface IDemoFacility {
  name: string;
  createdDaysAgo: number;
  // Set when the dealer later stopped offering the facility
  deactivatedDaysAgo?: number;
}
