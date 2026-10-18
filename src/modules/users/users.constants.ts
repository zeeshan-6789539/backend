// Database constraint name -> the message a client should see when it trips
export const USER_CONSTRAINT_MESSAGES: Record<string, string> = {
  users_email_unique_idx: 'That email address is already in use',
  users_company_id_companies_id_fk:
    'The selected company does not exist or has been removed',
  users_super_admin_has_no_company:
    'A super_admin is platform-level and cannot belong to a company',
  users_email_lowercase: 'email must be stored in lower case',
};
