import { isNull } from 'drizzle-orm';
import { UserRole } from '../../../common/enums/user-role.enum.js';
import { daysAgo } from '../../../common/utils/date.util.js';
import { uuidv7 } from '../../../common/utils/uuid.util.js';
import type { IDrizzleTransaction } from '../../interfaces/i-drizzle-transaction.js';
import {
  areas,
  cities,
  companies,
  contacts,
  facilities,
  properties,
  propertyRequirements,
  propertyTypes,
  users,
} from '../../schema/index.js';
import type { IDemoAdmin } from '../interfaces/i-demo-admin.js';
import type { IDemoCity } from '../interfaces/i-demo-city.js';
import type { IDemoContact } from '../interfaces/i-demo-contact.js';
import type { IDemoDataset } from '../interfaces/i-demo-dataset.js';
import type { IDemoFacility } from '../interfaces/i-demo-facility.js';
import type { IDemoLocationIds } from '../interfaces/i-demo-location-ids.js';
import type { IDemoProperty } from '../interfaces/i-demo-property.js';
import type { IDemoPropertyType } from '../interfaces/i-demo-property-type.js';
import type { IDemoRequirement } from '../interfaces/i-demo-requirement.js';
import type { IDemoSeedContext } from '../interfaces/i-demo-seed-context.js';

// Spreads rows across office hours so same-day records do not share a timestamp
const hourFor = (index: number): number => 9 + (index % 9);

const requireId = (
  ids: ReadonlyMap<string, string>,
  key: string,
  label: string,
): string => {
  const id = ids.get(key);

  if (!id) {
    throw new Error(`Demo data references unknown ${label} "${key}"`);
  }

  return id;
};

export const insertDemoCompany = async (
  tx: IDrizzleTransaction,
  dataset: IDemoDataset,
): Promise<string> => {
  const id = uuidv7();
  const createdAt = daysAgo(dataset.createdDaysAgo, 9);

  await tx.insert(companies).values({
    id,
    name: dataset.companyName,
    phone: dataset.companyPhone,
    city: dataset.companyCity,
    address: dataset.companyAddress,
    createdAt,
    updatedAt: createdAt,
  });

  return id;
};

export const insertDemoAdmin = async (
  tx: IDrizzleTransaction,
  companyId: string,
  admin: IDemoAdmin,
  createdDaysAgo: number,
): Promise<string> => {
  const id = uuidv7();
  const createdAt = daysAgo(createdDaysAgo, 10);

  await tx.insert(users).values({
    id,
    companyId,
    email: admin.email,
    passwordHash: admin.passwordHash,
    name: admin.name,
    role: UserRole.CLIENT_ADMIN,
    createdAt,
    updatedAt: createdAt,
  });

  return id;
};

// Built-ins plus the dealer's own rows, as name -> id; shared by property types and facilities
const insertDemoLookups = async (
  tx: IDrizzleTransaction,
  table: typeof propertyTypes | typeof facilities,
  companyId: string,
  customRows: readonly (IDemoPropertyType | IDemoFacility)[],
): Promise<Map<string, string>> => {
  const builtIns = await tx
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(isNull(table.companyId));

  const ids = new Map(builtIns.map((row) => [row.name, row.id]));

  const rows = customRows.map((row, index) => {
    const id = uuidv7();
    ids.set(row.name, id);

    return {
      id,
      companyId,
      name: row.name,
      status: row.deactivatedDaysAgo === undefined,
      createdAt: daysAgo(row.createdDaysAgo, hourFor(index)),
      updatedAt: daysAgo(row.deactivatedDaysAgo ?? row.createdDaysAgo, hourFor(index)),
    };
  });

  if (rows.length > 0) {
    await tx.insert(table).values(rows);
  }

  return ids;
};

export const insertDemoPropertyTypes = (
  tx: IDrizzleTransaction,
  companyId: string,
  customTypes: readonly IDemoPropertyType[],
): Promise<Map<string, string>> => insertDemoLookups(tx, propertyTypes, companyId, customTypes);

export const insertDemoFacilities = (
  tx: IDrizzleTransaction,
  companyId: string,
  customFacilities: readonly IDemoFacility[],
): Promise<Map<string, string>> =>
  insertDemoLookups(tx, facilities, companyId, customFacilities);

const requireIds = (
  ids: ReadonlyMap<string, string>,
  keys: readonly string[] | undefined,
  label: string,
): string[] => (keys ?? []).map((key) => requireId(ids, key, label));

export const insertDemoContacts = async (
  tx: IDrizzleTransaction,
  companyId: string,
  demoContacts: readonly IDemoContact[],
): Promise<Map<string, string>> => {
  const contactIds = new Map<string, string>();

  const rows = demoContacts.map((contact, index) => {
    const id = uuidv7();
    contactIds.set(contact.key, id);

    return {
      id,
      companyId,
      name: contact.name,
      phone: contact.phone,
      email: contact.email ?? null,
      cnic: contact.cnic ?? null,
      address: contact.address ?? null,
      notes: contact.notes ?? null,
      status: contact.deactivatedDaysAgo === undefined,
      createdAt: daysAgo(contact.createdDaysAgo, hourFor(index)),
      updatedAt: daysAgo(
        contact.deactivatedDaysAgo ?? contact.createdDaysAgo,
        hourFor(index),
      ),
    };
  });

  await tx.insert(contacts).values(rows);

  return contactIds;
};

const areaKey = (cityName: string, areaName: string): string => `${cityName}/${areaName}`;

// Returns the ids listings and requirements need to point at their city and areas
export const insertDemoCities = async (
  tx: IDrizzleTransaction,
  companyId: string,
  demoCities: readonly IDemoCity[],
): Promise<IDemoLocationIds> => {
  const cityRows = demoCities.map((city, index) => ({
    id: uuidv7(),
    companyId,
    name: city.name,
    status: city.deactivatedDaysAgo === undefined,
    createdAt: daysAgo(city.createdDaysAgo, hourFor(index)),
    updatedAt: daysAgo(city.deactivatedDaysAgo ?? city.createdDaysAgo, hourFor(index)),
  }));

  const areaRows = demoCities.flatMap((city, cityIndex) =>
    city.areas.map((area, index) => ({
      id: uuidv7(),
      companyId,
      cityId: cityRows[cityIndex].id,
      name: area.name,
      status: area.deactivatedDaysAgo === undefined,
      createdAt: daysAgo(area.createdDaysAgo, hourFor(index)),
      updatedAt: daysAgo(area.deactivatedDaysAgo ?? area.createdDaysAgo, hourFor(index)),
    })),
  );

  if (cityRows.length > 0) {
    await tx.insert(cities).values(cityRows);
  }

  if (areaRows.length > 0) {
    await tx.insert(areas).values(areaRows);
  }

  const areaIds = new Map<string, string>();

  demoCities.forEach((city, cityIndex) => {
    city.areas.forEach((area) => {
      const row = areaRows.find(
        (candidate) =>
          candidate.cityId === cityRows[cityIndex].id && candidate.name === area.name,
      );

      if (row) {
        areaIds.set(areaKey(city.name, area.name), row.id);
      }
    });
  });

  return {
    cityIds: new Map(cityRows.map((row) => [row.name, row.id])),
    areaIds,
  };
};

export const insertDemoProperties = async (
  tx: IDrizzleTransaction,
  context: IDemoSeedContext,
  demoProperties: readonly IDemoProperty[],
): Promise<void> => {
  const rows = demoProperties.map((property, index) => ({
    id: uuidv7(),
    companyId: context.companyId,
    createdBy: context.adminId,
    propertyTypeId: requireId(context.typeIds, property.typeName, 'property type'),
    ownerContactId: property.ownerKey
      ? requireId(context.contactIds, property.ownerKey, 'contact')
      : null,
    title: property.title,
    description: property.description ?? null,
    purpose: property.purpose,
    price: property.price,
    securityDeposit: property.securityDeposit ?? null,
    areaSqft: property.areaSqft ?? null,
    facilities: requireIds(context.facilityIds, property.facilityNames, 'facility'),
    floor: property.floor ?? null,
    cityId: requireId(context.cityIds, property.city, 'city'),
    areaId: property.areaName
      ? requireId(context.areaIds, areaKey(property.city, property.areaName), 'area')
      : null,
    address: property.address ?? null,
    propertyStatus: property.propertyStatus,
    status: !property.isDeactivated,
    createdAt: daysAgo(property.createdDaysAgo, hourFor(index)),
    updatedAt: daysAgo(
      property.updatedDaysAgo ?? property.createdDaysAgo,
      hourFor(index),
    ),
  }));

  await tx.insert(properties).values(rows);
};

export const insertDemoRequirements = async (
  tx: IDrizzleTransaction,
  context: IDemoSeedContext,
  demoRequirements: readonly IDemoRequirement[],
): Promise<void> => {
  const rows = demoRequirements.map((requirement, index) => ({
    id: uuidv7(),
    companyId: context.companyId,
    contactId: requireId(context.contactIds, requirement.contactKey, 'contact'),
    propertyTypeId: requirement.typeName
      ? requireId(context.typeIds, requirement.typeName, 'property type')
      : null,
    purpose: requirement.purpose,
    budgetMin: requirement.budgetMin ?? null,
    budgetMax: requirement.budgetMax ?? null,
    preferredCityId: requirement.preferredCity
      ? requireId(context.cityIds, requirement.preferredCity, 'city')
      : null,
    preferredAreaIds: (requirement.preferredAreaNames ?? []).map((areaName) =>
      requireId(
        context.areaIds,
        areaKey(requirement.preferredCity ?? '', areaName),
        'area',
      ),
    ),
    facilities: requireIds(context.facilityIds, requirement.facilityNames, 'facility'),
    notes: requirement.notes ?? null,
    requirementStatus: requirement.requirementStatus,
    status: !requirement.isDeactivated,
    createdAt: daysAgo(requirement.createdDaysAgo, hourFor(index)),
    updatedAt: daysAgo(
      requirement.updatedDaysAgo ?? requirement.createdDaysAgo,
      hourFor(index),
    ),
  }));

  await tx.insert(propertyRequirements).values(rows);
};
