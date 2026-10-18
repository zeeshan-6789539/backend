// Database constraint name -> the message a client should see when it trips
export const PAYMENT_CONSTRAINT_MESSAGES: Record<string, string> = {
  payments_amount_paid_positive_check: 'amountPaid must be greater than 0',
  payments_lease_fk:
    'The payment\'s property and tenant must match its lease. Reload the lease and retry.',
};
