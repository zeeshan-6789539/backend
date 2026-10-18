# CLAUDE.md

Standing rules for this repo. Read this before writing code; [README.md](README.md) explains the *why* behind each convention in depth, this file is the checklist.

## Non-negotiables

These apply to **every** task in this repo, whether or not the prompt repeats them.

### 1. No `any`

`typescript/no-explicit-any` is `error` in [.oxlintrc.json](.oxlintrc.json). Use a precise type, `unknown` plus narrowing, or a generic.

- Row types come from the schema — `typeof table.$inferSelect` / `$inferInsert` in `src/database/interfaces/i-*-row.ts`. Never hand-write a row shape.
- Interfaces live in their **own file** under an `interfaces/` folder and are prefixed `I` (`IFindUsersOptions`). Never declare one inline next to its consumer.
- When you touch a function, clear any remaining `any` in the whole function, not just the lines you changed.

### 2. Every step has a real error message

A caller must never see "Bad Request" with no explanation. Each layer owns a kind of failure:

| Layer | Handles | How |
| --- | --- | --- |
| DTO | Malformed input | `class-validator` with an explicit `message` wherever the default is vague |
| Controller | — | Validates and delegates only; no business rules, no try/catch |
| Service | Business rules | Throws `NotFound` / `Conflict` / `BadRequest` naming the record and what to do next |
| Repository | Driver errors | Wraps **every** write in `withDatabaseErrors(fn, X_CONSTRAINT_MESSAGES)` |
| Filter | Everything else | `AllExceptionsFilter` normalises the envelope and hides internals in production |

Rules that follow from that:

- Every module has a `<module>.constants.ts` mapping **constraint name → client message**. A tripped constraint must explain itself, never leak driver text.
- Messages name the thing and the fix: `` `Company "${name}" still has ${n} active user(s). Deactivate them first, then retry.` `` — not `Cannot delete company`.
- A pre-check (`assertSlugIsAvailable`) buys a friendly message; it is **not** the authority. Keep the DB constraint and its message map — two concurrent requests can both pass the check.
- After an `update`/`setStatus` that returns no row, throw `NotFound` — the row was removed mid-edit.
- Never swallow an error to return a default. Let it reach the filter.

### 3. Every list endpoint is paginated, searchable, newest-first

No exceptions, including new modules added later.

- The query DTO **extends `PaginationQueryDto`**, which supplies `page`, `limit` (max 100), `search` and `sortOrder`. Add module-specific filters on top.
- The service returns `buildPaginatedResult(items.map(toXResponse), totalItems, page, limit)` → `{ items, meta }`.
- The repository orders `direction(table.createdAt), direction(table.id)` and `sortOrder` defaults to `desc`, so **the newest record is first** unless the caller asks otherwise. `id` is the tiebreaker and is stable because ids are UUIDv7.
- Search goes through `buildSearchCondition(term, columns)` — case-insensitive contains, wildcards escaped. Pass the columns that module wants searchable.
- Count and page query run in one `Promise.all`, sharing the same `where`.
- Give the table a `(created_at DESC, id DESC)` index so the default listing needs no sort step.

## Adding a module

Copy [`src/modules/companies/`](src/modules/companies/) or [`users/`](src/modules/users/) — both are the reference shape. Neither is special; they are just the two that exist.

```
modules/<name>/
├── dto/            create / update (PartialType of create) / query (extends PaginationQueryDto) / response
├── interfaces/     i-find-<name>-options.ts, i-<name>-list-result.ts
├── mappers/        <name>.mapper.ts   — row → response DTO, strips anything secret
├── <name>.constants.ts    constraint name → message
├── <name>.repository.ts   the ONLY file that touches Drizzle
├── <name>.service.ts      business rules, throws HTTP exceptions
├── <name>.controller.ts   validate + delegate
└── <name>.module.ts
```

Then register it in [app.module.ts](src/app.module.ts). Standard service surface: `create`, `findAll`, `findOne`, `update`, `remove`, `restore`, `findRowOrFail`.

Controller checklist:

- `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` on every route — Swagger is the contract.
- `@ResponseMessage('X created successfully')` on every route.
- `@Roles(...)` **once at the class**, so a new route inherits the restriction instead of having to remember it.
- `@Param() params: UuidParamDto`, never `@Param('id') id: string` — the DTO validates it.
- `DELETE` returns `@HttpCode(HttpStatus.OK)`, because a 204 carries no body and the envelope would never arrive.

## Repo-specific gotchas

- **ESM.** Every relative import ends in `.js`, including from `.ts` files. TypeScript is `nodenext`.
- **pnpm only.** Never run `npm install` — it writes a `package-lock.json` that conflicts with `pnpm-lock.yaml`.
- **Schema changes go through migrations.** Edit the Drizzle schema; the user runs `db:generate` then `db:migrate` themselves. Never edit or delete files in `src/database/migrations/`, and never `db:push` to production.
- **`is_active`, not `deleted_at`.** One boolean per row (`isActive` in Drizzle, still `status` in the API DTOs) — `true` active, `false` deactivated. `DELETE` flips it to false, `PATCH /:id/restore` flips it back. Rows are never physically removed. Reads do *not* filter on it, so an admin can still see and restore a deactivated row; auth paths reject deactivated users explicitly.
- **Tenant references are composite FKs.** A dealer table points at another as `(company_id, x_id) → x(company_id, id)`; give a new parent table `unique(company_id, id)` and follow the same pattern.
- **UUIDv7 ids.** Validate with `@IsUUID()` (any version) — `@IsUUID('4')` rejects every id this app issues.
- **UTC everywhere.** Columns are `timestamptz`, the PG session and the Node process are both pinned to UTC.
- **Reusable helpers go in `common/utils/`**, written generically. Never inline a second copy at a call site.
- **Comments are at most one line.** No block comments, no docstrings.
- `const` by default, `let` only when actually reassigned. camelCase.
- No inline styles anywhere (not applicable to this API, but it holds if a view is ever added).

## Before saying a task is done

```bash
npx tsc --noEmit    # types
pnpm lint           # oxlint, type-aware
pnpm test           # vitest
```

All three must pass.
