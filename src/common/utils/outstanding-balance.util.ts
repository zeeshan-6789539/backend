import { sql } from 'drizzle-orm';
import { TransactionType } from '../enums/transaction-type.enum.js';
import { charges, leases, payments } from '../../database/schema/index.js';

// Replaces the prototype's trigger-maintained leases.current_balance column —
// this repo has no migration files, so the balance is computed at read time instead.
export const OUTSTANDING_BALANCE_SQL = sql<string>`(
  COALESCE((
    SELECT SUM(CASE WHEN ${charges.transactionType} = ${TransactionType.DEBIT} THEN ${charges.amount} ELSE -${charges.amount} END)
    FROM ${charges}
    WHERE ${charges.leaseId} = ${leases.id} AND ${charges.isActive} = true
  ), 0)
  -
  COALESCE((SELECT SUM(${payments.amountPaid}) FROM ${payments} WHERE ${payments.leaseId} = ${leases.id} AND ${payments.isActive} = true), 0)
)::numeric(14, 2)`;
