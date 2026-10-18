# Database

The schema reference and the schema review for the RMS backend database.

- **Engine:** PostgreSQL, accessed through Drizzle ORM (`drizzle-orm/node-postgres`)
- **Schema source of truth:** [src/database/schema/](src/database/schema/)

The ER diagram and the design rules (UUIDv7, `is_active`, UTC, computed balances) are in the [README's Database structure section](README.md#database-structure). This file doesn't repeat them. It lists every table's constraints and indexes, then records each review finding and what was done about it.

Deployment and infrastructure (hosting, connection pooling, SSL, backups) are out of scope here.

Reviewed on 2026-10-18. Fixes applied the same day. Every item in sections 4–6 has a **Status** line.

---

## Contents

1. [Verdict and status](#1-verdict-and-status)
2. [Table reference](#2-table-reference)
3. [What is already production-grade](#3-what-is-already-production-grade)
4. [Fix before real data (P0)](#4-fix-before-real-data-p0)
5. [Should fix (P1)](#5-should-fix-p1)
6. [Cleanup and nice-to-haves (P2)](#6-cleanup-and-nice-to-haves-p2)
7. [Summary of schema changes](#7-summary-of-schema-changes)

---

## 1. Verdict and status

**The schema design is solid and production-ready.** Multi-company isolation is enforced by composite foreign keys, race conditions are closed by partial unique indexes, money uses `numeric`, timestamps are `timestamptz`, and ids are time-ordered UUIDv7.

The review found one stale migration file, missing data-integrity constraints, a few query patterns that slow down as data grows, and some unused indexes. Every P0 and P1 item is now fixed. The P2 items left open are either product decisions or only needed at much larger scale.

| # | Issue | Priority | Status |
| --- | --- | --- | --- |
| 4.1 | The committed migration (`0000_init.sql`) was stale and described a different schema | **P0** | Done |
| 4.2 | Expired refresh tokens were never deleted | **P0** | Done |
| 5.1 | No `CHECK` constraints on amounts and date ranges | P1 | Done |
| 5.2 | `numeric(10,2)` capped amounts at 99,999,999.99, and the balance cast could overflow on read | P1 | Done |
| 5.3 | The payments list and dashboard sorted by `payment_date`, but no index matched | P1 | Done |
| 5.4 | The monthly rent run inserted one row per round trip | P1 | Done |
| 5.5 | The ledger statement loaded a company's entire history into memory | P1 | Done |
| 5.6 | The dashboard computed the outstanding balance up to 3× for every lease | P1 | Done |
| 5.7 | A payment or charge could name a property/tenant that differs from its lease | P1 | Done |
| 5.8 | No record of who deactivated a payment or charge, or when | P1 | Done |
| 6.1 | Unused indexes | P2 | Done |
| 6.2 | Unreferenced `payments_id_company_id_key` | P2 | Done |
| 6.3 | Search will need trigram indexes at scale | P2 | Open (only needed at scale) |
| 6.4 | Defaults that only exist in the application | P2 | Open (needs PostgreSQL 18 or triggers) |
| 6.5 | Smaller integrity items | P2 | Partly done |
| 6.6 | Month boundaries are UTC, not the company's local time | P2 | Open (product decision) |
| 6.7 | `OUTSTANDING_BALANCE_SQL` only works in a query with joins | P2 | Open (found during the fixes) |

**After pulling these changes:** reset and re-push the database (`pnpm db:reset`, `pnpm db:push`, `pnpm db:seed`). Constraints and column types changed, so `db:push` against old data may stop and ask questions.

---

## 2. Table reference

Ten tables and five Postgres enums. Every company-scoped table carries `company_id`, and child rows reference a parent by `(id, company_id)` (see [Cross-company integrity](README.md#cross-company-integrity)).

### `companies`: the multi-tenant boundary

| Constraint / index | Definition | Used by |
| --- | --- | --- |
| PK | `id` | everything |
| `companies_created_at_idx` | `(created_at DESC, id DESC)` | super-admin company list |

Notable columns: `next_property_number` is the per-company counter. It is row-locked by `UPDATE … RETURNING` during property creation, which is race-free. `mail_password` holds AES-256-GCM ciphertext.

### `users`

| Constraint / index | Definition | Used by |
| --- | --- | --- |
| FK | `company_id → companies` (restrict, nullable) | |
| `users_email_unique_idx` | unique `(email)` | login |
| `users_super_admin_has_no_company` | `CHECK (role <> 'super_admin' OR company_id IS NULL)` | |
| `users_email_lowercase_check` | `CHECK (email = lower(email))` | |
| `users_created_at_idx` | `(created_at DESC, id DESC)` | super-admin user list |
| `users_company_created_at_idx` | `(company_id, created_at DESC, id DESC)` | company user list, active-user count |

### `refresh_tokens`

| Constraint / index | Definition | Used by |
| --- | --- | --- |
| FK | `user_id → users` (**cascade**) | |
| `refresh_tokens_user_id_idx` | `(user_id)` | `revokeAllForUser`, `deleteExpiredForUser` |

### `property_types`

| Constraint / index | Definition |
| --- | --- |
| `property_types_id_company_id_key` | unique `(id, company_id)` |
| `property_types_company_id_name_key` | unique `(company_id, lower(name))`, case-insensitive per company |
| `property_types_company_created_at_idx` | `(company_id, created_at DESC, id DESC)` |

### `properties`

| Constraint / index | Definition |
| --- | --- |
| `properties_id_company_id_key` | unique `(id, company_id)` |
| `properties_company_id_property_number_key` | unique `(company_id, property_number)` |
| `properties_rent_due_day_range_check` | `CHECK (rent_due_day BETWEEN 1 AND 28)` |
| `properties_property_type_company_fk` | `(property_type_id, company_id) → property_types(id, company_id)` |
| `properties_company_created_at_idx` | `(company_id, created_at DESC, id DESC)` serves the list |
| `properties_property_type_id_idx` | `(property_type_id)` |

### `tenants`

| Constraint / index | Definition |
| --- | --- |
| `tenants_id_company_id_key` | unique `(id, company_id)` |
| `tenants_company_created_at_idx` | `(company_id, created_at DESC, id DESC)` serves the list |

There is no uniqueness on tenant email or phone. That is a product decision: is the same person allowed twice in one company?

### `leases`

| Constraint / index | Definition |
| --- | --- |
| `leases_id_company_id_key` | unique `(id, company_id)`, referenced by `lease_rent_schedules` |
| `leases_id_property_tenant_company_key` | unique `(id, property_id, tenant_id, company_id)`, referenced by `charges` and `payments` |
| `leases_one_active_per_property_idx` | unique `(property_id) WHERE status = 'active'`, which closes the double-lease race |
| `leases_end_after_start_check` | `CHECK (end_date >= start_date)` |
| `leases_advance_amount_non_negative_check` | `CHECK (advance_amount >= 0)` |
| `leases_property_company_fk` / `leases_tenant_company_fk` | composite FKs to `properties` / `tenants` |
| `leases_property_id_idx`, `leases_tenant_id_idx` | filters on the list endpoint |
| `leases_company_created_at_idx` | serves the list |

### `lease_rent_schedules`: rent history

| Constraint / index | Definition |
| --- | --- |
| `lease_rent_schedules_current_per_lease_idx` | unique `(lease_id) WHERE is_current = true`, at most one current rent. It also serves the `LEFT JOIN … is_current = true` in every lease query |
| `lease_rent_schedules_rent_amount_positive_check` | `CHECK (rent_amount > 0)` |
| `lease_rent_schedules_effective_range_check` | `CHECK (effective_to IS NULL OR effective_to >= effective_from)` |
| `lease_rent_schedules_lease_company_fk` | `(lease_id, company_id) → leases(id, company_id)` |
| `lease_rent_schedules_lease_id_idx` | `(lease_id)` |

### `charges`: the ledger's debits and credits

| Constraint / index | Definition |
| --- | --- |
| `charges_one_monthly_rent_per_lease_month_idx` | unique `(billing_month, lease_id) WHERE charge_type = 'monthly_rent' AND is_active`, which makes double-billing impossible and serves the "already generated this month" lookup |
| `charges_amount_non_negative_check` | `CHECK (amount >= 0)`; `transaction_type` carries the sign |
| `charges_monthly_rent_has_billing_month_check` | `CHECK (charge_type <> 'monthly_rent' OR billing_month IS NOT NULL)` |
| `charges_lease_fk` | `(lease_id, property_id, tenant_id, company_id) → leases(id, property_id, tenant_id, company_id)` |
| `charges_property_company_fk` / `charges_tenant_company_fk` | composite FKs to `properties` / `tenants` |
| `charges_lease_balance_idx` | `(lease_id, is_active, transaction_type, amount)` serves the lease filter and the balance sums |
| `charges_company_created_at_idx` | `(company_id, created_at DESC, id DESC)` serves the company statement |

Audit columns: `deactivated_at`, `deactivated_by → users`, `updated_at`.

### `payments`

| Constraint / index | Definition |
| --- | --- |
| `payments_amount_paid_positive_check` | `CHECK (amount_paid > 0)` |
| `payments_lease_fk` | `(lease_id, property_id, tenant_id, company_id) → leases(id, property_id, tenant_id, company_id)` |
| `payments_property_company_fk` / `payments_tenant_company_fk` | composite FKs to `properties` / `tenants` |
| `payments_lease_balance_idx` | `(lease_id, is_active, amount_paid)` serves the lease filter and the balance sums |
| `payments_company_payment_date_idx` | `(company_id, payment_date DESC, id DESC)` serves the list, the dashboard's recent payments and its monthly totals |

Audit columns: `deactivated_at`, `deactivated_by → users`, `updated_at`.

### Enums

`user_role`, `lease_status`, `charge_type`, `transaction_type`, `payment_method`. Values are listed in the [README](README.md#enums). Adding a value later is a cheap `ALTER TYPE … ADD VALUE`. **Removing or renaming one is not.** It means creating a new type and rewriting the column, so treat enum values as permanent.

---

## 3. What is already production-grade

These were already in place before the review. Keep them.

- **Tenant isolation in the database, not just the service.** The composite `(child_id, company_id) → parent(id, company_id)` foreign keys mean a bug in one service can't attach Company A's payment to Company B's lease.
- **Race conditions closed by constraints.** One active lease per property, one current rent per lease, and one active monthly rent per lease per month are all partial unique indexes. Two concurrent requests can't both win.
- **Race-free property numbering.** `UPDATE companies SET next_property_number = next_property_number + 1 RETURNING …` row-locks the company inside the transaction.
- **Money is `numeric`**, never `float`, and travels as strings.
- **`timestamptz` plus a UTC session** for instants, and plain `date` for calendar values.
- **UUIDv7 primary keys.** Inserts land at the right edge of the B-tree (no random-page splits like v4), and the ids are not enumerable.
- **No hard deletes, `ON DELETE RESTRICT` everywhere** except `refresh_tokens` (cascade, which is correct).
- **Constraint names are mapped to friendly messages** (`withDatabaseErrors`), and Postgres error codes are mapped to 400/409.
- **No N+1 queries.** Company counts are grouped, and list pages join instead of looping.
- **Write paths that touch several tables use transactions:** lease plus rent schedule, rent change plus audit charge, company plus default types.

---

## 4. Fix before real data (P0)

### 4.1 The committed migration was stale

[src/database/migrations/](src/database/migrations/) held a `0000_init.sql` that created 3 tables with columns that no longer exist (`companies.slug`, `users.username`, `first_name`, `deleted_at`, …). The schema has 10 tables. Running `pnpm db:migrate` against an empty database would have produced a broken schema.

**Fix.**

1. Delete the stale migration and its `meta/` folder.
2. Then choose one:
   1. **Keep the `db:push` workflow:** leave the folder empty (just `.gitkeep`), so there is no wrong file to run by mistake; or
   2. **Start using migrations:** run `pnpm drizzle-kit generate --name baseline`, review and commit the SQL. Every later change then becomes `db:generate` → review → `db:migrate`, and the "no migration files" rule in [CLAUDE.md](CLAUDE.md) and the [Schema changes](README.md#schema-changes) section of the README change with it.

**Status: Done (steps 1 and 2.1).** The folder now holds only `.gitkeep`, and the `db:push` workflow is unchanged. Step 2.2 is still worth doing once real data exists, because it gives reviewable SQL and a history of schema changes.

### 4.2 Expired refresh tokens were never cleaned up

`RefreshTokensRepository.deleteExpired()` existed, but nothing called it. Every login and every token rotation inserted a row, and nothing removed them.

**Fix.**

1. Delete expired tokens regularly.
2. Optionally also delete tokens revoked more than N days ago.
3. Use a scheduled job to trigger the monthly rent run (`generateMonthlyRent`), which today only runs when someone clicks it.

**Status:**

1. **Done**, without a scheduler. `deleteExpired()` is replaced by `deleteExpiredForUser(userId)`, which runs alongside every token issue (sign-in and refresh) in [auth.service.ts](src/modules/auth/auth.service.ts). Only tokens past `expires_at` are deleted. The `user_id` index serves it, so `refresh_tokens_expires_at_idx` was dropped.
2. **Not done, on purpose.** `refresh()` uses revoked-but-unexpired rows to detect a replayed token, so they must stay until they expire.
3. **Not done.** A schedule depends on where the app runs (out of scope for this file).

---

## 5. Should fix (P1)

### 5.1 `CHECK` constraints for amounts and date ranges

DTO validation was the only thing stopping these. A bug, a script or a manual `psql` fix could bypass it.

| # | Table | Constraint |
| --- | --- | --- |
| 1 | `payments` | `amount_paid > 0` |
| 2 | `charges` | `amount >= 0` (`rent_change` rows are `0.00`; `transaction_type` carries the sign) |
| 3 | `lease_rent_schedules` | `rent_amount > 0` |
| 4 | `lease_rent_schedules` | `effective_to IS NULL OR effective_to >= effective_from` |
| 5 | `leases` | `end_date >= start_date` |
| 6 | `leases` | `advance_amount >= 0` |
| 7 | `charges` | `charge_type <> 'monthly_rent' OR billing_month IS NOT NULL` (the unique index ignores rows with a NULL `billing_month`, so a NULL would slip past the double-billing guard) |

**Status: Done, all 7.** Each constraint is in its schema file and has a message in its module's `*_CONSTRAINT_MESSAGES` map (payments, ledger, leases).

### 5.2 `numeric(10,2)` range, and an overflow on read

`numeric(10,2)` tops out at 99,999,999.99. `OUTSTANDING_BALANCE_SQL` cast the **sum** to `numeric(10,2)`, so once a lease's lifetime balance passed that, the lease list and the dashboard would have failed with a 500.

**Fix:**

1. Widen every money column to `numeric(14,2)` (up to 999,999,999,999.99).
2. Cast the balance to `numeric(14,2)`.
3. Add an upper bound to `MONEY_PATTERN` so the API rejects out-of-range input with a clear message.

**Status: Done, all 3.** Every money column in `leases`, `lease_rent_schedules`, `charges` and `payments` is `numeric(14,2)`. The balance and dashboard casts are `numeric(14,2)`. [is-money-string.decorator.ts](src/common/decorators/is-money-string.decorator.ts) now allows at most 12 whole digits.

### 5.3 Index for the payments ordering

`PaymentsRepository.findMany` orders by `(payment_date, id)` and filters by `company_id`, but the only company index was on `created_at`, so every page load sorted all of the company's payments.

**Fix:**

1. Add `(company_id, payment_date DESC, id DESC)`.
2. Change the dashboard's recent-payments tiebreaker from `created_at` to `id`, so it can use the index fully.

**Status: Done, both.** `payments_company_payment_date_idx` replaces `payments_company_created_at_idx`, which nothing used once the list sorted by payment date.

### 5.4 Monthly rent run: batch the inserts

`insertMonthlyRentCharges` ran one `INSERT … RETURNING` per lease, and one concurrent duplicate failed the entire batch.

**Fix:**

1. Insert in chunks and skip duplicates.
2. Put `billing_month` first in the one-rent-per-month unique index, so the "already generated" lookup can use it.

**Status: Done, both.** Inserts are multi-row batches of `MONTHLY_RENT_INSERT_BATCH_SIZE` (500) with `ON CONFLICT DO NOTHING`, using the new generic `chunk()` in [array.util.ts](src/common/utils/array.util.ts) (with tests). A lease skipped by a conflict is simply absent from `generated`. The index is now `(billing_month, lease_id)` under the same name, so its error message is unchanged.

### 5.5 Ledger statement loaded all history

The statement queries had no `LIMIT`, and the service merged, sorted and paged every charge and payment of the company in JavaScript.

**Fix (pick one):**

1. Require `leaseId` or a date range for the statement, or
2. Compute the running balance in SQL with a window function over a `UNION ALL` of charges and payments, then paginate in the database.

**Status: Done (option 2).** Option 1 would have broken the frontend's company-wide ledger page. [ledger.repository.ts](src/modules/ledger/ledger.repository.ts) builds one `UNION ALL` query: the running balance is `SUM(…) OVER (PARTITION BY lease_id ORDER BY created_at, id)`, and ordering, `LIMIT` and `OFFSET` happen in SQL, with a separate count query run alongside it. `GET /ledger/:id` uses the same query filtered to one entry after the window, so its balance is still lease-wide. The response shape is unchanged. Checked against local demo data: every lease's final running balance matches its outstanding balance.

### 5.6 Dashboard "outstanding leases" evaluated the balance up to 3× per lease

The query used `OUTSTANDING_BALANCE_SQL` (two correlated subqueries) in `SELECT`, `WHERE` and `ORDER BY`.

**Fix:**

1. Aggregate charges and payments once per lease and join.
2. Add covering indexes so the per-lease balance subquery (still used in the lease list) can read from the index alone.
3. Long term, if balances become the hot path: store `leases.current_balance`, maintained in the same transaction as each charge or payment write.

**Status:**

1. **Done.** `findOutstandingLeases` in [dashboard.repository.ts](src/modules/dashboard/dashboard.repository.ts) left-joins two grouped subqueries. Checked against local demo data: results match the old formula.
2. **Done.** `charges_lease_balance_idx` and `payments_lease_balance_idx` are **not** partial (`is_active` is a column instead), so they also serve lease filters that don't mention `is_active`. They replace `charges_lease_id_created_at_idx` and `payments_lease_id_idx`.
3. **Not done.** Not needed at current scale.

### 5.7 A payment or charge could disagree with its lease

The composite FKs made sure `property_id`, `tenant_id` and `lease_id` belonged to the same company, but not that the property and tenant were **that lease's**.

**Fix (pick one):**

1. Pin the triple with a unique key on `leases (id, property_id, tenant_id, company_id)` and a four-column FK from `charges` and `payments`, or
2. Drop the denormalized `property_id`/`tenant_id` from payments and charges and join through `leases`.

**Status: Done (option 1).** `charges_lease_fk` and `payments_lease_fk` replace the old `*_lease_company_fk`. Lease property and tenant can't be edited after creation, so the FK never blocks a lease update.

### 5.8 Audit trail for financial deactivation

A charge or payment "deleted" by flipping `is_active` kept no record of who did it or when.

**Fix:**

1. **Minimum:** add `updated_at`, `deactivated_at` and `deactivated_by` to `charges` and `payments`, and set them on deactivate.
2. **Broader option:** an append-only `audit_log` table written from the repositories.

**Status:**

1. **Done.** Deactivating sets `deactivated_at` and `deactivated_by` (the caller's user id, passed from the controller through the service), and restoring clears both. `updated_at` is maintained by Drizzle. These columns are not exposed in API responses yet.
2. **Not done.** Worth adding if edits, not just deactivations, ever need a history.

---

## 6. Cleanup and nice-to-haves (P2)

### 6.1 Remove indexes nothing uses

**1. Drop single-column indexes on booleans, small enums and names.** A boolean index splits the table into two huge halves, and a B-tree on `name` can't serve `ILIKE '%term%'`.

`companies_name_idx`, `companies_is_active_idx`, `users_role_idx`, `users_is_active_idx`, `property_types_is_active_idx`, `properties_name_idx`, `properties_is_active_idx`, `tenants_name_idx`, `tenants_is_active_idx`, `leases_status_idx`, `charges_is_active_idx`, `payments_is_active_idx`

**2. Drop global `(created_at DESC, id DESC)` indexes on company-scoped tables.** Every query on these tables filters by `company_id` first.

`property_types_created_at_idx`, `properties_created_at_idx`, `tenants_created_at_idx`, `leases_created_at_idx`, `charges_created_at_idx`, `payments_created_at_idx`

**3. Confirm with real usage.** After some traffic, check that every remaining index is used:

```sql
SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes ORDER BY idx_scan, relname;
```

**4. Update the CLAUDE.md list rule.**

**Status: Done (1, 2 and 4).** All 18 indexes are removed. Four more were replaced along the way: `payments_company_created_at_idx` (5.3), `charges_lease_id_created_at_idx` and `payments_lease_id_idx` (5.6), and `refresh_tokens_expires_at_idx` (4.2). [CLAUDE.md](CLAUDE.md) now says to index the column the list actually sorts by, and not to add boolean, enum or name indexes. Step 3 is for after launch.

### 6.2 `payments_id_company_id_key` was unreferenced

No table has a foreign key to `payments`, so this unique index had no consumer.

**Status: Done.** Dropped.

### 6.3 Search will need trigram indexes at scale

Every search is `ILIKE '%term%'`, which scans all of the company's rows. Past roughly 50k rows per company, add `pg_trgm` GIN indexes on the searched columns:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY tenants_name_trgm_idx ON tenants USING gin (name gin_trgm_ops);
```

**Status: Open.** Not needed at current scale. It also needs the `pg_trgm` extension created first, which `db:push` doesn't do.

### 6.4 Defaults that only exist in the application

1. `id` uses `$defaultFn(uuidv7)`, a JavaScript default, so the column has no database default. On PostgreSQL 18+ add `.default(sql\`uuidv7()\`)` alongside it.
2. `updated_at` uses `$onUpdate`, which only fires for Drizzle updates. A `BEFORE UPDATE` trigger would cover raw SQL too.

**Status: Open.** Item 1 depends on the production PostgreSQL version. Item 2 needs a trigger, which `db:push` can't manage. Every write in the app goes through Drizzle, so neither matters in normal use.

### 6.5 Smaller integrity items

1. `users.email`: add `CHECK (email = lower(email))`.
2. `payments.receipt_number`: if receipt numbers are meant to be unique per company, add a unique `(company_id, receipt_number) WHERE receipt_number IS NOT NULL`.
3. `refresh_tokens.ip_address` could be `inet` instead of `varchar(64)`.
4. Unbounded `text` columns are capped in the DTOs (500 / 2048). Keep the DTO limits in place.

**Status:**

1. **Done** (`users_email_lowercase_check`).
2. **Open.** Product decision: should two payments in one company be allowed to share a receipt number?
3. **Not done.** Optional. An unparseable client IP would make sign-in fail.
4. **No change needed.**

### 6.6 Month boundaries are UTC, not the company's local time

The billing month, the dashboard's "this month" and `CURRENT_DATE` are computed in UTC. For a company in Pakistan (UTC+5), a payment entered at 02:00 local time on the 1st falls into the **previous** month until 05:00. Fixing it means a `companies.timezone` column and per-company month boundaries.

**Status: Open.** Product decision.

### 6.7 `OUTSTANDING_BALANCE_SQL` only works in a query with joins

Found while verifying the fixes. Drizzle writes columns in a `sql` template with their table name (`"leases"."id"`) only when the query has joins. In a single-table query it writes a bare `"id"`, so the subquery's `lease_id = id` compares `charges.lease_id` with `charges.id`, and every balance comes out as `0.00`. Every current caller (the lease list and lease detail) joins `properties` and `tenants`, so the results are correct today. The comment on `ASSIGNED_TENANTS_SQL` in the properties repository describes the same behavior.

**Fix:** write the column references in `OUTSTANDING_BALANCE_SQL` with explicit table names (`"leases"."id"`), as `ASSIGNED_TENANTS_SQL` does.

**Status: Open.** It isn't a bug today, but it would break silently for any future single-table caller.

---

## 7. Summary of schema changes

What changed in each file:

| # | File | Change | Ref |
| --- | --- | --- | --- |
| 1 | `migrations/0000_init.sql` | Deleted, along with its metadata folder | 4.1 |
| 2 | `payments.schema.ts` | Requires the paid amount to be greater than zero; money widened to 14 digits; new index on company and payment date for the list and dashboard; new covering index for the balance calculation; property and tenant tied to the lease's own; who and when deactivated columns plus an updated date; unused active-flag, created-date, lease and id-plus-company indexes dropped | 5.1–5.3, 5.6–5.8, 6.1, 6.2 |
| 3 | `charges.schema.ts` | Requires the amount to be zero or more; requires a billing month on every monthly rent charge; money widened to 14 digits; billing month moved first in the one-rent-per-month unique index; new covering index for the balance calculation; property and tenant tied to the lease's own; who and when deactivated columns plus an updated date; unused active-flag, created-date and lease-by-date indexes dropped | 5.1, 5.2, 5.4, 5.6–5.8, 6.1 |
| 4 | `leases.schema.ts` | Requires the end date to be on or after the start date; requires the advance amount to be zero or more; money widened to 14 digits; new unique key on lease, property, tenant and company for payments and charges to reference; unused status and created-date indexes dropped | 5.1, 5.2, 5.7, 6.1 |
| 5 | `lease-rent-schedules.schema.ts` | Requires the rent to be greater than zero; requires the end of the effective period to be on or after its start; money widened to 14 digits | 5.1, 5.2 |
| 6 | `properties.schema.ts`, `tenants.schema.ts`, `property-types.schema.ts` | Unused single-column indexes on name, active flag and created date dropped | 6.1 |
| 7 | `companies.schema.ts`, `users.schema.ts` | Unused indexes on name, active flag and role dropped; user emails must be stored in lowercase | 6.1, 6.5 |
| 8 | `refresh-tokens.schema.ts` | Unused expiry-date index dropped | 4.2 |
| 9 | `outstanding-balance.util.ts` | Outstanding balance result widened to 14 digits so large balances don't fail | 5.2 |
