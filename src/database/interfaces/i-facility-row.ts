import type { facilities } from '../schema/facilities.schema.js';

export type IFacilityRow = typeof facilities.$inferSelect;
export type INewFacilityRow = typeof facilities.$inferInsert;
