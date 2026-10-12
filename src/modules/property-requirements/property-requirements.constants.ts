import { PropertyPurpose } from '../../common/enums/property-purpose.enum.js';
import { RequirementPurpose } from '../../common/enums/requirement-purpose.enum.js';
import type { IMatchCriteria } from './interfaces/i-match-criteria.js';

// Database constraint name -> the message a client should see when it trips
export const PROPERTY_REQUIREMENT_CONSTRAINT_MESSAGES: Record<string, string> = {
  property_requirements_contact_id_contacts_id_fk:
    'The chosen seeker does not exist. Pick one from your contacts list.',
  property_requirements_property_type_id_property_types_id_fk:
    'The chosen property type does not exist. Pick one from your property types list.',
  property_requirements_preferred_city_id_cities_id_fk:
    'The chosen city does not exist. Pick one from your cities list.',
  property_requirements_company_id_companies_id_fk:
    'The company for this requirement does not exist',
  property_requirements_matched_property_id_properties_id_fk:
    'The chosen property does not exist. Pick one from the matches list.',
  property_requirements_budget_range:
    'budgetMin cannot be greater than budgetMax',
};

export const MAX_PREFERRED_AREAS = 50;

// A seeker who wants to buy is matched against sale listings
export const LISTING_PURPOSE_FOR_REQUIREMENT: Record<
  RequirementPurpose,
  PropertyPurpose
> = {
  [RequirementPurpose.BUY]: PropertyPurpose.SALE,
  [RequirementPurpose.RENT]: PropertyPurpose.RENT,
};

export const MATCH_LEVELS = [100, 75, 50, 25, 0] as const;

export const DEFAULT_MATCH_LEVEL = 75;

// Each lower level drops one more group of criteria; purpose, available and active always apply
export const MATCH_CRITERIA_BY_LEVEL: Record<
  (typeof MATCH_LEVELS)[number],
  IMatchCriteria
> = {
  100: { propertyType: true, city: true, area: true, budget: true, facilities: true },
  75: { propertyType: true, city: true, area: true, budget: true, facilities: false },
  50: { propertyType: true, city: true, area: false, budget: true, facilities: false },
  25: { propertyType: true, city: true, area: false, budget: false, facilities: false },
  0: { propertyType: false, city: false, area: false, budget: false, facilities: false },
};
