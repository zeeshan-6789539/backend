// Database constraint name -> the message a client should see when it trips
export const PROPERTY_TYPE_CONSTRAINT_MESSAGES: Record<string, string> = {
  property_types_company_id_name_key:
    'This company already has a property type with that name. Pick a different name, or restore the existing one.',
  property_types_company_id_companies_id_fk:
    'The company this property type belongs to no longer exists',
};
