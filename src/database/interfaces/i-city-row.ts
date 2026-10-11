import type { cities } from '../schema/cities.schema.js';

export type ICityRow = typeof cities.$inferSelect;
export type INewCityRow = typeof cities.$inferInsert;
