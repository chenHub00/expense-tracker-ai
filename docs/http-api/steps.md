# HTTP API and SDK: implementation steps

The work in [`spec.md`](./spec.md) is split into 12 steps (plus this step 0) across three
milestones. Each step adds one capability, keeps every previous test passing, and ends with
one commit. Push at the end of each milestone.

## How to run a step
Start each Claude Code session with this, then name the step:

> Work on branch `feature/http-api`. The spec is `docs/http-api/spec.md` and the step list
> is `docs/http-api/steps.md`. Do **only** the step I name. Before committing, run
> `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`; all must pass. Then
> commit with the step's message, show me the test output and a short summary, and stop.

## Progress
- [x] Step 0: Spec and scaffolding
- [ ] Step 1: Request pipeline (auth, errors, routing)
- [ ] Step 2: Domain layer and in-memory repository
- [ ] Step 3: Single-expense routes (2–5)
- [ ] Step 4: List route (1)
- [ ] Step 5: SQLite storage and seed data — **push**
- [ ] Step 6: Analytics routes (6–8)
- [ ] Step 7: Synchronous exports (route 9, small files)
- [ ] Step 8: Export jobs (route 10, PDF and large files)
- [ ] Step 9: API docs and smoke script — **push**
- [ ] Step 10: SDK core and client A (route mirror)
- [ ] Step 11: Clients B and C
- [ ] Step 12: Final hardening and review — **push**

Tick a step's box in the same commit that completes it.

---

## Milestone 1: API foundation

### Step 0: Spec and scaffolding
- **Build:**
  - branch `feature/http-api` from `claude/gallant-galileo-bj8nv3`
  - `docs/http-api/spec.md` (the full spec) and `docs/http-api/steps.md` (this file)
  - `data/` added to `.gitignore`
- **Done when:** the docs are committed; nothing else changes.
- **Commit:** `Add HTTP API spec and implementation plan`

### Step 1: Request pipeline (auth, errors, routing)
- **Build:**
  - a `withApi()` wrapper that adds:
    - `X-Request-Id`
    - `{error:{code,message}}` responses
    - Bearer auth from `API_KEYS` with constant-time compare
    - the 100 KB body limit
    - 400 `invalid_json`
    - 405 with an `Allow` header
  - a catch-all `app/v1/[...rest]/route.ts` returning 401 (no or invalid key) or 404
    `route_not_found`
  - an injectable clock, so tests can fix "now"
- **Done when:** tests cover 401 before 404, wrong-key 401, unknown route 404, malformed
  JSON 400, 413, the error shape and request IDs.
- **Commit:** `Add API request pipeline with auth and error handling`

### Step 2: Domain layer and in-memory repository
- **Build:**
  - `ExpenseRepository` interface plus an in-memory implementation
  - cents ↔ decimal conversion
  - `exp_`/`job_` ID generation
  - an adapter from the request body to `validateExpense` (UI messages, UTC "today")
  - per-user scoping in the repository
- **Done when:** unit tests cover the 2-decimal rule (`12.345` fails), cents round-tripping,
  every validation message, and user A unable to read user B's rows.
- **Commit:** `Add expense domain model, validation adapter and in-memory repository`

### Step 3: Single-expense routes (2–5)
- **Build:**
  - `POST /v1/expenses` (201, `Location`, `ETag`)
  - `GET /v1/expenses/{id}`
  - `PATCH /v1/expenses/{id}`: 428 without `If-Match`, 412 when stale, merged-record
    validation, version bump
  - `DELETE /v1/expenses/{id}`: 204, then 404
  - 400 for unknown fields
- **Done when:** handler tests cover create, read, update with a current and a stale ETag,
  update without `If-Match`, double delete, and 422 with `fields`.
- **Commit:** `Add create, read, update and delete routes for expenses`

### Step 4: List route (1)
- **Build:** `GET /v1/expenses` with search, single category, from/to, 4 sort orders, limit
  (default 50, max 200), cursor (sort key + id), and `total_count`/`total_amount` over the
  whole filtered set.
- **Done when:** tests show:
  - every filter
  - cursor stability with tied amounts (no duplicates or gaps across pages)
  - totals that don't change between pages
  - 400 for invalid `sort`, `limit` or date values
- **Commit:** `Add filtered, paginated expense listing`

### Step 5: SQLite storage and seed data
- **Build:**
  - a SQLite repository (ask before installing the library)
  - selected by `DATABASE_PATH`; the in-memory repository stays the default for tests
  - `npm run api:seed`, creating `exp_01`–`exp_06` for `sk_test_123`
- **Done when:**
  - **the same repository test suite passes against both implementations**
  - a manual curl run against `npm run dev` shows the seeded list and a create/read round
    trip
- **Commit:** `Add SQLite repository and seed script`
- **Push** (milestone 1 is a working CRUD API).

## Milestone 2: Analytics and exports

### Step 6: Analytics routes (6–8)
- **Build:**
  - `/v1/summary` (snake_case fields)
  - `/v1/analytics/monthly?months=` (1–24, ISO `YYYY-MM` keys, no labels)
  - `/v1/analytics/categories?scope=`
- **Done when:** tests with a **fixed clock** check the values against hand-computed
  fixtures, including:
  - an empty month (top category falls back to all-time)
  - `month_change: null` when last month was 0
  - 400 for invalid `months` or `scope`
- **Commit:** `Add summary and analytics routes`

### Step 7: Synchronous exports (route 9, small files)
- **Build:** `POST /v1/exports` for CSV and JSON up to 5,000 rows, using
  `createExportService` with an in-memory `FileSaver`, returning 200 with
  `Content-Disposition`.
- **Done when:** tests check:
  - the CSV bytes (BOM, escaping, formula injection)
  - the JSON shape
  - filter behaviour (`categories[]`, and that `search` is rejected with 400)
  - the filename
- **Commit:** `Add synchronous CSV and JSON exports`

### Step 8: Export jobs (route 10, PDF and large files)
- **Build:**
  - 202 plus `Location` for PDF or > 5,000 rows
  - an in-process job runner
  - `GET /v1/exports/{id}` status, and `?download=1` streaming the file
  - jobs scoped to their owner
- **Done when:** tests check:
  - the full 202 → pending → done → download flow
  - a failed job's status
  - 404 for another user's job
  - a valid PDF (`%PDF` header)
- **Commit:** `Add asynchronous export jobs with PDF support`

### Step 9: API docs and smoke script
- **Build:**
  - `docs/openapi.yaml` (OpenAPI 3.1)
  - `docs/api-smoke.sh` with curl commands for all 10 routes
  - a README section: setup, environment variables, seeding, **known limitations**
- **Done when:**
  - a test checks that every route in the OpenAPI spec exists and that each documented
    error code occurs
  - the smoke script runs cleanly against `npm run dev` (show the output)
- **Commit:** `Document the HTTP API with OpenAPI, README and smoke script`
- **Push** (milestone 2: the API is complete).

## Milestone 3: SDK

### Step 10: SDK core and client A (route mirror)
- **Build:**
  - `sdk/` ESM package with no runtime dependencies
  - transport and typed errors
  - a cursor-following page, and export polling
  - `ExpensesClient` exactly as in spec example A
- **Done when:** every example-A line passes as a test against the route handlers (a
  `fetch` adapter calls the handlers in-process).
- **Commit:** `Add SDK core and route-mirror client`

### Step 11: Clients B and C
- **Build:** the immutable query builder (B: `stream`, `count`, `total`,
  `export(...).wait()`, `dashboard()`, `UnsupportedFilterError`), then active-record models
  (C: changed fields only, automatic `If-Match`, `onConflict`, undo that returns a new ID,
  `each` with concurrency, `Report`).
- **Done when:** every example-B and example-C line passes as a test, and two "known gap"
  tests pass: B throws on a search export before sending any request; C's undo returns a
  different ID.
- **Commit:** `Add query-builder and active-record SDK clients`
- **Note:** if this step is too large in practice, split it into 11a (B) and 11b (C), each
  with its own commit.

### Step 12: Final hardening and review
- **Build:**
  - cross-user isolation tests across every route
  - an end-to-end test: SDK → `next start` → SQLite
  - a dependency audit
  - a README pass on the SDK usage
  - an adversarial review of the whole branch diff
- **Done when:**
  - all checks pass
  - a fresh clone runs: install, seed, `npm run dev`, the smoke script, then the existing UI
    loads unchanged
- **Commit:** `Harden API and SDK with isolation and end-to-end tests`
- **Push** (done; open a pull request only if you decide to).

## Why this order
- Storage sits behind an interface from step 2, so steps 3–4 run fast on the in-memory
  store. Step 5's shared test suite proves the SQLite store behaves identically.
- Exports are split by risk: the synchronous path reuses existing code (step 7); the job
  system is new machinery (step 8).
- The API is documented and pushed (step 9) **before** any SDK work starts, so the SDK is
  built against a stable contract.
- Each milestone is a usable stopping point: CRUD API, full API, then SDK.
