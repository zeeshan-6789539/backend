// Database constraint name -> the message a client should see when it trips
export const CITY_CONSTRAINT_MESSAGES: Record<string, string> = {
  cities_company_name_unique_idx:
    'You already have a city with this name. Use the existing one, or pick another name.',
  cities_company_id_companies_id_fk: 'The company for this city does not exist',
};
