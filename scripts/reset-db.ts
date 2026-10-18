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

const target = new pg.Client({ connectionString: targetUrl.toString() });
await target.connect();

try {
  const { rows } = await target.query<{ server: string }>('select version() as server');
  console.log(`Server: ${rows[0].server.split(',')[0]}`);
  console.log(`Target: ${databaseName} @ ${targetUrl.host}`);

  const { rows: tables } = await target.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public'",
  );

  if (tables.length === 0) {
    console.log('No tables found — nothing to truncate');
  } else {
    const tableList = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
    await target.query(`truncate table ${tableList} restart identity cascade`);
    console.log(`Truncated ${tables.length} table(s): ${tables.map((t) => t.tablename).join(', ')}`);
  }
} finally {
  await target.end();
}
