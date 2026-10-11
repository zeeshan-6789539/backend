import type { contacts } from '../schema/contacts.schema.js';

export type IContactRow = typeof contacts.$inferSelect;
export type INewContactRow = typeof contacts.$inferInsert;
