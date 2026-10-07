import { CATEGORIES, type Category, type Expense } from '../types';
import type { ExportSummary } from './types';

const roundCents = (value: number) => Math.round(value * 100) / 100;

export function summarize(rows: readonly Expense[]): ExportSummary {
  const byCategory = new Map<Category, { count: number; total: number }>();
  let total = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;
  for (const e of rows) {
    total += e.amount;
    if (!firstDate || e.date < firstDate) firstDate = e.date;
    if (!lastDate || e.date > lastDate) lastDate = e.date;
    const entry = byCategory.get(e.category) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += e.amount;
    byCategory.set(e.category, entry);
  }
  return {
    count: rows.length,
    // Round once at the end to avoid floating point drift.
    total: roundCents(total),
    firstDate,
    lastDate,
    byCategory: CATEGORIES.flatMap((category) => {
      const entry = byCategory.get(category);
      return entry ? [{ category, count: entry.count, total: roundCents(entry.total) }] : [];
    }),
  };
}
