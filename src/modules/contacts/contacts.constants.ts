// Database constraint name -> the message a client should see when it trips
export const CONTACT_CONSTRAINT_MESSAGES: Record<string, string> = {
  contacts_company_phone_unique_idx:
    'You already have a contact with this phone number. Open that contact instead of adding a duplicate.',
  contacts_company_id_companies_id_fk:
    'The company for this contact does not exist',
  contacts_phone_format: 'phone must be 11 digits starting with 03, e.g. 03001234567',
  contacts_cnic_format: 'cnic must look like 35202-1234567-1',
};

// Only the 11-digit local form is stored, so the same number cannot be saved twice
export const CONTACT_PHONE_PATTERN = /^03\d{9}$/;
