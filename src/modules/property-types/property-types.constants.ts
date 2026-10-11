// Database constraint name -> the message a client should see when it trips
export const PROPERTY_TYPE_CONSTRAINT_MESSAGES: Record<string, string> = {
  property_types_company_name_unique_idx:
    'You already have a property type with this name. Use the existing one, or pick another name.',
  property_types_built_in_name_unique_idx:
    'A built-in property type with this name already exists',
  property_types_company_id_companies_id_fk:
    'The company for this property type does not exist',
};

// Seeded with company_id NULL so every dealer starts with them
export const BUILT_IN_PROPERTY_TYPES: readonly string[] = [
  'House',
  'Portion',
  'Room',
  'Flat',
  'Shop',
  'Office',
  'Plot',
  'Warehouse',
];
