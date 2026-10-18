import { PropertyPurpose } from '../../common/enums/property-purpose.enum.js';
import { PropertyStatus } from '../../common/enums/property-status.enum.js';

// A sale can end as sold, a rental as rented — never the other way round
export const CLOSING_STATUS_BY_PURPOSE: Record<PropertyPurpose, PropertyStatus> = {
  [PropertyPurpose.SALE]: PropertyStatus.SOLD,
  [PropertyPurpose.RENT]: PropertyStatus.RENTED,
};

// Database constraint name -> the message a client should see when it trips
export const PROPERTY_CONSTRAINT_MESSAGES: Record<string, string> = {
  properties_company_property_type_fk:
    'The chosen property type does not exist. Pick one from your property types list.',
  properties_company_owner_contact_fk:
    'The chosen owner does not exist. Pick one from your contacts list.',
  properties_company_city_fk:
    'The chosen city does not exist. Pick one from your cities list.',
  properties_city_area_fk:
    'The chosen area does not exist in this city. Pick one from the city\'s areas list.',
  properties_company_id_companies_id_fk:
    'The company for this property does not exist',
  properties_created_by_users_id_fk: 'The user adding this property does not exist',
  properties_price_non_negative: 'price cannot be negative',
  properties_deposit_non_negative: 'securityDeposit cannot be negative',
  properties_area_sqft_positive: 'areaSqft must be greater than 0',
  properties_deposit_only_for_rent:
    'A security deposit only applies to rent listings. Clear it, or set purpose to rent.',
  properties_status_matches_purpose:
    'A sale listing can only be available or sold, and a rent listing only available or rented',
};
