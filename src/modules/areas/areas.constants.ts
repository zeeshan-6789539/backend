// Database constraint name -> the message a client should see when it trips
export const AREA_CONSTRAINT_MESSAGES: Record<string, string> = {
  areas_city_name_unique_idx:
    'This city already has an area with this name. Use the existing one, or pick another name.',
  areas_city_id_cities_id_fk:
    'The city for this area does not exist. Pick one from your cities list.',
  areas_company_id_companies_id_fk: 'The company for this area does not exist',
};
