import { CATEGORIES, type Category, type Expense } from '../types';
import { sortByDateDesc } from '../filters';
import { todayISO } from '../utils';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  /** Inclusive YYYY-MM-DD bounds; empty means unbounded. */
  from: string;
  to: string;
  categories: Category[];
  /** Base filename without extension. */
  filename: string;
}

export interface ExportSummary {
  count: number;
  total: number;
  /** Earliest and latest dates actually present in the selection. */
  firstDate: string | null;
  lastDate: string | null;
  byCategory: Array<{ category: Category; count: number; total: number }>;
}

export function defaultExportOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    format: 'csv',
    from: '',
    to: '',
    categories: [...CATEGORIES],
    filename: '',
    ...overrides,
  };
}

export function isRangeInvalid(options: Pick<ExportOptions, 'from' | 'to'>): boolean {
  return Boolean(options.from && options.to && options.from > options.to);
}

/** Applies the date and category options and returns the rows newest first. */
export function selectExpenses(expenses: Expense[], options: ExportOptions): Expense[] {
  const categories = new Set(options.categories);
  return sortByDateDesc(
    expenses.filter(
      (e) =>
        categories.has(e.category) &&
        (!options.from || e.date >= options.from) &&
        (!options.to || e.date <= options.to),
    ),
  );
}

export function summarize(expenses: Expense[]): ExportSummary {
  const byCategory = new Map<Category, { count: number; total: number }>();
  let total = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;
  for (const e of expenses) {
    total += e.amount;
    if (!firstDate || e.date < firstDate) firstDate = e.date;
    if (!lastDate || e.date > lastDate) lastDate = e.date;
    const entry = byCategory.get(e.category) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += e.amount;
    byCategory.set(e.category, entry);
  }
  return {
    count: expenses.length,
    // Round once at the end to avoid floating point drift in the displayed total.
    total: Math.round(total * 100) / 100,
    firstDate,
    lastDate,
    byCategory: CATEGORIES.filter((c) => byCategory.has(c)).map((c) => ({
      category: c,
      count: byCategory.get(c)!.count,
      total: Math.round(byCategory.get(c)!.total * 100) / 100,
    })),
  };
}

export function suggestFilename(options: Pick<ExportOptions, 'from' | 'to'>): string {
  if (options.from && options.to) return `expenses-${options.from}-to-${options.to}`;
  if (options.from) return `expenses-since-${options.from}`;
  if (options.to) return `expenses-until-${options.to}`;
  return `expenses-${todayISO()}`;
}

/** Strips characters that are invalid in filenames on common operating systems. */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\.(csv|json|pdf)$/i, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*-[\s-]*/g, '-')
    .trim()
    .slice(0, 120);
}
