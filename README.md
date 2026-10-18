# RMS Backend

Property Dealer Management System API — NestJS 12 (ESM) + Drizzle ORM + PostgreSQL.

## Requirements

- Node.js >= 22
- pnpm >= 11 (`corepack enable pnpm`)
- PostgreSQL 14+

This project uses **pnpm only** — `packageManager` is pinned in `package.json` and project settings live in `pnpm-workspace.yaml`. Do not run `npm install`; it will produce a `package-lock.json` that conflicts with `pnpm-lock.yaml`.

## Getting started

```bash
pnpm install
cp .env.example .env     # then fill in DATABASE_URL, the two JWT secrets and MAIL_*
pnpm db:migrate          # applies src/database/migrations to the database
pnpm db:seed             # creates the super admin from SEED_SUPER_ADMIN_* (set SEED_SUPER_ADMIN_PASSWORD first)
pnpm start:dev
```

With `PORT=5000` from `.env.example` (the port the frontend expects):

- API: `http://localhost:5000/api/v1`
- Swagger UI: `http://localhost:5000/docs`
- Probes: `http://localhost:5000/health/liveness`, `/health/readiness`

Without `PORT` set, the server falls back to `3000`. See [Configuration](#configuration) for every variable.

Generate a JWT secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm start:dev` | Watch-mode dev server |
| `pnpm start:debug` | Watch-mode dev server with the debugger attached |
| `pnpm build` | Compile to `dist/` |
| `pnpm start:prod` | Run the compiled build |
| `pnpm lint` | oxlint with type-aware rules |
| `pnpm format` | Prettier over `src/` and `test/` |
| `pnpm test` | Unit tests (vitest) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:cov` | Unit tests with coverage |
| `pnpm test:e2e` | End-to-end tests |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema straight to the DB without a migration (throwaway local prototyping only — never production) |
| `pnpm db:reset` | Drop and recreate `DATABASE_URL`'s database (tables, triggers, functions, extensions, everything) so the next `db:migrate` builds it fresh. Connects via the `postgres` maintenance database, disconnects open sessions, and refuses with `NODE_ENV=production` |
| `pnpm db:seed` | Create the super admin from `SEED_SUPER_ADMIN_*` (idempotent) |
| `pnpm db:seed:demo` | Create a demo dealership with three months of dealer data from `SEED_DEMO_ADMIN_*`, signing in with `SEED_SUPER_ADMIN_PASSWORD` (dev only, skips if the demo admin exists) |
| `pnpm db:studio` | Drizzle Studio |

## Folder structure

```
src/
├── main.ts                     # Bootstrap: helmet, compression, CORS, versioning, Swagger
├── app.module.ts               # Root module + global pipe/filter/interceptors/guards
├── bootstrap/                  # Bootstrap-time wiring kept out of main.ts
├── config/                     # Namespaced config + zod env validation
│   ├── env.validation.ts       # Single source of truth for every env var
│   ├── env.ts                  # Parsed-once env accessor
│   ├── app.config.ts           # registerAs('app')
│   ├── database.config.ts      # registerAs('database')
│   ├── jwt.config.ts           # registerAs('jwt')
│   ├── ai.config.ts            # registerAs('ai') — Gemini key, Live model, session TTL
│   └── interfaces/
├── common/                     # Cross-cutting, domain-agnostic building blocks
│   ├── constants/
│   ├── decorators/             # @Public, @Roles, @CurrentUser, @CurrentCompanyId, @SkipResponseTransform
│   ├── dto/                    # PaginationQueryDto, UuidParamDto
│   ├── enums/
│   ├── filters/                # AllExceptionsFilter
│   ├── interceptors/           # ResponseInterceptor, TimeoutInterceptor
│   ├── interfaces/
│   └── utils/                  # Reusable pure helpers (hash, ip, pagination, string, jwt)
├── database/                   # Drizzle wiring — one global module
│   ├── database.module.ts      # Provides DRIZZLE + PG_POOL, closes pool on shutdown
│   ├── database.constants.ts
│   ├── schema/                 # One file per table + barrel index
│   ├── migrations/             # Generated SQL migrations + meta/ journal — committed, never edited by hand
│   └── interfaces/             # Row types inferred from the schema
└── modules/                    # Feature modules — add new domains here
    ├── auth/                   # Register, login, refresh rotation, logout, RBAC guards
    ├── users/                  # Controller → service → repository reference pattern
    ├── companies/              # Tenants — same shape as users
    ├── property-types/         # Dealer: the company's property types
    ├── facilities/             # Dealer: the company's facilities (bedrooms, attached bath, furnished...)
    ├── contacts/               # Dealer: property owners and seekers
    ├── cities/                 # Dealer: cities, each with an active area count
    ├── areas/                  # Dealer: areas, each linked to one city
    ├── properties/             # Dealer: sale and rent listings
    ├── property-requirements/  # Dealer: seeker requests + matching listings
    ├── assistant/              # Ephemeral Gemini Live tokens for the voice assistant
    └── health/                 # Terminus liveness/readiness
```

### Conventions

- **ESM.** `package.json` sets `"type": "module"` and TypeScript uses `nodenext`, so every relative import carries a `.js` extension — including in `.ts` files.
- **Layering.** Controllers validate and delegate; services hold business rules; repositories are the only place that touches Drizzle. Adding a domain means adding a folder under `modules/` with the same shape.
- **Interfaces** live in their own files under `interfaces/` and are prefixed with `I`.
- **Reusable helpers** go in a `utils/` folder, never inlined at the call site.

## Request and response shape

**Every** response uses the same four keys, success or failure. `data` is null on failure, `error` is null on success, and `message` is always populated.

Success — wrapped by `ResponseInterceptor`:

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": { "items": [], "meta": {} },
  "error": null
}
```

Failure — normalised by `AllExceptionsFilter`:

```json
{
  "success": false,
  "message": "Validation failed. Please check the submitted fields.",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": ["email must be an email"]
  }
}
```

`error.code` is an [`ErrorCode`](src/common/enums/error-code.enum.ts) — a stable machine-readable string clients can branch on, while `message` stays human-facing and `details` carries the per-field specifics.

Set the success message per handler with `@ResponseMessage('User created successfully')`. Without it, the interceptor falls back to a default for the HTTP verb. Add `@SkipResponseTransform()` to return a payload verbatim — the health controller uses this so orchestrators see Terminus' native shape.

`DELETE` handlers return **200, not 204**, because a 204 carries no body and the envelope would never reach the client.

### List endpoints

Every list endpoint extends `PaginationQueryDto`, so it takes `page`, `limit` (max 100), `search` and `sortOrder` for free, and returns `{ items, meta }` inside `data`:

```
GET /api/v1/users?page=1&limit=20&search=aisha&role=manager&status=true
```

`sortOrder` defaults to `desc` on `created_at`, so **the newest record is always first** unless a caller asks otherwise. Ordering falls back to `id` as a tiebreaker, which is stable because ids are time-ordered UUIDv7 — two rows created in the same millisecond keep a deterministic order across pages.

Search is case-insensitive "contains" via the shared `buildSearchCondition()` helper; pass it whichever columns a module wants searchable. `LIKE` wildcards in user input are escaped, so a caller cannot widen their own query.

### Errors from the database

Repositories wrap writes in `withDatabaseErrors()`, which maps Postgres SQLSTATE codes onto proper HTTP exceptions — `23505` becomes a 409, `23503`/`23514` become 400s, deadlocks become a retryable 409. Each module supplies a constraint-name → message map (see [users.constants.ts](src/modules/users/users.constants.ts)) so a tripped constraint explains itself instead of leaking driver text.

In production the filter never returns an internal error's message; it logs the real one and returns a generic message with an `INTERNAL_ERROR` code.

## Auth

`JwtAuthGuard` and `RolesGuard` are registered globally, so **every route is protected by default**.

- `@Public()` opts a route out of authentication.
- `@Roles(UserRole.SUPER_ADMIN, UserRole.CLIENT_ADMIN)` restricts a route to specific roles.
- `@CurrentUser()` injects `{ id, role, companyId }`; `@CurrentUser('id')` injects one field.
- `@CurrentCompanyId()` injects the caller's `companyId` and returns 403 when the account has none — dealer routes use it to scope every query.

Login uses **email**, which is unique across all users. Roles are `super_admin` (platform-level, no company), `client_admin` (owns a company), `manager`, `staff`, `customer`.

**Every `/users` and `/companies` route is `super_admin` only.** The restriction is declared once with `@Roles(UserRole.SUPER_ADMIN)` at the controller class, so a new route inherits it rather than having to remember it. The `/auth` routes stay open to their normal audiences — `register`, `login`, `refresh` and `logout` are public, `me` and `logout-all` need any authenticated user.

## Property dealer (client_admin)

A `client_admin` is a dealer, and their company is the dealership. Every dealer route is declared once with `@Roles(UserRole.CLIENT_ADMIN)` and scoped with `@CurrentCompanyId()`, so the company always comes from the token, never the request — a dealer can never read or change another dealer's rows. A record from another company answers 404, exactly like a missing one.

| Route | Purpose |
| --- | --- |
| `/property-types` | The dealer's own types. Creating a company copies `DEFAULT_PROPERTY_TYPES` (House, Shop, …) into it, and the dealer can rename, deactivate or add to every one of them. Names are unique per dealer, case-insensitive. |
| `/facilities` | Same shape and rules as property types, starting from `DEFAULT_FACILITIES` (`1 bedroom`, `Attached bath`, `Furnished`, …). Listings and requirements of either purpose pick any number of them. |
| `/contacts` | Owners and seekers, who never sign in. `phone` is required, unique per dealer, and must be exactly 11 digits starting with `03` (e.g. `03001234567` — no spaces, dashes or `+92`), so one number can't be stored in two forms. `cnic` must look like `35202-1234567-1`. Both rules are also database CHECKs. |
| `/cities` | The dealer's cities. Names are unique per dealer, case-insensitive. Each response carries `areaCount` (active areas). A city cannot be deactivated while it still has active areas — 409 names the count. |
| `/areas` | Areas, each linked to one of the dealer's active cities by `cityId`; responses include `cityName`. Names are unique per city, case-insensitive, so two cities may share an area name. Filter with `cityId` and `status`; search matches area and city name. `PATCH` can rename an area or move it to another active city; an area in a deactivated city cannot be reactivated. |
| `/properties` | Listings with `purpose` `sale` or `rent`; `price` is the sale price or the monthly rent in whole rupees; area is in square feet. `cityId` is required and `areaId` optional; both must be active, and the area must belong to the city (the response also carries their names as `city` and `areaName`). Filters: purpose, type, property status, owner, `cityId`, `areaId`, price range, `facilityIds` (comma-separated; listing must have all of them), status. |
| `/property-requirements` | What a walk-in wants: `buy` or `rent`, optional type, budget range, optional `preferredCityId`, `preferredAreaIds` (areas of that city — they need a city), `facilityIds`. Changing the city clears areas that were not resent. |
| `GET /property-requirements/:id/matches` | Paginated active, `available` listings that fit: `buy` → `sale`, `rent` → `rent`, plus every criterion the requirement sets — the listing's city must be the preferred city, and when areas are set its area must be one of them; a listing must have every facility the requirement asks for. `matchLevel` relaxes this: `100` applies every criterion, `75` (default) ignores facilities, `50` also ignores area, `25` also ignores budget, `0` also ignores city (purpose and type only). |
| `PATCH /property-requirements/:id/match` | Body `{ propertyId }`. The seeker chose that listing: in one transaction it becomes `sold` (buy) or `rented` (rent), the requirement becomes `matched`, and `matched_property_id` links the two. Refused with 409 when the requirement is deactivated or already has a property, or the listing is deactivated or no longer `available`; 400 when the purposes don't fit. |

Two lifecycle fields sit beside the usual `status` flag:

- `properties.property_status` — `available` / `sold` / `rented`. A sale listing can only be sold and a rental only rented (service check plus `properties_status_matches_purpose`). `security_deposit` applies to rentals only and is cleared when a listing switches to sale.
- `property_requirements.requirement_status` — `open` / `matched` / `closed`. `matched_property_id` (nullable) records the listing chosen through `/:id/match`. A requirement only becomes `matched` through that route; setting it on create or `PATCH /:id` without a chosen property answers 400 (service check plus `property_requirements_matched_has_property`).

Both change through `PATCH /:id`; `/:id/match` changes both at once. Linking a deactivated type, contact or facility to a listing or requirement is refused with a 400 that names it; a facility deactivated after it was linked stays on the record.

`properties.facilities` and `property_requirements.facilities` are `uuid[]` columns of facility ids, used for both sale and rent. The API takes them as `facilityIds` and returns `facilities: [{ id, name }]` sorted by name.

## Voice assistant (Gemini Live)

`POST /assistant/session` (`client_admin` only, throttled to 10 a minute) answers 403 unless the caller's company has `voiceAssistantEnabled` (`companies.voice_assistant_enabled`, default `false`, set by a super admin through `POST`/`PATCH /companies`; `GET /auth/me` returns it for the user's company). Otherwise it issues a **single-use ephemeral Gemini Live token** so the browser can open a voice session straight to Gemini. The real API key (`GOOGLE_STUDIO_KEY`) never leaves the server: the token must open its session within 60 seconds and the session stops after `GEMINI_SESSION_TTL_MINUTES`. The response is `{ token, model, expiresAt }`.

The backend does no AI work itself. Gemini's tool calls run in the browser and go through the normal REST routes with the user's own JWT, so the role guards and company scoping above still apply to anything said by voice. Without `GOOGLE_STUDIO_KEY` the API still boots, and the route answers 503 with a message saying which variable to set; a key Gemini rejects answers 502.

### Demo data

`pnpm db:seed:demo` creates **Demo Estate & Builders** (voice assistant enabled) and a `client_admin` who signs in with `SEED_DEMO_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` — every seeded user shares the super admin password. Its rows are backdated across the last 92 days and cover every flow:

- 3 custom property types (one deactivated) and 3 custom facilities (one deactivated) on top of its copy of the defaults,
- 16 contacts — owners, seekers, one who is both, one deactivated,
- 4 cities with 19 areas — every city and area the listings use, one deactivated area (Shadman, Lahore) and one deactivated city (Multan) whose areas were deactivated first,
- 22 properties — sale and rent; available, sold and rented; one without an owner; one deactivated; one on a deactivated custom type; facilities on sale and rent listings, including default and custom ones,
- 12 requirements — buy and rent; open, matched and closed; one with any type; open ones with several matches and one with none.

It refuses to run with `NODE_ENV=production` and skips if the demo admin already exists — run `pnpm db:reset` and `pnpm db:migrate` first to reseed. The dataset lives in [demo-dataset.ts](src/database/seeds/demo/demo-dataset.ts), and its spec checks that references, dates and listing rules stay consistent when you edit it.

Refresh tokens are rotated on every use: the presented token is revoked and a new pair is issued in one transaction, and if two requests race with the same token only one wins. Each token is stored as a SHA-256 hash (it is a long random JWT, so the slow argon2 used for passwords adds nothing) and keyed by its `jti`; the client IP is stored as `inet`. Presenting an already-revoked token is treated as a replay and revokes every session for that user.

## Database workflow

1. Edit or add a table under `src/database/schema/`.
2. Export it from `src/database/schema/index.ts`.
3. `pnpm db:generate --name <what_changed>` to write the next migration under `src/database/migrations/`. Read the SQL, then commit it with the schema change.
4. `pnpm db:migrate` to apply pending migrations (same command locally and in production), then `pnpm db:seed` for seed data.

Never edit or delete a committed migration, and never `db:push` to production: a pushed change that is later migrated fails with "already exists". `0000_init` is the baseline; production and existing local databases were built with `db:push` and had it recorded as applied in `drizzle.__drizzle_migrations` without running its SQL.

Tables: `companies` (tenants) → `users` (nullable `company_id`, since `super_admin` is platform-level) → `refresh_tokens`. Dealer tables, each with a `company_id`: `property_types` and `facilities`, `contacts`, `cities` → `areas` (→ city), `properties` (→ type, owner contact, city, optional area, `created_by` user) and `property_requirements` (→ contact, optional type, optional preferred city; `preferred_area_ids` is a `uuid[]` of areas).

References between dealer tables are **composite foreign keys** that include `company_id`, e.g. `(company_id, property_type_id) → property_types(company_id, id)`, so the database itself refuses to link one company's row to another company's. `properties (city_id, area_id) → areas(city_id, id)` likewise guarantees a listing's area is in its city. Creating a company and copying its starter catalogue run in one transaction.

Full column reference, ERD and data flows: [docs/DATABASE.md](docs/DATABASE.md).

Inject the typed client with `@Inject(DRIZZLE) private readonly db: IDrizzleDb`.

### Primary keys are UUIDv7

Every table's `id` defaults to [`uuidv7()`](src/common/utils/uuid.util.ts), not `gen_random_uuid()`. A v4 is fully random, so inserts scatter across the whole B-tree and cause page splits, poor cache locality and oversized indexes. A v7 puts a 48-bit millisecond timestamp in its leading bits, so inserts append to the right edge like a sequence while staying globally unique and non-enumerable. Values also sort chronologically as plain strings.

The generator uses RFC 9562's 12-bit counter method, so ids minted inside the same millisecond stay ordered, and it holds its ordering if the system clock steps backwards.

Because ids are no longer v4, DTOs validate with `@IsUUID()` (any version) — `@IsUUID('4')` would reject every id this app now issues.

### Lifecycle: `is_active`, not `deleted_at`

There is no soft-delete timestamp. Each row carries one boolean, the `is_active` column (`isActive` in the Drizzle schema) — `true` is active, `false` is deactivated. The API still exposes it as `status`, and the mappers translate between the two. The column name keeps it apart from the `property_status` and `requirement_status` lifecycle enums.

`DELETE /users/:id` sets it to false and returns the updated row; `PATCH /users/:id/restore` sets it back to true. Rows are never physically removed, which keeps foreign keys and audit history intact. Reads (`findById`, `findByEmail`) deliberately do **not** filter on it, so an admin can still see and restore a deactivated user, while `login` and the JWT strategy reject a deactivated account with an explicit message.

## Time and timezones

**Every datetime is stored and transmitted in UTC. No exceptions.** Four layers enforce this:

1. **Columns** are `timestamptz`, never bare `timestamp`. Postgres normalises `timestamptz` to UTC on write, so storage is UTC by definition. A plain `timestamp` column would silently store whatever wall-clock string it was handed — if you add one, you have broken this rule.
2. **The Postgres session** runs with `-c timezone=UTC` ([database.module.ts](src/database/database.module.ts)), so `now()`, `date_trunc` and `CURRENT_DATE` in raw SQL resolve in UTC rather than the server's local zone.
3. **The Node process** is pinned with `process.env.TZ = 'UTC'` ([timezone.bootstrap.ts](src/bootstrap/timezone.bootstrap.ts)), imported first in every entrypoint. Without it, log lines and any `toString()`/`toLocaleString()` drift to the host's zone.
4. **Tests** set the same, so a suite can never pass only on a developer's machine.

API responses carry ISO-8601 with a `Z` suffix (`2026-09-15T16:47:42.146Z`), because a JS `Date` serialises via `toISOString()`.

## Configuration

All environment variables are declared in [`src/config/env.validation.ts`](src/config/env.validation.ts). Startup fails with every invalid variable listed at once, so a missing secret never surfaces as a runtime error later. Add a new variable there first, then expose it through the relevant `registerAs` namespace, and add it to [`.env.example`](.env.example) and the table below.

Locally, variables are read from `.env` only (gitignored; copy it from `.env.example`). In production they come from the hosting dashboard, and real environment variables always win over the file.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | | `development` | `development`, `test` or `production` |
| `APP_NAME` | | `RMS` | Product name shown in emails (header, subjects, body) and the Swagger title |
| `PORT` | | `3000` | HTTP port (`.env.example` uses `5000`, which the frontend expects) |
| `API_PREFIX` | | `api` | Global route prefix |
| `API_VERSION` | | `1` | URI version, so routes live under `/api/v1` |
| `CORS_ORIGINS` | | `*` | Comma-separated allowed origins; include the frontend (`http://localhost:5001`) |
| `REQUEST_TIMEOUT_MS` | | `15000` | Per-request timeout |
| `LOG_LEVEL` | | `info` | `fatal`, `error`, `warn`, `info`, `debug` or `trace` |
| `SWAGGER_ENABLED` | | `true` | Serve Swagger UI |
| `SWAGGER_PATH` | | `docs` | Swagger UI path |
| `THROTTLE_TTL_MS` | | `60000` | Rate-limit window |
| `THROTTLE_LIMIT` | | `100` | Requests allowed per window |
| `DATABASE_URL` | ✔ | | Postgres connection string |
| `DATABASE_POOL_MAX` | | `10` | Max pool connections |
| `DATABASE_SSL` | | `false` | Connect over SSL |
| `DATABASE_LOG_QUERIES` | | `false` | Log every SQL query |
| `JWT_ACCESS_SECRET` | ✔ | | Access-token secret, at least 32 chars |
| `JWT_ACCESS_EXPIRES_IN` | | `15m` | Access-token lifetime |
| `JWT_REFRESH_SECRET` | ✔ | | Refresh-token secret, at least 32 chars, different from the access secret |
| `JWT_REFRESH_EXPIRES_IN` | | `7d` | Refresh-token lifetime |
| `JWT_ISSUER` | | `rms-backend` | `iss` claim |
| `SEED_SUPER_ADMIN_EMAIL` | | `superadmin@mifa.mifa` | Super admin created by `pnpm db:seed` |
| `SEED_SUPER_ADMIN_PASSWORD` | for seeding | | Password (8–128 chars) for every seeded user |
| `SEED_SUPER_ADMIN_NAME` | | `Super Admin` | Super admin display name |
| `SEED_DEMO_ADMIN_EMAIL` | | `clientadmin@mifa.mifa` | Demo client admin created by `pnpm db:seed:demo`; further seeded client admins use `clientadmin2@mifa.mifa`, `clientadmin3@mifa.mifa`, ... |
| `SEED_DEMO_ADMIN_NAME` | | `Demo Client` | Demo client admin display name |
| `MAIL_HOST` | ✔ | | SMTP host for welcome and password-change emails |
| `MAIL_PORT` | | `587` | SMTP port |
| `MAIL_SECURE` | | `false` | Use TLS from the start (usually `true` for port 465) |
| `MAIL_USER` | ✔ | | SMTP username |
| `MAIL_PASSWORD` | ✔ | | SMTP password |
| `MAIL_FROM` | | `no-reply@rms.local` | Sender address || `GOOGLE_STUDIO_KEY` | | | Google AI Studio key for the voice assistant; without it `POST /assistant/session` answers 503 |
| `GEMINI_LIVE_MODEL` | | `gemini-3.8-live` | Gemini Live model |
| `GEMINI_SESSION_TTL_MINUTES` | | `30` | Voice session lifetime, 1–120 |
