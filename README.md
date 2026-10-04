# Expense Tracker

A modern personal expense tracker built with **Next.js 14 (App Router)**, **TypeScript** and **Tailwind CSS**. Data is stored in your browser's `localStorage`, so you don't need a backend or an account.

## Features

- **Add, edit and delete expenses** with date, amount, category and description. Deletes ask for confirmation and offer **Undo**.
- **Form validation**: required fields, positive amounts with up to 2 decimals (max $1,000,000), no future dates, and descriptions of 2–100 characters.
- **Dashboard** with total spending, this month vs last month, daily average, top category, a 6‑month bar chart, a category donut (this month / all time) and recent expenses.
- **Expense list** with text search, category filter, date range (plus quick presets), sorting and a running total. It shows a table on desktop and cards on mobile.
- **CSV export** of the currently filtered list (Excel‑friendly UTF‑8, protected against formula injection).
- **Visual feedback**: toast notifications, loading skeletons, empty states, and a warning banner if stored data can't be read or saved.
- Multiple open tabs stay in sync. Responsive from 375px phones up to desktop.

Categories: Food, Transportation, Entertainment, Shopping, Bills, Other.

## Getting started

Requirements: Node.js 18.17+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build
npm start
```

Other scripts: `npm run lint` and `npm run typecheck`.

## Project structure

```
app/
  layout.tsx            Root layout: font, providers, navbar
  page.tsx              Dashboard
  expenses/page.tsx     Expense list, filters, export
components/
  providers/            ExpenseProvider (state + localStorage), ToastProvider, ExpenseDialogProvider (add/edit/delete modals)
  dashboard/            Summary cards, monthly chart, category breakdown, recent expenses
  expenses/             Expense form, filter bar, list/table
  ui/                   Button, Card, Modal, badges, empty state
lib/
  types.ts              Expense model and categories
  storage.ts            localStorage persistence with validation
  validation.ts         Form validation rules
  filters.ts            Search, filter and sort logic
  analytics.ts          Summaries and chart data
  csv.ts                CSV generation and download
  sampleData.ts         Demo data generator
```

## Notes

- Currency is USD (`en-US`). To change it, edit `LOCALE` and `CURRENCY` in `lib/utils.ts`.
- Data is saved under the `expense-tracker:expenses:v1` key. Clearing site data in your browser deletes your expenses, so export a CSV if you want a backup.
