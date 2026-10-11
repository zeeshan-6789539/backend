// Database constraint name -> the message a client should see when it trips
export const CONTACT_CONSTRAINT_MESSAGES: Record<string, string> = {
  contacts_company_phone_unique_idx:
    'You already have a contact with this phone number. Open that contact instead of adding a duplicate.',
  contacts_company_id_companies_id_fk:
    'The company for this contact does not exist',
};
