import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { IDrizzleDb } from '../../database/interfaces/i-drizzle-db.js';
import type { IDrizzleExecutor } from '../../database/interfaces/i-drizzle-executor.js';
import type { IDrizzleTransaction } from '../../database/interfaces/i-drizzle-transaction.js';
import type {
  INewRefreshTokenRow,
  IRefreshTokenRow,
} from '../../database/interfaces/i-refresh-token-row.js';
import { refreshTokens } from '../../database/schema/index.js';

@Injectable()
export class RefreshTokensRepository {
  constructor(@Inject(DRIZZLE) private readonly db: IDrizzleDb) {}

  async transaction<T>(work: (tx: IDrizzleTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }

  async create(
    data: INewRefreshTokenRow,
    executor: IDrizzleExecutor = this.db,
  ): Promise<IRefreshTokenRow> {
    const [row] = await executor.insert(refreshTokens).values(data).returning();

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

  // False when the token was already revoked, e.g. by a concurrent refresh
  async revokeById(
    id: string,
    executor: IDrizzleExecutor = this.db,
  ): Promise<boolean> {
    const rows = await executor
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });

    return rows.length > 0;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }

  async deleteExpired(): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()));
  }
}
