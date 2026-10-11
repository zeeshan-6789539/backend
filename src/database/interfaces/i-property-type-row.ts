import type { propertyTypes } from '../schema/property-types.schema.js';

export type IPropertyTypeRow = typeof propertyTypes.$inferSelect;
export type INewPropertyTypeRow = typeof propertyTypes.$inferInsert;
