import type { ILedgerEntryWithBalance } from './i-ledger-entry-row.js';

export interface ILedgerStatementResult {
  items: ILedgerEntryWithBalance[];
  totalItems: number;
}
