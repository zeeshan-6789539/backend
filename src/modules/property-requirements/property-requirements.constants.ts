import { PropertyPurpose } from '../../common/enums/property-purpose.enum.js';
import { RequirementPurpose } from '../../common/enums/requirement-purpose.enum.js';
import type { IMatchCriteria } from './interfaces/i-match-criteria.js';

// Database constraint name -> the message a client should see when it trips
export const PROPERTY_REQUIREMENT_CONSTRAINT_MESSAGES: Record<string, string> = {
  property_requirements_company_contact_fk:
    'The chosen seeker does not exist. Pick one from your contacts list.',
  property_requirements_company_property_type_fk:
    'The chosen property type does not exist. Pick one from your property types list.',
  property_requirements_company_preferred_city_fk:
    'The chosen city does not exist. Pick one from your cities list.',
  property_requirements_company_id_companies_id_fk:
    'The company for this requirement does not exist',
  property_requirements_company_matched_property_fk:
    'The chosen property does not exist. Pick one from the matches list.',
  property_requirements_budget_range:
    'budgetMin cannot be greater than budgetMax',
  property_requirements_budget_non_negative:
    'budgetMin and budgetMax cannot be negative',
  property_requirements_max_preferred_areas:
    'A requirement can have at most 50 preferred areas',
  property_requirements_areas_need_city:
    'Preferred areas need a preferred city. Pick the city first, or clear the areas.',
  property_requirements_matched_has_property:
    'A requirement becomes matched only by choosing a property from its matches',
};

// Keep in step with the property_requirements_max_preferred_areas check constraint
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
  0: { propertyType: true, city: false, area: false, budget: false, facilities: false },
};
