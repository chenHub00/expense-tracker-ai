import { CATEGORIES, type Category, type Expense } from '../../types';
import { summarize } from '../summary';
import type { ExportDocument, ExportSelection } from '../types';

let nextId = 0;

export function expense(date: string, category: Category, amount: number, description = 'Item'): Expense {
  nextId += 1;
  return { id: `e${nextId}`, date, category, amount, description, createdAt: `${date}T10:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z` };
}

export const SAMPLE: readonly Expense[] = [
  expense('2026-09-02', 'Food', 12.5, 'Lunch, "special"'),
  expense('2026-09-15', 'Bills', 80, 'Electricity'),
  expense('2026-10-01', 'Food', 7.25, '=SUM(A1:A9)'),
  expense('2026-10-03', 'Transportation', 30, 'Train'),
];

export const ALL: ExportSelection = { from: '', to: '', categories: CATEGORIES };

export function documentOf(rows: readonly Expense[], selection: ExportSelection = ALL): ExportDocument {
  return { rows, summary: summarize(rows), selection, generatedAt: new Date('2026-10-05T12:00:00.000Z') };
}

/** Recursively freezes a value so any mutation attempt throws in strict mode. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
