// Database constraint name -> the message a client should see when it trips
export const LEASE_CONSTRAINT_MESSAGES: Record<string, string> = {
  leases_one_active_per_property_idx:
    'This property already has an active lease',
  leases_end_after_start_check: 'endDate must be on or after startDate',
  leases_advance_amount_non_negative_check: 'advanceAmount cannot be negative',
  lease_rent_schedules_rent_amount_positive_check:
    'The rent amount (monthlyRent or rentAmount) must be greater than 0',
  lease_rent_schedules_effective_range_check:
    'The new rent\'s effectiveFrom must be on or after the current rent\'s start date',
  charges_lease_fk:
    'The rent-change entry\'s property and tenant must match its lease. Reload the lease and retry.',
};
