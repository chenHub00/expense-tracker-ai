# Data export: code analysis of three implementations

This document compares the three data export implementations so you can decide which to adopt, or how to combine them. Each version was checked out, built, audited and exercised in a browser, and every defect listed under "Confirmed defects" was reproduced, not just inferred from reading.

| Branch | Commit | Approach |
|---|---|---|
| `feature-data-export-v1` | `65d9206` | One "Export Data" button on the dashboard, CSV only |
| `feature-data-export-v2` | `7ac0c29` | Export dialog with formats (CSV, JSON, PDF), filters, preview |
| `feature-data-export-v3` | `eb715ce` | Export Hub page: templates, simulated cloud services, schedules, history, share links |

All three branch from `main` at `df42209`, so each diff below is against the same base.

**How this was measured**

- Code: full diff of each branch against `main`, re-read file by file.
- Build: `npm ci && npm run build` on each branch (Next.js 14.2.35); route sizes come from the Next.js build output.
- Dependencies: `npm audit --omit=dev` and `npm ls` on each branch.
- Runtime: headless Chromium (Playwright) against a production build, with **5,000 synthetic expenses** seeded into `localStorage`. "Main-thread block" is the longest single task reported by the browser's Long Tasks API.
- Disclosure: the same assistant wrote all three versions earlier in this session. To keep the review honest, findings were verified by running the code, and each one names the test that confirmed it.

---

## 1. At a glance

| | v1 | v2 | v3 |
|---|---|---|---|
| Files changed | 2 | 9 (4 new) | 21 (17 new) |
| New code (approx., excluding lockfile) | ~20 lines | ~690 lines | ~2,400 lines |
| New runtime dependencies | none | `jspdf`, `jspdf-autotable` (production tree 23 → 48 packages) | `qrcode` (production tree 23 → 55 packages) |
| Formats | CSV | CSV, JSON, PDF | CSV, JSON, Markdown, share link, QR |
| Filtering | none (all expenses) | date range, categories | fixed per template |
| Where it lives | dashboard header | dashboard → dialog | new `/exports` and `/share` pages, app-wide activity tray |
| Dashboard first-load JS | 111 kB (+1 kB vs main) | 116 kB (+6 kB) | 111 kB (+1 kB); `/exports` 113 kB |
| Code loaded on demand | none | 423 kB (PDF libraries, first PDF only) | 23 kB raw / 8 kB gzip (QR, first QR only) |
| 5,000-expense CSV, click to file | 87 ms | ~110 ms | ~2.4 s (includes ~2 s deliberate simulated delay) |
| Confirmed defects | 1 low | 2 medium, 1 low | 3 high/medium, 2 low |
| Real vs simulated | all real | all real | downloads, Markdown, share links, QR and mailto are real; email sending and the four cloud services are simulated |

---

## 2. Shared baseline (on `main`, used by all three)

- **`lib/csv.ts`**: `expensesToCSV` with formula-injection protection (cells starting with `= + - @ Tab CR` get a `'` prefix) and RFC 4180 quoting; `downloadFile` builds a `Blob` with a UTF-8 BOM, then clicks a temporary `<a download>` link.
- **`ExpenseProvider`**: React context holding the expense list, persisted to `localStorage` key `expense-tracker:expenses:v1`, with cross-tab sync via the `storage` event.
- **`Modal`**: accessible dialog (focus trap, Escape to close, scroll lock, focus restored on close).
- **`ToastProvider`**: toasts auto-dismiss after 4.5 s, bottom-right on desktop.
- **Dependency audit:** `npm audit` reports 1 critical (`next` 14.2.35: Image Optimizer DoS, React Server Components request deserialization DoS, rewrite request smuggling) and 1 high (`postcss`). **These are identical on `main` and all three branches**, so none of the versions introduced them. The fix is a major Next.js upgrade, which should be tracked separately. This app is fully static and does not use the Image Optimizer, rewrites or server components, which limits the practical exposure.

---

## 3. Version 1: simple CSV button

### Files created/modified
| File | Change |
|---|---|
| `app/page.tsx` | Adds `handleExport` and an "Export Data" button next to "Add expense" |
| `lib/csv.ts` | Column order changed to Date, Category, Amount, Description |

### Architecture overview
There is no new module. The dashboard page calls the existing helpers in `lib/csv.ts` directly:

```
Dashboard button ──onClick──▶ sortByDateDesc(expenses) ──▶ expensesToCSV() ──▶ downloadFile()
```

### Key components and responsibilities
- `DashboardPage.handleExport` (`app/page.tsx:45`): one line that sorts, serialises and downloads.
- `expensesToCSV` / `downloadFile` (`lib/csv.ts`): unchanged except the column order.

### Libraries and dependencies
None added. It uses browser `Blob`, `URL.createObjectURL` and an anchor with `download`.

### Implementation patterns
- Reuses existing utilities rather than adding new ones.
- The button is disabled while loading and when there are no expenses, which avoids exporting an empty file.

### Code complexity
Trivial. No new state and no branches; the handler is a single expression.

### Error handling
- **None in the new handler** (`app/page.tsx:45`). If the download throws (rare, but possible with blocked downloads or sandboxed iframes), the click silently does nothing. The Expenses page's existing export wraps the same call in `try/catch` and shows an error toast; v1 does not.
- No success feedback (no toast), so the only signal is the browser's download UI.

### Security
- Formula injection is protected by the shared `escapeCell`.
- No data leaves the browser.

### Performance
Measured with 5,000 expenses: **87 ms** from click to file, no task over 50 ms, 255 KB file. Cost grows linearly with data and is negligible up to tens of thousands of rows.

### Extensibility and maintainability
- Very easy to maintain, but there is nothing to extend: adding a format or filter means writing v2.
- **Side effect:** changing the shared column order in `lib/csv.ts` also changes the existing Expenses-page CSV export. Anyone parsing old exports by column position would break. The change is intentional, but it should be called out in a changelog.

### Edge cases
| Case | Behaviour |
|---|---|
| No expenses | Button disabled |
| Still loading | Button disabled |
| Commas, quotes, newlines, `=SUM()` in description | Quoted and neutralised (verified) |
| Non-Latin text (`Café ☕ 日本 Привет`) | Preserved; the BOM makes Excel read it as UTF-8 (verified) |

---

## 4. Version 2: advanced export dialog

### Files created/modified
| File | Change |
|---|---|
| `lib/export/options.ts` (new) | `ExportOptions` type, `selectExpenses`, `summarize`, `suggestFilename`, `sanitizeFilename`, `isRangeInvalid` |
| `lib/export/formats.ts` (new) | Format registry (`EXPORT_FORMATS`) with async `serialize` per format; `downloadBlob` |
| `lib/export/pdf.ts` (new) | PDF rendering with jsPDF + autoTable (loaded on demand) |
| `components/export/ExportDialog.tsx` (new) | Dialog UI: format picker, date presets, category toggles, filename, summary, preview, footer |
| `app/page.tsx` | "Export" button and dialog state |
| `components/ui/Modal.tsx` | New `xl` size |
| `components/expenses/ExpenseFiltersBar.tsx` | Date presets exported as `DATE_PRESETS` for reuse |
| `package.json` / lockfile | `jspdf` ^4.2.1, `jspdf-autotable` ^5.0.8 |

### Architecture overview
The code has three layers: pure logic, a format registry, and UI.

```
ExportDialog (UI state: ExportOptions + isExporting)
   │  useMemo
   ├─▶ selectExpenses(expenses, options) ─▶ rows
   ├─▶ summarize(rows)                   ─▶ summary
   │
   └─ Export click ─▶ EXPORT_FORMATS[format].serialize({rows, summary, options})
                          ├─ csv  → Blob
                          ├─ json → Blob
                          └─ pdf  → await import('./pdf') → renderPdf → Blob
                      ─▶ downloadBlob(blob, filename) ─▶ toast ─▶ close
```

### Key components and responsibilities
- **`options.ts`**: all selection, summary and filename rules as pure functions, so they're easy to unit test (no tests were added, though).
- **`formats.ts`**: a `Record<ExportFormat, FormatDefinition>` registry. Adding a format means adding one entry and one serializer.
- **`pdf.ts`**: builds an A4 report with a header, a per-category summary table with a totals row, a striped detail table and page footers.
- **`ExportDialog.tsx`**: `ExportDialog` mounts the `Modal`; the inner `ExportForm` mounts only while the dialog is open, so every open starts with fresh options and no reset code is needed.

### Libraries and dependencies
- `jspdf` 4.2.1 and `jspdf-autotable` 5.0.8 grow the npm production tree from 23 to 48 packages.
- They are dynamically imported, so the dashboard grows by only ~5 kB. **The first PDF export fetches 423 kB of JavaScript** (measured).
- No new audit findings.

### Implementation patterns
- A single `ExportOptions` state object updated with a typed `set(key, value)` helper; everything else is derived with `useMemo` (rows, summary, per-category counts, suggested filename).
- Strategy/registry pattern for formats.
- Lazy loading for the heavy dependency.
- Reuses date presets from the filter bar instead of copying them.

### Code complexity
Moderate. `ExportDialog.tsx` is the hot spot: about 400 lines of code, 3 `useState` and 4 `useMemo` hooks, with the whole UI in one component plus small `Section` and `Stat` helpers. The library files are small and simple. Splitting the dialog into `FormatPicker`, `DateRangeField`, `CategoryPicker` and `PreviewTable` would make it easier to work on.

### Error handling
- `handleExport` (`ExportDialog.tsx:109`) wraps serialisation and download in `try/catch`. On failure it re-enables the form and shows an error toast; on success it toasts and closes.
- The loading state paints before heavy work starts (`await requestAnimationFrame`, line 113).
- The Export button is disabled with an explanation when the date range is invalid, no category is selected, or nothing matches.
- A failed dynamic import of the PDF chunk (for example, offline) is caught by the same `try/catch`.

### Security
- CSV formula-injection protection is reimplemented in `formats.ts:19`, a second copy of the logic in `lib/csv.ts`.
- Filenames are sanitised (path separators, reserved characters and control characters are removed; length capped at 120). Windows reserved names such as `CON` are not handled, but browsers sanitise download names themselves.
- PDF text is drawn as text, not HTML, so there is no injection path.
- No data leaves the browser.

### Performance (5,000 expenses)
| Action | Click to file | Longest main-thread block | Output |
|---|---|---|---|
| CSV | ~110 ms | < 50 ms | 255 KB |
| JSON | ~130 ms | < 50 ms | 714 KB |
| PDF | **6.1 s** | **1.5 s** | 3.8 MB, 144 pages, plus 423 kB JS on first use |
| Typing 9 characters in the filename box | 198 ms total (~22 ms per key) | < 50 ms | — |

- PDF rendering runs on the main thread, so the page freezes for over a second at a time on large exports. The spinner shows but can't animate during those blocks. Moving `renderPdf` into a Web Worker, or capping rows with a warning, would fix this.
- Every change to the options, including each filename keystroke, re-filters and re-sorts the full list **twice** (the `rows` memo at line 80 and `countsInRange` at line 84), because both depend on the whole `options` object. It's acceptable at 5,000 rows; splitting the dependencies (filename shouldn't affect selection) removes the waste.

### Extensibility and maintainability
- **Good.** Formats are pluggable, selection logic is pure, and the dialog only talks to the registry.
- **Weaknesses:** a duplicate CSV escaper; one large component; no tests for `selectExpenses`, `summarize` or `sanitizeFilename`, all of which are easy to test.

### Edge cases
| Case | Behaviour |
|---|---|
| Start date after end date | Inline alert; export disabled (verified) |
| No categories selected | Export disabled with a reason (verified) |
| Filters match nothing | Empty-state preview; export disabled |
| Filename with `/ : ?` or a typed extension | Cleaned: `my/report: Q3.csv` → `my-report-Q3.csv` (verified) |
| Non-Latin text in **PDF** | **Garbled**: `Café ☕ 日本 Привет` comes out as `Café & eåg, @825B` (verified; see defects) |
| Non-Latin text in CSV/JSON | Preserved (verified) |
| Dialog closed mid-export | The export still completes and downloads; harmless |

---

## 5. Version 3: cloud-integrated Export Hub

### Files created/modified
| File | Responsibility |
|---|---|
| `lib/cloud/reports.ts` (new) | Template definitions, `buildReport`, CSV/JSON/Markdown renderers, `downloadBlob` |
| `lib/cloud/destinations.ts` (new) | Destination registry: name, connection requirement, formats, progress stages, location format |
| `lib/cloud/schedule.ts` (new) | `Schedule` type, `computeNextRun`, `describeSchedule` |
| `lib/cloud/share.ts` (new) | Share payload, deflate + base64url encode/decode via `CompressionStream` |
| `lib/cloud/state.ts` (new) | Persisted hub state (`expense-tracker:cloud:v1`), load/save, `formatBytes`, `formatRelative` |
| `components/cloud/CloudProvider.tsx` (new) | App-wide context: job runner, scheduler, auto-sync, connections, schedules, history, links |
| `components/cloud/ActivityTray.tsx` (new) | Floating background-task panel on every page |
| `components/cloud/ExportFlowDialog.tsx` (new) | Three-step wizard (template, destination, details) with email and Sheets steps |
| `components/cloud/ConsentPanel.tsx` (new) | Simulated OAuth consent screen |
| `components/cloud/ShareDialog.tsx` (new) | Share options, link + QR result (`LinkResult` is reused) |
| `components/cloud/ScheduleDialog.tsx` (new) | Create or edit recurring exports |
| `components/cloud/ui.tsx` (new) | `ServiceMark`, `StatusDot`, `Toggle`, `SimulatedBadge` |
| `app/exports/page.tsx`, `layout.tsx` (new) | The hub page |
| `app/share/page.tsx`, `layout.tsx` (new) | Read-only viewer for share links (`noindex`) |
| `components/providers/Providers.tsx` | Mounts `CloudProvider` inside the expense providers |
| `components/Navbar.tsx` | "Exports" link; icon-only nav on phones |
| `components/ui/Modal.tsx` | New `lg` size |
| `package.json` / lockfile | `qrcode` ^1.5.4, `@types/qrcode` (dev) |

### Architecture overview
v3 is a client-side imitation of a service backend. A long-lived provider owns all export state and runs jobs on timers.

```
                    ┌──────────────── CloudProvider (mounted app-wide) ────────────────┐
 /exports page ───▶ │ state: connections, schedules, history, links  ⇄ localStorage     │
 ExportFlowDialog ─▶│ jobs[] (in memory) ─▶ ActivityTray                                │
 ShareDialog ──────▶│ runExport(): buildReport → renderReport(Blob) → staged setTimeouts │
 ScheduleDialog ───▶│               → finish: download | mark synced | history | toast    │
                    │ scheduler: every 20 s + on load, run due schedules                 │
                    │ auto-sync: 2.5 s after expenses change → Full Backup to services   │
                    │ createShareLink(): buildReport → deflate → base64url → /share#…    │
                    └────────────────────────────────────────────────────────────────────┘
 /share page: read #fragment → decodeShare → check expiry → render read-only report
```

### Key components and responsibilities
- **Templates** (`reports.ts`): each template has a `select(expenses, now)` returning rows and a period label; `buildReport` adds totals, a per-category breakdown and month-by-month totals. Renderers are pure functions of a `Report`.
- **Destinations** (`destinations.ts`): data-driven. Each service declares its formats, simulated progress stages and storage path, and the runner has almost no per-service branching.
- **Job runner** (`CloudProvider.runExport`): builds the file up front (so the size is known), then advances through stages with `setTimeout` (650–950 ms each) to simulate network work. It re-checks the connection at each step, so disconnecting mid-job fails the job cleanly.
- **Scheduler**: on page load and every 20 s, runs schedules whose `nextRunAt` has passed, then moves them to the next run. Missed runs collapse into one catch-up run.
- **Auto-sync**: a debounced effect on the expenses array uploads a Full Backup to each service with auto-sync on. Sync jobs appear in the tray but not in history.
- **Share links** (`share.ts`): the report is compacted to tuples, deflated with the browser's native `CompressionStream('deflate-raw')` and put in the URL **fragment**, which browsers never send to a server.

### Libraries and dependencies
- `qrcode` 1.5.4 (npm production tree: 23 → 55 packages), dynamically imported: an 8 kB gzipped chunk loaded only when a QR code is shown.
- Native browser APIs: `CompressionStream`/`DecompressionStream` (all current browsers; Safari 16.4+), `Intl.RelativeTimeFormat`, Clipboard API.
- No new audit findings.

### Implementation patterns
- Provider plus context; every action is a method on `useCloud()`.
- Refs (`expensesRef`, `stateRef`) mirror state so timers and intervals read current values without re-subscribing.
- Timers are tracked in a `Set` and cleared on unmount.
- Registries (templates, destinations) drive the UI.
- Components that hold form state mount only while open, so they reset naturally.
- Text that depends on the current date renders only after load, to avoid server/client mismatch (a hydration bug of this kind was found and fixed during development).

### Code complexity
High. `CloudProvider.tsx` (about 320 lines) combines five concerns: persistence, the job state machine, the scheduler, auto-sync and share-link creation, using 6 `useEffect`, 6 `useCallback` and 5 `useRef` hooks. `ExportFlowDialog.tsx` has 11 `useState` hooks across a wizard with per-destination branches. The `lib/cloud/*` modules are small and pure. Most complexity comes from simulating a backend in the browser; a real service would move the scheduler, sync and job state to the server, and much of the provider would go away.

### Error handling
- **Unconnected or disconnected service:** the job fails immediately or at the next step, is recorded as "Failed" in history, and the tray shows the reason.
- **Email:** invalid addresses are highlighted and block sending; a half-typed address counts as a recipient.
- **QR code too large:** caught, with a fallback message suggesting a smaller template.
- **Share-link creation failure** (no `CompressionStream`): error toast.
- **Share viewer:** handles a missing token, an undecodable token and an expired link with clear pages. It does **not** validate the rows inside a decodable token (see defects).
- **Storage:** `saveCloudState` and `loadCloudState` swallow errors, so a full or blocked `localStorage` silently drops hub state. That's acceptable for convenience data, but the user isn't told.

### Security
- **Share links are bearer tokens with unencrypted data.** Anyone holding the link can read the snapshot, and it can be decoded with any deflate tool without the app (verified: an expired link's description was recovered directly). Expiry is only enforced by the `/share` page (`app/share/page.tsx:25`), and "removing" a link from the list doesn't revoke it. The "Hide descriptions" option is real: descriptions are left out of the payload.
- **Viewer input validation is incomplete** (`lib/cloud/share.ts:57` only checks the version and that `rows` is an array). A crafted link with an unknown category crashes the page (verified). React escapes all text, so this is a denial of service on the viewer, not script injection. A decompression bomb in a link could also hang the viewer's tab, since output size isn't limited.
- **Privacy of the fragment:** the data is never sent to the server, but it is stored in browser history and in any chat or email the link is pasted into. `/share` has `noindex, nofollow`.
- **Simulated integrations:** no credentials or tokens exist; the consent screen and the "Demo" badges make that clear. In production, the "sent"/"exported" toasts for simulated services would be misleading and must be wired to real APIs or removed.
- **mailto fallback:** includes up to 25 rows in the URL; some mail clients truncate long `mailto:` URLs (roughly 2,000 characters).
- Formula-injection protection exists here too: a **third** copy of the escaper (`lib/cloud/reports.ts:119`).

### Performance (5,000 expenses)
| Action | Result |
|---|---|
| Full Backup → This device, CSV | 2.4 s click to file (about 2 s is the deliberate simulated stage delay); no task over 50 ms; 255 KB |
| Full Backup → This device, JSON | 2.6 s; 1.28 MB (includes ids and timestamps) |
| Share link size, Full Backup, 60 expenses | 1.3 KB; QR code works |
| … 500 expenses | 8.2 KB; **too large for a QR code** (fallback shown) |
| … 5,000 expenses | 74 KB; works in browsers, but many chat apps and email clients will truncate it |

- `buildReport` runs for all four templates whenever the expense list changes (the hub's and the wizard's `useMemo`): four filter-and-sort passes, which is cheap at this scale.
- During a job, the provider re-renders every `useCloud()` consumer each step (~650 ms), so the hub page re-renders a few times per export; there's no visible cost.

### Extensibility and maintainability
- **Strong data-driven design:** a new service means one `DESTINATIONS` entry (and a consent permission list); a new template means one `TEMPLATES` entry with a `select` function.
- **Weak points:** (1) the simulated backend lives in UI code, so going to production is a rewrite of the provider rather than a swap; (2) `CloudProvider` mixes concerns that should be separate hooks or modules (`useJobRunner`, `useScheduler`, `useAutoSync`, `useCloudStore`); (3) no tests, and the timer-based logic is the hardest part to test; (4) the third copy of the CSV escaper.

### Edge cases
| Case | Behaviour |
|---|---|
| App closed when a schedule was due | Runs once on next open, marked "Scheduled" (verified) |
| Two tabs open | **Hub state overwritten by the other tab** (verified; see defects) |
| Disconnect during a job | Job fails with a reason, recorded in history |
| Template with no rows | Export disabled ("no expenses to export yet") |
| Expired link | Clear "expired" page (verified) but data still decodable (see Security) |
| Broken or truncated link | "This link is not valid" page (verified) |
| Large share link | No QR; link still works |
| Phone width (375 px) | No horizontal overflow; nav switches to icons (verified) |
| Scheduled download with no user gesture | Browsers may block or prompt for "automatic downloads" after the first; not handled |

---

## 6. Technical deep dive

### How export works

| | v1 | v2 | v3 |
|---|---|---|---|
| Trigger | Button click | Dialog Export button | Wizard "Run in background", template card, history "run again", schedule, auto-sync |
| Selection | All expenses, newest first | `selectExpenses`: category set + inclusive ISO-date range, newest first | Template `select()`: year to date, current month, or all |
| Timing | Synchronous in the click handler | Async; awaits a frame, then `serialize()` | File built synchronously, then delivered through timed stages |
| Delivery | Anchor download | Anchor download | Anchor download (device), simulated upload (cloud), simulated send or `mailto:` (email), URL (share) |

### File generation

| Format | v1 | v2 | v3 |
|---|---|---|---|
| CSV | `lib/csv.ts`, BOM, CRLF, quoted, formula-safe | Own copy, same rules | Own copy, same rules; Category Analysis outputs a breakdown table instead of rows |
| JSON | — | `{generatedAt, filters, summary, expenses[date,category,amount,description]}` | `{template, title, period, generatedAt, summary{byCategory, byMonth}, expenses[full records incl. id]}`, so Full Backup is restorable (no importer exists yet) |
| PDF | — | jsPDF + autoTable, Helvetica (Latin-1 only), lazy-loaded | — |
| Markdown | — | — | GitHub-flavoured tables, pipes escaped, for Notion, Slack and GitHub |
| Share | — | — | Deflate + base64url in the URL fragment; QR via `qrcode` at error-correction level L |

### User interaction

| | v1 | v2 | v3 |
|---|---|---|---|
| Steps to export | 1 click | Open, adjust options, Export (2+ clicks) | Open wizard, template, destination, details, run (4–5 clicks), or 1 click from a template card or integration row |
| Feedback | Browser download bar only | Live summary and preview, button spinner, toast | Stepper, activity tray with per-stage progress, toast, history row, sync status |
| Accessibility | Standard button | Labelled fields, `aria-pressed` toggles, `role=radiogroup` formats, `aria-live` summary, focus trap | Same patterns plus `role=switch` toggles, `aria-current="step"`; radio groups lack arrow-key navigation (also true in v2) |

### State management

| | v1 | v2 | v3 |
|---|---|---|---|
| New state | None | Local component state: one `ExportOptions` object + `isExporting`; derived values via `useMemo` | Global context: persisted `CloudState` (localStorage) + in-memory `jobs`; refs for timer access; local form state in each dialog |
| Persistence | — | None (fresh each open) | `expense-tracker:cloud:v1`; history capped at 50 on save |
| Cross-tab | n/a | n/a | **Not synchronised** (unlike `ExpenseProvider`) |

---

## 7. Confirmed defects

Each item was reproduced as described.

| # | Version | Severity | Defect | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | v3 | **High** | Hub state isn't synced between tabs; the last tab to save overwrites the others. | Tab A connected Dropbox; tab B (opened earlier) created a schedule; stored connections became `[]`. Also, by inspection, each tab runs its own scheduler, so a due schedule can run once per open tab. | Listen for `storage` events on `expense-tracker:cloud:v1` as `ExpenseProvider` does; merge rather than overwrite; elect one scheduler tab (`BroadcastChannel` or a `navigator.locks` lock). |
| 2 | v3 | **Medium** | Share viewer crashes on a crafted link with an unknown category or malformed rows. | Token with category `"Hacked"` shows "Application error: a client-side exception has occurred". | Validate every row in `decodeShare` (ISO date, `isCategory`, finite amount, string description) and cap decompressed size. |
| 3 | v3 | **Medium** (design) | Link expiry and removal are advisory; data is readable from the link by anyone who has it. | Decoded an expired token's description directly from the link. | Say so in the UI, or encrypt the payload with a key held server-side; real expiry and revocation need a backend. |
| 4 | v2 | **Medium** | PDF can't render characters outside Latin-1 (emoji, CJK, Cyrillic, etc.). | `Café ☕ 日本 Привет` became `Café & eåg, @825B` in the PDF text. | Embed a Unicode TTF (e.g. Noto Sans) with `doc.addFileToVFS`/`addFont`, or fall back to the browser's print-to-PDF. |
| 5 | v2 | **Medium** | PDF generation blocks the main thread on large exports. | 5,000 rows: 6.1 s total, 1.5 s longest block, 144 pages. | Render in a Web Worker, or warn and cap rows above a threshold. |
| 6 | v2 | Low | The success toast covers the dialog's Export button for 4.5 s if the dialog is reopened right away. | Element at the button's centre after reopening is the "Export complete" toast; the next click waited ~4.5 s. | Close the toast on dialog open, or position toasts away from dialog footers. |
| 7 | v3 | Low | `ConsentPanel` timer isn't cancelled on unmount, so closing the dialog during "Connecting…" still connects. | By inspection (`ConsentPanel.tsx:31`). | Clear the timeout in an effect cleanup. |
| 8 | v3 | Low | QR codes only work for small reports. | Full Backup: 60 rows OK, 500 rows too large. | Expected, since QR tops out at ~2.9 KB; consider "QR for Monthly Summary only", or show it only when it fits. |
| 9 | v1 | Low | No error handling or success feedback on the dashboard export. | `app/page.tsx:45` has no `try/catch`, unlike the Expenses page export. | Wrap in `try/catch` with error and success toasts. |
| 10 | all | Low | The CSV escaping logic exists in three places (`lib/csv.ts`, `lib/export/formats.ts`, `lib/cloud/reports.ts`). | Code inspection. | Keep one `escapeCsvCell` in `lib/csv.ts` and import it. |

---

## 8. Comparison and recommendation

### Scorecard (1 = weak, 5 = strong)

| Criterion | v1 | v2 | v3 | Notes |
|---|---|---|---|---|
| Functionality | 2 | 4 | 5 | v3's breadth is partly simulated |
| Production readiness | 4 | 4 | 2 | v3 needs a backend for its core promise and has a high-severity tab bug |
| Code simplicity | 5 | 3 | 2 | |
| Architecture quality | 3 | 4 | 3 | v2 has the cleanest layering; v3's registries are good but the provider is overloaded |
| Error handling | 2 | 4 | 3 | |
| Security | 5 | 5 | 3 | v1 and v2 never leave the browser; v3's share links need clearer guarantees |
| Performance | 5 | 3 | 4 | v2's PDF is the only heavy path |
| Extensibility | 2 | 4 | 4 | |
| Test effort to reach good coverage | Low | Low–medium | High | No version adds tests |

### Recommendation
1. **Adopt v2 as the core export experience.** It solves the real user problem (get exactly the data you want in a useful format), has the cleanest structure, and everything in it actually works. Before merging, fix defects 4 and 5 (Unicode font, worker or row cap), 6, and 10.
2. **Keep v1's one-click path as a shortcut**, for example a "Quick CSV" item next to v2's dialog, using the shared CSV helper with error handling added (defect 9).
3. **Take selected parts of v3, not the whole hub:**
   - **Templates**: add them to v2 as presets that fill in date and category options (Tax Report = this year, Monthly Summary = this month).
   - **Copy as Markdown**: cheap, real and useful; add it as a v2 format.
   - **JSON Full Backup with ids**: worth keeping as the basis for a future import or restore feature.
   - **Share links**: only after fixing defect 2 and rewording the expiry promise (defect 3), or once a backend exists.
   - **Schedules, cloud integrations, auto-sync, activity tray**: treat as a product prototype. They need a server (OAuth, storage, a real scheduler) to be honest features, and defect 1 must be fixed if any of the client-side state stays.
4. **Independently:** upgrade Next.js to clear the existing critical audit findings, and add unit tests for the pure modules (`options.ts`, `reports.ts`, `schedule.ts`, `share.ts`), which are straightforward to test.

### Combined architecture sketch
```
lib/export/
  select.ts      ← v2 selectExpenses/summarize + v3 template presets
  formats/       ← csv (single escaper), json (full records), pdf (worker, Unicode font), markdown (v3)
  download.ts    ← one downloadBlob with error handling
components/export/
  ExportDialog   ← v2 dialog, with a "Template" preset row and a Markdown copy action
  QuickExport    ← v1 button using formats/csv
(later, with a backend) share/, integrations/, schedules/ from v3
```
