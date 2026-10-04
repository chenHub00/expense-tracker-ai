import { isCategory, type Expense } from './types';
import { isValidISODate } from './utils';

export const STORAGE_KEY = 'expense-tracker:expenses:v1';

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

function isExpense(value: unknown): value is Expense {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.date === 'string' &&
    isValidISODate(e.date) &&
    typeof e.amount === 'number' &&
    Number.isFinite(e.amount) &&
    isCategory(e.category) &&
    typeof e.description === 'string' &&
    typeof e.createdAt === 'string' &&
    typeof e.updatedAt === 'string'
  );
}

/**
 * Reads expenses from localStorage. Invalid records are skipped; a completely unreadable
 * payload raises a StorageError so the UI can tell the user.
 */
export function loadExpenses(): Expense[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new StorageError('Your browser is blocking local storage, so expenses cannot be saved.');
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StorageError('Saved expense data is corrupted and could not be loaded.');
  }
  if (!Array.isArray(parsed)) {
    throw new StorageError('Saved expense data has an unexpected format and could not be loaded.');
  }
  return parsed.filter(isExpense);
}

export function saveExpenses(expenses: Expense[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    const quota = error instanceof DOMException && error.name === 'QuotaExceededError';
    throw new StorageError(
      quota
        ? 'Storage is full. Delete some expenses or export and clear your data.'
        : 'Could not save to local storage. Check your browser privacy settings.',
    );
  }
}
