import type { properties } from '../schema/properties.schema.js';

export type IPropertyRow = typeof properties.$inferSelect;
export type INewPropertyRow = typeof properties.$inferInsert;
