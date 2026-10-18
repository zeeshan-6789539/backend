// Database constraint name -> the message a client should see when it trips
export const PROPERTY_TYPE_CONSTRAINT_MESSAGES: Record<string, string> = {
  property_types_company_name_unique_idx:
    'You already have a property type with this name. Use the existing one, or pick another name.',
  property_types_company_id_companies_id_fk:
    'The company for this property type does not exist',
};

// Copied into every new company, which can then edit them like its own
export const DEFAULT_PROPERTY_TYPES: readonly string[] = [
  'House',
  'Portion',
  'Room',
  'Flat',
  'Shop',
  'Office',
  'Plot',
  'Warehouse',
];
