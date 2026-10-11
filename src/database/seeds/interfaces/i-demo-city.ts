import type { IDemoArea } from './i-demo-area.js';

export interface IDemoCity {
  name: string;
  createdDaysAgo: number;
  // A deactivated city must have every area deactivated first, as the API enforces
  deactivatedDaysAgo?: number;
  areas: readonly IDemoArea[];
}
