import type { ChargeType } from '../../../common/enums/charge-type.enum.js';
import type { TransactionType } from '../../../common/enums/transaction-type.enum.js';

// The unified statement row: a charge or a payment, normalized to one shape so they list together
export interface ILedgerEntryRow {
  id: string;
  companyId: string;
  propertyId: string;
  tenantId: string;
  leaseId: string;
  propertyName: string;
  tenantName: string;
  paymentId: string | null;
  entryType: ChargeType | 'payment_received';
  transactionType: TransactionType;
  amount: string;
  billingMonth: string | null;
  dueDate: string | null;
  description: string | null;
  status: boolean;
  createdAt: Date;
  createdBy: string | null;
}

export interface ILedgerEntryWithBalance extends ILedgerEntryRow {
  runningBalance: string | null;
}
