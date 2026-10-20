# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev         # http://localhost:3000
npm run build && npm start
npm run lint        # next lint (next/core-web-vitals)
npm run typecheck   # tsc --noEmit
```

There is no test framework configured. Requires Node 18.17+.

## Architecture

Next.js 14 App Router + TypeScript + Tailwind, fully client-side: no backend or API routes. Two pages (`app/page.tsx` dashboard, `app/expenses/page.tsx` list) are `'use client'` and use the `@/` path alias.

State flows through three nested providers mounted in `components/providers/Providers.tsx` (via `app/layout.tsx`):

- `ExpenseProvider` is the single source of truth. It loads from `localStorage` in an effect (so SSR renders a loading state, `isLoading`), keeps `expensesRef` in sync with state so consecutive mutations build on the latest list, and `commit()` calls `saveExpenses` **before** updating state, so a `StorageError` (quota, blocked storage) leaves the UI unchanged. Mutations throw `StorageError`; callers surface it via toasts. A `storage` event listener keeps multiple tabs in sync. `loadError` feeds `StorageErrorBanner`.
- `ToastProvider` handles notifications (including delete Undo, which uses `restoreExpense`).
- `ExpenseDialogProvider` owns the add/edit/delete-confirm modals, so any component can open them from context.

Pure logic lives in `lib/` and is kept free of React: `storage.ts` (key `expense-tracker:expenses:v1`; invalid records are silently dropped on load, an unreadable payload throws), `validation.ts` (form rules), `filters.ts` (search/filter/sort), `analytics.ts` (dashboard summaries and chart data), `csv.ts` (export of the *filtered* list, with formula-injection protection). Charts in `components/dashboard/` are hand-built, with no chart library.

## Conventions worth knowing

- Expense dates are local `YYYY-MM-DD` strings. Use `parseISODate` / `toISODate` / `todayISO` from `lib/utils.ts`; never `new Date(iso)`, which shifts by timezone.
- Categories are defined once in `lib/types.ts` (`CATEGORIES`, `isCategory`); presentation per category is in `lib/categories.ts`. Adding a category means updating both, and old stored data must still pass `isExpense` in `storage.ts`.
- Currency/locale are the `LOCALE` and `CURRENCY` constants in `lib/utils.ts`.
- If the persisted `Expense` shape changes, bump the `:v1` storage key and handle migration in `storage.ts`.
- `bigPrompt.txt` is the original product spec that was used to generate the app; `README.md` has the feature list.
