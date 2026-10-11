import type { propertyRequirements } from '../schema/property-requirements.schema.js';

export type IPropertyRequirementRow = typeof propertyRequirements.$inferSelect;
export type INewPropertyRequirementRow =
  typeof propertyRequirements.$inferInsert;
