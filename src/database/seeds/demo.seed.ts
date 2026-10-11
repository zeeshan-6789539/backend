import { Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { hashSecret } from '../../common/utils/hash.util.js';
import { normalizeEmail } from '../../common/utils/string.util.js';
import type { ISeedConfig } from '../../config/interfaces/i-seed-config.js';
import { BUILT_IN_FACILITIES } from '../../modules/facilities/facilities.constants.js';
import { FacilitiesService } from '../../modules/facilities/facilities.service.js';
import { BUILT_IN_PROPERTY_TYPES } from '../../modules/property-types/property-types.constants.js';
import { PropertyTypesService } from '../../modules/property-types/property-types.service.js';
import type { IDrizzleDb } from '../interfaces/i-drizzle-db.js';
import { users } from '../schema/index.js';
import { DEMO_DATASET } from './demo/demo-dataset.js';
import {
  insertDemoAdmin,
  insertDemoCities,
  insertDemoCompany,
  insertDemoContacts,
  insertDemoFacilities,
  insertDemoProperties,
  insertDemoPropertyTypes,
  insertDemoRequirements,
} from './demo/demo-inserts.js';
import type { IDemoDataset } from './interfaces/i-demo-dataset.js';

const logger = new Logger('DemoSeed');

// Writes rows directly so timestamps can be backdated across the last three months
export const seedDemo = async (
  db: IDrizzleDb,
  propertyTypesService: PropertyTypesService,
  facilitiesService: FacilitiesService,
  config: ISeedConfig,
  dataset: IDemoDataset = DEMO_DATASET,
): Promise<void> => {
  // Every seeded user shares the super admin password, so there is one dev password to remember
  if (!config.superAdminPassword) {
    throw new Error(
      'SEED_SUPER_ADMIN_PASSWORD is not set — add it to .env before seeding the demo data',
    );
  }

  const email = normalizeEmail(config.demoAdminEmail);
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    logger.log(
      `Demo dealer "${email}" already exists — run pnpm db:reset first to reseed from scratch`,
    );
    return;
  }

  // Listings and requirements point at the built-in types and facilities, so they must exist first
  await propertyTypesService.seedBuiltInTypes(BUILT_IN_PROPERTY_TYPES);
  await facilitiesService.seedBuiltInFacilities(BUILT_IN_FACILITIES);

  const passwordHash = await hashSecret(config.superAdminPassword);

  await db.transaction(async (tx) => {
    const companyId = await insertDemoCompany(tx, dataset);
    const adminId = await insertDemoAdmin(
      tx,
      companyId,
      { email, name: config.demoAdminName, passwordHash },
      dataset.createdDaysAgo,
    );
    const typeIds = await insertDemoPropertyTypes(tx, companyId, dataset.propertyTypes);
    const contactIds = await insertDemoContacts(tx, companyId, dataset.contacts);
    const facilityIds = await insertDemoFacilities(tx, companyId, dataset.facilities);
    const locationIds = await insertDemoCities(tx, companyId, dataset.cities);
    const context = { companyId, adminId, typeIds, facilityIds, contactIds, ...locationIds };

    await insertDemoProperties(tx, context, dataset.properties);
    await insertDemoRequirements(tx, context, dataset.requirements);
  });

  const areaCount = dataset.cities.reduce((total, city) => total + city.areas.length, 0);

  logger.log(
    `Created "${dataset.companyName}" with client admin "${email}": ${dataset.propertyTypes.length} custom types, ${dataset.facilities.length} custom facilities, ${dataset.contacts.length} contacts, ${dataset.cities.length} cities with ${areaCount} areas, ${dataset.properties.length} properties, ${dataset.requirements.length} requirements over ${dataset.createdDaysAgo} days`,
  );
};
