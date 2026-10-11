import type { areas } from '../schema/areas.schema.js';

export type IAreaRow = typeof areas.$inferSelect;
export type INewAreaRow = typeof areas.$inferInsert;

// Areas are always read with their city's name so lists need no second lookup
export type IAreaWithCityRow = IAreaRow & { cityName: string };
