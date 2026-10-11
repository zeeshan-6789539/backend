export interface IDemoArea {
  name: string;
  createdDaysAgo: number;
  // Set when the dealer later stopped working in the area
  deactivatedDaysAgo?: number;
}
