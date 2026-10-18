import type { ILedgerEntryWithBalance } from './i-ledger-entry-row.js';

// A statement row as the raw SQL returns it: createdAt arrives as an ISO string, not a Date
export type ILedgerStatementRawRow = Omit<ILedgerEntryWithBalance, 'createdAt' | 'runningBalance'> & {
  createdAt: string;
  runningBalance: string;
};
