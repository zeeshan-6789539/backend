import { describe, expect, it } from 'vitest';
import { PropertyPurpose } from '../../../common/enums/property-purpose.enum.js';
import { PropertyStatus } from '../../../common/enums/property-status.enum.js';
import { RequirementPurpose } from '../../../common/enums/requirement-purpose.enum.js';
import { RequirementStatus } from '../../../common/enums/requirement-status.enum.js';
import { BUILT_IN_FACILITIES } from '../../../modules/facilities/facilities.constants.js';
import { BUILT_IN_PROPERTY_TYPES } from '../../../modules/property-types/property-types.constants.js';
import { DEMO_DATASET } from './demo-dataset.js';

const { cities, contacts, facilities, properties, propertyTypes, requirements } = DEMO_DATASET;
const contactDays = new Map(contacts.map((contact) => [contact.key, contact.createdDaysAgo]));
const typeNames = new Set([
  ...BUILT_IN_PROPERTY_TYPES,
  ...propertyTypes.map((type) => type.name),
]);

describe('DEMO_DATASET', () => {
  it('stays within three months of the dealership opening', () => {
    const allDays = [
      ...contacts.map((row) => row.createdDaysAgo),
      ...cities.map((row) => row.createdDaysAgo),
      ...properties.map((row) => row.createdDaysAgo),
      ...requirements.map((row) => row.createdDaysAgo),
    ];

    expect(Math.max(...allDays)).toBeLessThanOrEqual(DEMO_DATASET.createdDaysAgo);
  });

  it('uses unique contact keys and phone numbers', () => {
    expect(new Set(contacts.map((row) => row.key)).size).toBe(contacts.length);
    expect(new Set(contacts.map((row) => row.phone)).size).toBe(contacts.length);
  });

  it('only references contacts and types that exist before the record', () => {
    for (const property of properties) {
      expect(typeNames.has(property.typeName), property.title).toBe(true);

      if (property.ownerKey) {
        expect(contactDays.get(property.ownerKey), property.title).toBeGreaterThanOrEqual(
          property.createdDaysAgo,
        );
      }
    }

    for (const requirement of requirements) {
      expect(contactDays.get(requirement.contactKey)).toBeGreaterThanOrEqual(
        requirement.createdDaysAgo,
      );

      if (requirement.typeName) {
        expect(typeNames.has(requirement.typeName)).toBe(true);
      }
    }
  });

  it('never updates a record before it was created', () => {
    for (const row of [...properties, ...requirements]) {
      expect(row.updatedDaysAgo ?? row.createdDaysAgo).toBeLessThanOrEqual(row.createdDaysAgo);
    }
  });

  it('obeys the listing rules the database enforces', () => {
    for (const property of properties) {
      const isSale = property.purpose === PropertyPurpose.SALE;

      expect(property.propertyStatus === PropertyStatus.RENTED && isSale).toBe(false);
      expect(property.propertyStatus === PropertyStatus.SOLD && !isSale).toBe(false);
      expect(isSale && property.securityDeposit !== undefined, property.title).toBe(false);
    }
  });

  it('only references facilities that exist before the record', () => {
    const builtInNames = new Set(BUILT_IN_FACILITIES);
    const customDays = new Map(facilities.map((facility) => [facility.name, facility.createdDaysAgo]));

    for (const row of [...properties, ...requirements]) {
      for (const name of row.facilityNames ?? []) {
        const customCreatedDaysAgo = customDays.get(name);

        expect(builtInNames.has(name) || customCreatedDaysAgo !== undefined, name).toBe(true);

        if (customCreatedDaysAgo !== undefined) {
          expect(customCreatedDaysAgo, name).toBeGreaterThanOrEqual(row.createdDaysAgo);
        }
      }
    }
  });

  it('never gives a custom facility a built-in name', () => {
    const builtInNames = new Set(BUILT_IN_FACILITIES);

    for (const facility of facilities) {
      expect(builtInNames.has(facility.name), facility.name).toBe(false);
    }
  });

  it('keeps city names unique per dealer and area names unique per city', () => {
    const cityNames = cities.map((city) => city.name.toLowerCase());

    expect(new Set(cityNames).size).toBe(cities.length);

    for (const city of cities) {
      const areaNames = city.areas.map((area) => area.name.toLowerCase());

      expect(new Set(areaNames).size, city.name).toBe(city.areas.length);
    }
  });

  it('creates areas after their city and deactivates rows after creating them', () => {
    for (const city of cities) {
      expect(city.deactivatedDaysAgo ?? city.createdDaysAgo).toBeLessThanOrEqual(
        city.createdDaysAgo,
      );

      for (const area of city.areas) {
        expect(area.createdDaysAgo, area.name).toBeLessThanOrEqual(city.createdDaysAgo);
        expect(area.deactivatedDaysAgo ?? area.createdDaysAgo, area.name).toBeLessThanOrEqual(
          area.createdDaysAgo,
        );
      }
    }
  });

  it('deactivates a city only after all of its areas', () => {
    for (const city of cities.filter((row) => row.deactivatedDaysAgo !== undefined)) {
      for (const area of city.areas) {
        expect(area.deactivatedDaysAgo, area.name).toBeDefined();
        expect(area.deactivatedDaysAgo ?? 0, area.name).toBeGreaterThanOrEqual(
          city.deactivatedDaysAgo ?? 0,
        );
      }
    }
  });

  it('lists every city and area a listing uses, before the listing', () => {
    for (const property of properties) {
      const city = cities.find((row) => row.name === property.city);

      expect(city, property.title).toBeDefined();
      expect(city?.createdDaysAgo ?? 0, property.title).toBeGreaterThanOrEqual(
        property.createdDaysAgo,
      );

      if (property.areaName) {
        const area = city?.areas.find((row) => row.name === property.areaName);

        expect(area, property.title).toBeDefined();
        expect(area?.createdDaysAgo ?? 0, property.title).toBeGreaterThanOrEqual(
          property.createdDaysAgo,
        );
      }
    }
  });

  it('only prefers active cities and areas of that city', () => {
    for (const requirement of requirements) {
      const areaNames = requirement.preferredAreaNames ?? [];

      if (!requirement.preferredCity) {
        expect(areaNames, requirement.contactKey).toEqual([]);
        continue;
      }

      const city = cities.find((row) => row.name === requirement.preferredCity);

      expect(city?.deactivatedDaysAgo, requirement.contactKey).toBeUndefined();

      for (const name of areaNames) {
        const area = city?.areas.find((row) => row.name === name);

        expect(area, name).toBeDefined();
        expect(area?.createdDaysAgo ?? 0, name).toBeGreaterThanOrEqual(
          requirement.createdDaysAgo,
        );
      }
    }
  });

  it('covers active and deactivated cities and areas', () => {
    const allAreas = cities.flatMap((city) => city.areas);

    expect(new Set(cities.map((row) => row.deactivatedDaysAgo === undefined))).toEqual(
      new Set([true, false]),
    );
    expect(new Set(allAreas.map((row) => row.deactivatedDaysAgo === undefined))).toEqual(
      new Set([true, false]),
    );
  });

  it('covers every purpose and status', () => {
    expect(new Set(properties.map((row) => row.purpose))).toEqual(
      new Set(Object.values(PropertyPurpose)),
    );
    expect(new Set(properties.map((row) => row.propertyStatus))).toEqual(
      new Set(Object.values(PropertyStatus)),
    );
    expect(new Set(requirements.map((row) => row.purpose))).toEqual(
      new Set(Object.values(RequirementPurpose)),
    );
    expect(new Set(requirements.map((row) => row.requirementStatus))).toEqual(
      new Set(Object.values(RequirementStatus)),
    );
  });
});
