import type { IDrizzleDb } from './i-drizzle-db.js';
import type { IDrizzleTransaction } from './i-drizzle-transaction.js';

// Anything a repository can run a query on: the pool, or an open transaction
export type IDrizzleExecutor = IDrizzleDb | IDrizzleTransaction;
