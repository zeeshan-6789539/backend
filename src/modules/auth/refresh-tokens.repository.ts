import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type {
  INewRefreshTokenRow,
  IRefreshTokenRow,
} from '../../database/interfaces/i-refresh-token-row.js';
import { refreshTokens } from '../../database/schema/index.js';

@Injectable()
export class RefreshTokensRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async create(data: INewRefreshTokenRow): Promise<IRefreshTokenRow> {
    const [row] = await this.db.insert(refreshTokens).values(data).returning();

    return row;
  }

  async findById(id: string): Promise<IRefreshTokenRow | undefined> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .limit(1);

    return row;
  }

  async revokeById(id: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }

  // Revoked-but-unexpired rows are kept: refresh() needs them to detect a replayed token
  async deleteExpiredForUser(userId: string): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          lt(refreshTokens.expiresAt, new Date()),
        ),
      );
  }
}
