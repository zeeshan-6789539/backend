// Database constraint name -> the message a client should see when it trips
export const CHARGE_CONSTRAINT_MESSAGES: Record<string, string> = {
  charges_one_monthly_rent_per_lease_month_idx:
    'A monthly rent charge has already been generated for this lease this month',
  charges_amount_non_negative_check:
    'amount cannot be negative. Use a discount_adjustment entry to credit a lease.',
  charges_monthly_rent_has_billing_month_check:
    'A monthly rent charge must have a billing month',
  charges_lease_fk:
    'The charge\'s property and tenant must match its lease. Reload the lease and retry.',
};

// Rows per INSERT in the monthly rent run, well under Postgres' 65,535 bind-parameter limit
export const MONTHLY_RENT_INSERT_BATCH_SIZE = 500;
