import type { IContactRow } from '../../../database/interfaces/i-contact-row.js';

export interface IContactListResult {
  items: IContactRow[];
  totalItems: number;
}
