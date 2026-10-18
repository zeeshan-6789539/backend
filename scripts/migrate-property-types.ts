import { config } from 'dotenv';
import pg from 'pg';

// Same file as ConfigModule in app.module.ts
config({ path: '.env', quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set — check .env');
}

// Mirrors DefaultPropertyType in src/common/enums/default-property-type.enum.ts, in display order
const DEFAULT_TYPE_NAMES = ['Home', 'Apartment', 'Room', 'Shop', 'Office', 'Warehouse', 'Land', 'Other'];

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  const { rowCount } = await client.query(
    `select 1 from information_schema.columns where table_name = 'properties' and column_name = 'property_type'`,
  );

  if (!rowCount) {
    console.log('properties.property_type is already gone — nothing to migrate. Run pnpm db:push as usual.');
  } else {
    await client.query('begin');

    await client.query(`
      create table if not exists property_types (
        id uuid primary key,
        company_id uuid not null constraint property_types_company_id_companies_id_fk references companies(id) on delete restrict,
        name varchar(100) not null,
        is_active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        constraint property_types_id_company_id_key unique (id, company_id)
      )`);
    await client.query(
      'create unique index if not exists property_types_company_id_name_key on property_types (company_id, lower(name))',
    );

    // Staggered created_at keeps the defaults in display order when listed oldest-first
    const seeded = await client.query(
      `insert into property_types (id, company_id, name, created_at, updated_at)
       select gen_random_uuid(), c.id, d.name, now() + d.ord * interval '1 millisecond', now()
       from companies c cross join unnest($1::text[]) with ordinality as d(name, ord)
       on conflict do nothing`,
      [DEFAULT_TYPE_NAMES],
    );
    console.log(`Seeded ${seeded.rowCount} default property type row(s)`);

    await client.query('alter table properties add column if not exists property_type_id uuid');
    const backfilled = await client.query(
      `update properties p set property_type_id = pt.id
       from property_types pt
       where p.property_type_id is null and pt.company_id = p.company_id and lower(pt.name) = p.property_type::text`,
    );
    console.log(`Linked ${backfilled.rowCount} existing property row(s) to their type`);

    await client.query('alter table properties alter column property_type_id set not null');
    await client.query(
      `alter table properties add constraint properties_property_type_company_fk
       foreign key (property_type_id, company_id) references property_types(id, company_id)`,
    );
    await client.query('create index if not exists properties_property_type_id_idx on properties (property_type_id)');
    await client.query('alter table properties drop column property_type');
    await client.query('drop type if exists property_type');

    await client.query('commit');
    console.log('Done. Next: pnpm db:push to add the remaining indexes.');
  }
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
