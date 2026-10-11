// Database constraint name -> the message a client should see when it trips
export const FACILITY_CONSTRAINT_MESSAGES: Record<string, string> = {
  facilities_company_name_unique_idx:
    'You already have a facility with this name. Use the existing one, or pick another name.',
  facilities_built_in_name_unique_idx:
    'A built-in facility with this name already exists',
  facilities_company_id_companies_id_fk:
    'The company for this facility does not exist',
};

export const MAX_FACILITIES_PER_RECORD = 50;

// Seeded with company_id NULL so every dealer starts with them
export const BUILT_IN_FACILITIES: readonly string[] = [
  '1 bedroom',
  '2 bedrooms',
  '3 bedrooms',
  '4+ bedrooms',
  '1 bathroom',
  '2 bathrooms',
  '3+ bathrooms',
  'Attached bath',
  'Furnished',
  'Semi-furnished',
  'Parking',
  'Separate entrance',
  'Gas',
  'Electricity backup',
];
