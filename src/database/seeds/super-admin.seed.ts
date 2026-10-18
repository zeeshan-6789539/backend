import { Logger } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { ISeedConfig } from '../../config/interfaces/i-seed-config.js';
import { UsersService } from '../../modules/users/users.service.js';

const logger = new Logger('SuperAdminSeed');

// Idempotent: re-running never overwrites an existing super admin
export const seedSuperAdmin = async (
  usersService: UsersService,
  config: ISeedConfig,
): Promise<void> => {
  if (!config.superAdminPassword) {
    throw new Error(
      'SEED_SUPER_ADMIN_PASSWORD is not set — add it to .env before seeding',
    );
  }

  const existing = await usersService.findRowByEmail(config.superAdminEmail);

  if (existing) {
    logger.log(`Super admin "${config.superAdminEmail}" already exists`);
    return;
  }

  const user = await usersService.create({
    email: config.superAdminEmail,
    password: config.superAdminPassword,
    name: config.superAdminName,
    role: UserRole.SUPER_ADMIN,
    status: true,
  });

  logger.log(`Created super admin "${user.email}" (${user.id})`);
};
