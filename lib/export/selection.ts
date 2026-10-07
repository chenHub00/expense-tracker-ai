import { sortByDateDesc } from '../filters';
import { CATEGORIES, type Category, type Expense } from '../types';
import type { ExportSelection } from './types';

export const ALL_TIME_SELECTION: ExportSelection = { from: '', to: '', categories: CATEGORIES };

export function isRangeInvalid({ from, to }: Pick<ExportSelection, 'from' | 'to'>): boolean {
  return Boolean(from && to && from > to);
}

function inRange(expense: Expense, { from, to }: Pick<ExportSelection, 'from' | 'to'>): boolean {
  // ISO dates compare correctly as strings.
  return (!from || expense.date >= from) && (!to || expense.date <= to);
}

/** Expenses matching the selection, newest first. An invalid range selects nothing. */
export function selectExpenses(expenses: readonly Expense[], selection: ExportSelection): Expense[] {
  if (isRangeInvalid(selection)) return [];
  const categories = new Set(selection.categories);
  return sortByDateDesc(expenses.filter((e) => categories.has(e.category) && inRange(e, selection)));
}

/** How many expenses each category has within the date range, ignoring the category choice. */
export function countByCategory(
  expenses: readonly Expense[],
  range: Pick<ExportSelection, 'from' | 'to'>,
): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  if (isRangeInvalid(range)) return counts;
  for (const e of expenses) if (inRange(e, range)) counts[e.category] += 1;
  return counts;
}

/** Adds or removes a category, keeping the canonical category order. */
export function toggleCategory(categories: readonly Category[], category: Category): Category[] {
  return categories.includes(category)
    ? categories.filter((c) => c !== category)
    : CATEGORIES.filter((c) => c === category || categories.includes(c));
}

export function includesAllCategories(selection: ExportSelection): boolean {
  return CATEGORIES.every((c) => selection.categories.includes(c));
}
