'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { generateSampleExpenses } from '@/lib/sampleData';
import { STORAGE_KEY, StorageError, loadExpenses, saveExpenses } from '@/lib/storage';
import type { Expense, ExpenseInput } from '@/lib/types';
import { generateId } from '@/lib/utils';

interface ExpenseContextValue {
  expenses: Expense[];
  isLoading: boolean;
  /** Error raised while loading persisted data, if any. */
  loadError: string | null;
  dismissLoadError: () => void;
  /** Mutations throw a StorageError when the change could not be persisted. */
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: ExpenseInput) => Expense;
  deleteExpense: (id: string) => Expense;
  restoreExpense: (expense: Expense) => void;
  loadSampleData: () => number;
  clearAll: () => void;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

function readStorage(): { expenses: Expense[]; error: string | null } {
  try {
    return { expenses: loadExpenses(), error: null };
  } catch (error) {
    return {
      expenses: [],
      error: error instanceof StorageError ? error.message : 'Failed to load saved expenses.',
    };
  }
}

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Mirrors state so mutations always build on the latest list, even within one render.
  const expensesRef = useRef<Expense[]>([]);

  useEffect(() => {
    const { expenses: stored, error } = readStorage();
    expensesRef.current = stored;
    setExpenses(stored);
    setLoadError(error);
    setIsLoading(false);

    // Keep multiple open tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const next = readStorage();
      expensesRef.current = next.expenses;
      setExpenses(next.expenses);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback((next: Expense[]) => {
    saveExpenses(next); // throws before state changes, so UI never shows unsaved data
    expensesRef.current = next;
    setExpenses(next);
  }, []);

  const addExpense = useCallback(
    (input: ExpenseInput) => {
      const now = new Date().toISOString();
      const expense: Expense = { ...input, id: generateId(), createdAt: now, updatedAt: now };
      commit([expense, ...expensesRef.current]);
      return expense;
    },
    [commit],
  );

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) => {
      const existing = expensesRef.current.find((e) => e.id === id);
      if (!existing) throw new StorageError('This expense no longer exists.');
      const updated: Expense = { ...existing, ...input, updatedAt: new Date().toISOString() };
      commit(expensesRef.current.map((e) => (e.id === id ? updated : e)));
      return updated;
    },
    [commit],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const existing = expensesRef.current.find((e) => e.id === id);
      if (!existing) throw new StorageError('This expense no longer exists.');
      commit(expensesRef.current.filter((e) => e.id !== id));
      return existing;
    },
    [commit],
  );

  const restoreExpense = useCallback(
    (expense: Expense) => {
      if (expensesRef.current.some((e) => e.id === expense.id)) return;
      commit([expense, ...expensesRef.current]);
    },
    [commit],
  );

  const loadSampleData = useCallback(() => {
    const sample = generateSampleExpenses();
    commit([...sample, ...expensesRef.current]);
    return sample.length;
  }, [commit]);

  const clearAll = useCallback(() => commit([]), [commit]);

  const value = useMemo<ExpenseContextValue>(
    () => ({
      expenses,
      isLoading,
      loadError,
      dismissLoadError: () => setLoadError(null),
      addExpense,
      updateExpense,
      deleteExpense,
      restoreExpense,
      loadSampleData,
      clearAll,
    }),
    [expenses, isLoading, loadError, addExpense, updateExpense, deleteExpense, restoreExpense, loadSampleData, clearAll],
  );

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

export function useExpenses(): ExpenseContextValue {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error('useExpenses must be used within an ExpenseProvider');
  return context;
}
