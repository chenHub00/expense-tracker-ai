import type { Category, Expense } from './types';

export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export interface ExpenseFilters {
  search: string;
  category: Category | 'All';
  from: string;
  to: string;
  sort: SortOption;
}

export const DEFAULT_FILTERS: ExpenseFilters = {
  search: '',
  category: 'All',
  from: '',
  to: '',
  sort: 'date-desc',
};

export const SORT_LABELS: Record<SortOption, string> = {
  'date-desc': 'Newest first',
  'date-asc': 'Oldest first',
  'amount-desc': 'Highest amount',
  'amount-asc': 'Lowest amount',
};

export function hasActiveFilters(filters: ExpenseFilters): boolean {
  return (
    filters.search.trim() !== '' || filters.category !== 'All' || filters.from !== '' || filters.to !== ''
  );
}

function compare(a: Expense, b: Expense, sort: SortOption): number {
  switch (sort) {
    case 'date-asc':
      return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
    case 'amount-desc':
      return b.amount - a.amount || b.date.localeCompare(a.date);
    case 'amount-asc':
      return a.amount - b.amount || b.date.localeCompare(a.date);
    case 'date-desc':
    default:
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  }
}

export function applyFilters(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  const query = filters.search.trim().toLowerCase();
  return expenses
    .filter((e) => {
      if (filters.category !== 'All' && e.category !== filters.category) return false;
      // ISO dates compare correctly as strings.
      if (filters.from && e.date < filters.from) return false;
      if (filters.to && e.date > filters.to) return false;
      if (
        query &&
        !e.description.toLowerCase().includes(query) &&
        !e.category.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => compare(a, b, filters.sort));
}

export function sortByDateDesc(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => compare(a, b, 'date-desc'));
}
