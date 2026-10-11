# HTTP API and JavaScript client: specification

This is the full specification for adding an HTTP API and a JavaScript client SDK to
expense-tracker-ai. It is implemented incrementally; see [`steps.md`](./steps.md) for the
order of work. When a step and this spec disagree, ask before deviating.

## Context
- Next.js 14 (App Router) + TypeScript. Work happens on branch `feature/http-api`, which
  starts from `claude/gallant-galileo-bj8nv3` (the SOLID refactor of the export feature).
- Today all data lives in the browser's localStorage; there is no server-side data. Do NOT
  change the web UI's behaviour or storage.
- Reuse existing pure logic instead of re-implementing it:
  - `lib/types.ts`: `Expense`, `CATEGORIES`, `isCategory`
  - `lib/validation.ts`: `validateExpense(values, today)` and `toExpenseInput` (the API must
    return the same field messages as the UI)
  - `lib/filters.ts`: `applyFilters`, `SortOption`
  - `lib/analytics.ts`: `getSummary`, `getMonthlyTotals`, `getCategoryTotals`
  - `lib/export/`: `createExportService`, format registry (csv, json, pdf), `FileSaver`
    abstraction
  - `lib/csv.ts`: CSV escaping
- Scripts: `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run build`. All
  must pass at the end of every step.

## Part 1: the HTTP API (exactly these 10 routes)
Implement with Next.js route handlers under `app/v1/...`, so URLs are `/v1/...` (not
`/api/v1`). Use the Node.js runtime and `export const dynamic = 'force-dynamic'`.

| # | Method | Route | Behaviour |
|---|---|---|---|
| 1 | GET | `/v1/expenses` | Query: `search`, `category` (single value), `from`, `to` (YYYY-MM-DD, inclusive), `sort` (`date-desc` default, `date-asc`, `amount-desc`, `amount-asc`), `cursor`, `limit` (default 50, max 200). Response `{ items, next_cursor, total_count, total_amount }`, where the totals cover the whole filtered set. Cursors must be stable with ties (encode sort key + id). |
| 2 | POST | `/v1/expenses` | Create one expense. 201 with `Location` and `ETag`. |
| 3 | GET | `/v1/expenses/{id}` | 200 with `ETag`, or 404 `not_found`. |
| 4 | PATCH | `/v1/expenses/{id}` | Partial update (JSON merge). `If-Match` required (428 if missing, 412 `precondition_failed` if stale). Validate the merged record. Bumps `version`. |
| 5 | DELETE | `/v1/expenses/{id}` | Hard delete, 204. A second delete returns 404. |
| 6 | GET | `/v1/summary` | From `getSummary`, using the server clock (UTC). Response fields in snake_case: `total, count, month_total, month_count, previous_month_total, month_change, daily_average, top_category, top_category_scope`. |
| 7 | GET | `/v1/analytics/monthly?months=6` | `months` 1–24, default 6. Items `{ month: 'YYYY-MM', total, is_current }`. No locale-formatted labels. |
| 8 | GET | `/v1/analytics/categories?scope=month\|all` | From `getCategoryTotals`: `{ category, total, count, percentage }[]`. |
| 9 | POST | `/v1/exports` | Body `{ format: 'csv'\|'json'\|'pdf', from?, to?, categories?: Category[] }` (no `search`; this is intentional). CSV/JSON with ≤ 5,000 rows: 200 with the file and `Content-Disposition: attachment`. PDF, or > 5,000 rows: 202 with `Location: /v1/exports/{id}` and `{ id, status: 'pending' }`. |
| 10 | GET | `/v1/exports/{id}` | `{ id, status: 'pending'\|'running'\|'done'\|'failed', rows?, download_url? }`. `download_url` is `/v1/exports/{id}?download=1`, which streams the file on this same route (keep to 10 routes). Jobs run in-process. |

### Resource shape
```json
{ "id": "exp_…", "date": "2026-10-10", "amount": 18.4, "category": "Food",
  "description": "Lunch with Sam", "created_at": "…Z", "updated_at": "…Z", "version": 1 }
```
- Store amounts as integer cents; the API accepts and returns numbers with at most 2
  decimals.
- IDs: `exp_` plus a random URL-safe string. Export job IDs: `job_…`.
- `ETag` is `"v{version}"`.

### Validation (identical to the UI)
Convert the JSON body into the form-values shape and call `validateExpense(values, todayUTC)`:
- date required, valid, not in the future, year 2000 or later
- amount > 0, ≤ 1,000,000, at most 2 decimals (`12.345` must fail)
- category must be one of `CATEGORIES`
- description 2–100 characters after trimming

On failure, return 422:
```json
{ "error": { "code": "validation_failed", "message": "…", "fields": { "amount": "Enter a valid amount with up to 2 decimals." } } }
```

### Errors and cross-cutting behaviour
- Every error uses `{ "error": { "code", "message", "fields"? } }` and every response has an
  `X-Request-Id` header.
- Auth: `Authorization: Bearer <key>`. Keys come from env `API_KEYS`
  (`key:userId,key2:userId2`); compare with constant-time equality. Every row is scoped to
  the caller's user ID. For any `/v1/...` path, missing or invalid credentials return 401
  `unauthenticated` with `WWW-Authenticate: Bearer realm="api.expenses.example"`, **checked
  before routing**. Paths outside `/v1/` return 404 `route_not_found`.
- Malformed JSON: 400 `invalid_json`. Unknown query or body fields: 400 `invalid_request`.
  Wrong method on a known route: 405 with an `Allow` header.
- Body size limit 100 KB.

### Storage
Put storage behind an `ExpenseRepository` interface (dependency inversion), with two
implementations:
- in-memory, for tests
- SQLite, at `DATABASE_PATH` (default `./data/expenses.db`, gitignored)

Ask before installing the SQLite library. Add a seed script (`npm run api:seed`) that creates
`exp_01`…`exp_06` dated between August and October 2026 for the user of `sk_test_123`.

### Known limitations: keep them, and document them in the README
Do not fix these; they are deliberate parts of the v1 design:
- "this month" uses the server's UTC clock
- the list takes one `category` but exports take `categories[]` and no `search`
- no bulk create, update or delete
- deletes are permanent, with no restore
- no settings route (time zone, currency)
- PDF uses the built-in Helvetica font, so non-Latin text is garbled

## Part 2: JavaScript client SDK (`sdk/`)
Write an ESM TypeScript package in `sdk/`. It uses the global `fetch` and has no runtime
dependencies.
- One shared core handles: transport, auth, typed errors (`ApiError`, `ValidationError` with
  `.fields`, `NotFoundError`, `PreconditionFailedError`, `UnauthorizedError`), cursor
  pagination and export polling.
- Three fluent styles are built on that core as separate entry points.
- The usage examples below are the acceptance spec: each one must work as written and be
  covered by a test.

### A, route mirror (`sdk/src/index.ts`, `ExpensesClient`)
```js
const api = new ExpensesClient({ apiKey, baseUrl });
const page = await api.expenses.category('Food').from('2026-09-01').sort('amount-desc').limit(20).get();
page.items; page.nextCursor; await page.next();
const lunch = await api.expenses.id('exp_07').get();
await api.expenses.id('exp_07').ifMatch(lunch.etag).patch({ amount: 20 });
await api.expenses.id('exp_05').delete();
await api.expenses.post({ date: '2026-10-10', amount: 18.4, category: 'Food', description: 'Lunch with Sam' });
await api.summary.get();
await api.analytics.monthly.months(6).get();
await api.analytics.categories.scope('month').get();
const result = await api.exports.post({ format: 'csv', from: '2026-09-01', categories: ['Food', 'Bills'] });
if (result.kind === 'file') await result.saveTo('./sept.csv'); else await api.exports.id(result.jobId).get();
```

### B, immutable query builder (`sdk/src/query.ts`)
```js
const db = connect({ apiKey, baseUrl });
const food = expenses.where({ category: 'Food' });
const autumn = food.between('2026-09-01', '2026-11-30');
await db.run(autumn.orderBy('amount', 'desc').take(5));
for await (const e of db.stream(autumn)) {}      // auto-pagination
await db.count(autumn); await db.total(autumn);
await db.export(autumn, 'csv').saveTo('./autumn.csv');
await db.export(autumn, 'pdf').wait({ pollEvery: '2s' }).saveTo('./autumn.pdf');
await db.export(expenses.search('uber'), 'csv');  // must throw UnsupportedFilterError before any request
const dash = await db.dashboard();               // summary + monthly(6) + categories(month), in parallel
```
Queries are immutable: every method returns a new query.

### C, active-record models (`sdk/src/models.ts`)
```js
configure({ apiKey, baseUrl });
const lunch = await Expense.create({ date: '2026-10-10', amount: 18.4, category: 'Food', description: 'Lunch with Sam' });
const train = await Expense.find('exp_03');
await train.set({ amount: 45 }).save();           // sends only changed fields, If-Match automatic
await train.set({ description: 'Monthly pass' }).save({ onConflict: (mine, theirs) => theirs.merge(mine, { prefer: 'mine' }) });
const undo = await train.delete(); await undo();  // re-creates the expense; the new id differs (documented)
const bills = await Expense.where({ category: 'Bills' }).since('2026-08-01').latest().all();
await bills.each(e => e.set({ category: 'Other' }).save(), { concurrency: 4 });
await Report.current(); await Report.monthly({ months: 12 });
await Expense.where({ category: 'Food' }).exportAs('csv').download('./food.csv');
```

`saveTo` and `download` write files in Node; in browsers they trigger a download.
`pollEvery` accepts strings like `'2s'` or milliseconds.

## Tests and verification
- **API tests (Vitest):** call the route handlers directly with the in-memory repository.
  Cover every route, every error code above, cursor stability with tied amounts,
  ETag/If-Match flows, the 200 vs 202 export split, and that user A can't see user B's data.
- **SDK tests:** run every example above against a local API (start `next` in the test
  setup, or route `fetch` to the handlers).
- **Manual smoke test:** start `npm run dev`, then run curl commands for each route (kept in
  `docs/api-smoke.sh`).
- **Docs:** `docs/openapi.yaml` (OpenAPI 3.1) matching the implementation, plus a README
  section covering setup (`API_KEYS`, `DATABASE_PATH`, seed), curl examples, the SDK styles
  and the known limitations.
- **Final check:** `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all
  pass, and the existing UI still works (`npm run dev`, then the dashboard and expenses
  pages load).

## Rules
- Ask before adding any dependency other than the SQLite library.
- Don't commit secrets or the `data/` directory.
- Keep modules small and single-purpose (the export module in `lib/export/` is the style to
  follow).
- At the end of each step, list what you built, any deviations from this spec and why, and
  the test results.
