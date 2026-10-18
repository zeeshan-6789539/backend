import { config } from 'dotenv';
import pg from 'pg';

// Same file as ConfigModule in app.module.ts
config({ path: '.env', quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set — check .env');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('reset-db refuses to run with NODE_ENV=production');
}

const targetUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(targetUrl.pathname.slice(1));

if (!databaseName) {
  throw new Error(`DATABASE_URL has no database name: ${databaseUrl}`);
}

if (databaseName === 'postgres') {
  throw new Error('reset-db refuses to drop the "postgres" maintenance database');
}

// A database cannot drop itself, so connect to the maintenance database instead
const maintenanceUrl = new URL(targetUrl);
maintenanceUrl.pathname = '/postgres';

const maintenance = new pg.Client({ connectionString: maintenanceUrl.toString() });
await maintenance.connect();

try {
  const { rows } = await maintenance.query<{ server: string }>('select version() as server');
  console.log(`Server: ${rows[0].server.split(',')[0]}`);
  console.log(`Target: ${databaseName} @ ${targetUrl.host}`);

  const quotedName = maintenance.escapeIdentifier(databaseName);

  // FORCE disconnects open sessions such as a running dev server
  await maintenance.query(`drop database if exists ${quotedName} with (force)`);
  await maintenance.query(`create database ${quotedName}`);
  console.log(`Dropped and recreated database "${databaseName}"`);
  console.log('Next: pnpm db:push, then pnpm db:seed');
} finally {
  await maintenance.end();
}
