import type { ILedgerEntryWithBalance } from '../interfaces/i-ledger-entry-row.js';
import type { ILedgerStatementRawRow } from '../interfaces/i-ledger-statement-raw-row.js';
import type { LedgerEntryResponseDto } from '../dto/ledger-entry-response.dto.js';

export const toLedgerEntry = (row: ILedgerStatementRawRow): ILedgerEntryWithBalance => ({
  ...row,
  createdAt: new Date(row.createdAt),
});

export const toLedgerEntryResponse = (
  row: ILedgerEntryWithBalance,
): LedgerEntryResponseDto => ({
  id: row.id,
  companyId: row.companyId,
  propertyId: row.propertyId,
  tenantId: row.tenantId,
  leaseId: row.leaseId,
  propertyName: row.propertyName,
  tenantName: row.tenantName,
  paymentId: row.paymentId,
  entryType: row.entryType,
  transactionType: row.transactionType,
  amount: row.amount,
  runningBalance: row.runningBalance,
  billingMonth: row.billingMonth,
  dueDate: row.dueDate,
  description: row.description,
  status: row.status,
  createdAt: row.createdAt,
  createdBy: row.createdBy,
});
