export interface IDemoPropertyType {
  name: string;
  createdDaysAgo: number;
  // Set when the dealer later stopped offering the type
  deactivatedDaysAgo?: number;
}
