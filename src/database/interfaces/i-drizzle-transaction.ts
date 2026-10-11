import type { IDrizzleDb } from './i-drizzle-db.js';

export type IDrizzleTransaction = Parameters<
  Parameters<IDrizzleDb['transaction']>[0]
>[0];
