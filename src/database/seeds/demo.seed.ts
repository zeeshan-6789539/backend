import { Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { hashSecret } from '../../common/utils/hash.util.js';
import { normalizeEmail } from '../../common/utils/string.util.js';
import type { ISeedConfig } from '../../config/interfaces/i-seed-config.js';
import type { INewCompanyRow } from '../interfaces/i-company-row.js';
import type { IDrizzleDb } from '../interfaces/i-drizzle-db.js';
import { companies, users } from '../schema/index.js';

const logger = new Logger('DemoSeed');

export const DEMO_COMPANY: INewCompanyRow = {
  name: 'Demo Company',
  email: 'demo@mifa.mifa',
  phone: '03001234567',
  address: '12 Shahrah-e-Faisal, Block 6',
  city: 'Karachi',
  status: true,
};

// Writes rows directly in one transaction so a failed admin insert leaves no orphan company
export const seedDemo = async (
  db: IDrizzleDb,
  config: ISeedConfig,
): Promise<void> => {
  // The demo admin shares the super admin password, so there is one dev password to remember
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
      `Demo client admin "${email}" already exists — run pnpm db:reset first to reseed from scratch`,
    );
    return;
  }

  const passwordHash = await hashSecret(config.superAdminPassword);

  await db.transaction(async (tx) => {
    const [company] = await tx
      .insert(companies)
      .values(DEMO_COMPANY)
      .returning({ id: companies.id });

    await tx.insert(users).values({
      companyId: company.id,
      email,
      passwordHash,
      name: config.demoAdminName,
      role: UserRole.CLIENT_ADMIN,
      status: true,
    });
  });

  logger.log(`Created "${DEMO_COMPANY.name}" with client admin "${email}"`);
};
