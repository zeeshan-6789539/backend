import { sql, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { IIdName } from '../interfaces/i-id-name.js';

// Resolves a uuid[] column into [{ id, name }] from a lookup table, sorted by name
export const buildIdNameList = (
  idsColumn: PgColumn,
  lookupTable: PgTable,
  lookupIdColumn: PgColumn,
  lookupNameColumn: PgColumn,
): SQL<IIdName[]> =>
  sql<IIdName[]>`coalesce((select json_agg(json_build_object('id', ${lookupIdColumn}, 'name', ${lookupNameColumn}) order by ${lookupNameColumn}) from ${lookupTable} where ${lookupIdColumn} = any(${idsColumn})), '[]'::json)`;
