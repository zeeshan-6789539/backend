# RMS Backend

Restaurant Management System API — NestJS 12 (ESM) + Drizzle ORM + PostgreSQL.

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
pnpm db:seed:demo        # optional: a demo company and its client admin from SEED_DEMO_ADMIN_*
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
| `pnpm db:reset` | Truncate every table in `DATABASE_URL`'s `public` schema, keeping the schema (refuses with `NODE_ENV=production`) |
| `pnpm db:seed` | Create the super admin from `SEED_SUPER_ADMIN_*` (idempotent) |
| `pnpm db:seed:demo` | Create the "Demo Company" and a `client_admin` from `SEED_DEMO_ADMIN_*`, signing in with `SEED_SUPER_ADMIN_PASSWORD` (dev only, skips if the demo admin exists) |
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
│   └── interfaces/
├── common/                     # Cross-cutting, domain-agnostic building blocks
│   ├── constants/
│   ├── decorators/             # @Public, @Roles, @CurrentUser, @RateLimit, @SkipResponseTransform
│   ├── dto/                    # PaginationQueryDto, UuidParamDto
│   ├── enums/
│   ├── filters/                # AllExceptionsFilter
│   ├── guards/                 # RateLimitGuard (in-memory, per IP)
│   ├── interceptors/           # ResponseInterceptor, TimeoutInterceptor
│   ├── interfaces/
│   ├── middleware/             # Request logger
│   └── utils/                  # Reusable pure helpers (hash, pagination, string, jwt, logger)
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
- `@RateLimit(limit, ttlMs)` overrides the global `THROTTLE_LIMIT` / `THROTTLE_TTL_MS` for one route or controller.

Login uses **email**, which is unique and stored as the login identifier. Roles are `super_admin` (platform-level, no company), `client_admin` (owns a company), `manager`, `staff`, `customer`.

**Every `/users` and `/companies` route is `super_admin` only.** The restriction is declared once with `@Roles(UserRole.SUPER_ADMIN)` at the controller class, so a new route inherits it rather than having to remember it. The `/auth` routes stay open to their normal audiences — `register`, `login`, `refresh` and `logout` are public, `me` and `logout-all` need any authenticated user.

Refresh tokens are rotated on every use: the presented token is revoked and a new pair is issued. Each token is stored argon2-hashed and keyed by its `jti`. Presenting an already-revoked token is treated as a replay and revokes every session for that user.

## Database workflow

1. Edit or add a table under `src/database/schema/`.
2. Export it from `src/database/schema/index.ts`.
3. `pnpm db:generate --name <what_changed>` to write the next migration under `src/database/migrations/`. Read the SQL, then commit it with the schema change.
4. `pnpm db:migrate` to apply pending migrations (same command locally and in production), then `pnpm db:seed` for seed data.

Never edit or delete a committed migration, and never `db:push` to production: a pushed change that is later migrated fails with "already exists". `0000_init` is the baseline, generated from the current schema; a database created earlier with `db:push` should have it recorded as applied in `drizzle.__drizzle_migrations` instead of running its SQL.

Tables: `companies` (tenants) → `users` (nullable `company_id`, since `super_admin` is platform-level) → `refresh_tokens`.

Full column reference, ERD and data flows: [docs/DATABASE.md](docs/DATABASE.md).

Inject the typed client with `@Inject(DRIZZLE) private readonly db: IDrizzleDb`.

### Primary keys are UUIDv7

Every table's `id` defaults to [`uuidv7()`](src/common/utils/uuid.util.ts), not `gen_random_uuid()`. A v4 is fully random, so inserts scatter across the whole B-tree and cause page splits, poor cache locality and oversized indexes. A v7 puts a 48-bit millisecond timestamp in its leading bits, so inserts append to the right edge like a sequence while staying globally unique and non-enumerable. Values also sort chronologically as plain strings.

The generator uses RFC 9562's 12-bit counter method, so ids minted inside the same millisecond stay ordered, and it holds its ordering if the system clock steps backwards.

Because ids are no longer v4, DTOs validate with `@IsUUID()` (any version) — `@IsUUID('4')` would reject every id this app now issues.

### Lifecycle: `is_active`, not `deleted_at`

There is no soft-delete timestamp. Each row carries one boolean, the `is_active` column (`isActive` in the Drizzle schema) — `true` is active, `false` is deactivated. The API still exposes it as `status`, and the mappers translate between the two.

`DELETE /users/:id` sets `status` to false and returns the updated row; `PATCH /users/:id/restore` sets it back to true. Rows are never physically removed, which keeps foreign keys and audit history intact. Reads (`findById`, `findByEmail`) deliberately do **not** filter on `status`, so an admin can still see and restore a deactivated user, while `login` and the JWT strategy reject `status: false` with an explicit message.

## Time and timezones

**Every datetime is stored and transmitted in UTC. No exceptions.** Four layers enforce this:

1. **Columns** are `timestamptz`, never bare `timestamp`. Postgres normalises `timestamptz` to UTC on write, so storage is UTC by definition. A plain `timestamp` column would silently store whatever wall-clock string it was handed — if you add one, you have broken this rule.
2. **The Postgres session** runs with `-c timezone=UTC` ([database.module.ts](src/database/database.module.ts)), so `now()`, `date_trunc` and `CURRENT_DATE` in raw SQL resolve in UTC rather than the server's local zone.
3. **The Node process** is pinned with `process.env.TZ = 'UTC'` ([timezone.bootstrap.ts](src/bootstrap/timezone.bootstrap.ts)), imported first in every entrypoint. Without it, log lines and any `toString()`/`toLocaleString()` drift to the host's zone.
4. **Tests** set the same, so a suite can never pass only on a developer's machine.

API responses carry ISO-8601 with a `Z` suffix (`2026-09-15T16:47:42.146Z`), because a JS `Date` serialises via `toISOString()`.

## Configuration

All environment variables are declared in [`src/config/env.validation.ts`](src/config/env.validation.ts). Startup fails with every invalid variable listed at once, so a missing secret never surfaces as a runtime error later. Add a new variable there first, then expose it through the relevant `registerAs` namespace, and add it to [`.env.example`](.env.example) and the table below.

Variables are read from `.env.local` first, then `.env`; the first file that sets a variable wins.

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
| `SEED_SUPER_ADMIN_EMAIL` | | `superadmin@rms.local` | Super admin created by `pnpm db:seed` |
| `SEED_SUPER_ADMIN_PASSWORD` | for seeding | | Super admin password, 8–128 chars |
| `SEED_SUPER_ADMIN_NAME` | | `Super Admin` | Super admin display name |
| `SEED_DEMO_ADMIN_EMAIL` | | `clientadmin@mifa.mifa` | Demo client admin created by `pnpm db:seed:demo`; further seeded client admins use `clientadmin2@mifa.mifa`, `clientadmin3@mifa.mifa`, ... |
| `SEED_DEMO_ADMIN_NAME` | | `Demo Client` | Demo client admin display name |
| `MAIL_HOST` | ✔ | | SMTP host for welcome and password-change emails |
| `MAIL_PORT` | | `587` | SMTP port |
| `MAIL_SECURE` | | `false` | Use TLS from the start (usually `true` for port 465) |
| `MAIL_USER` | ✔ | | SMTP username |
| `MAIL_PASSWORD` | ✔ | | SMTP password |
| `MAIL_FROM` | | `no-reply@rms.local` | Sender address |
