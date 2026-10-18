import { relations, sql } from 'drizzle-orm';
import { index, inet, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from '../../common/utils/uuid.util.js';
import { users } from './users.schema.js';

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    // Always supplied by AuthService as the token's jti; the default is a guard
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Hex SHA-256 of the refresh JWT
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    userAgent: varchar('user_agent', { length: 255 }),
    ipAddress: inet('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Only live sessions are looked up by user (logout-all, replay revocation)
    index('refresh_tokens_active_user_id_idx')
      .on(table.userId)
      .where(sql`${table.revokedAt} IS NULL`),
    index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  ],
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
