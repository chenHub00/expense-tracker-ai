'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { Button } from '@/components/ui/Button';
import { CategoryIcon } from '@/components/ui/CategoryBadge';
import { Modal } from '@/components/ui/Modal';
import type { Expense, ExpenseInput } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useExpenses } from './ExpenseProvider';
import { useToast } from './ToastProvider';

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; expense: Expense }
  | { mode: 'delete'; expense: Expense };

interface ExpenseDialogContextValue {
  openCreate: () => void;
  openEdit: (expense: Expense) => void;
  requestDelete: (expense: Expense) => void;
}

const ExpenseDialogContext = createContext<ExpenseDialogContextValue | null>(null);

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

export function ExpenseDialogProvider({ children }: { children: React.ReactNode }) {
  const { addExpense, updateExpense, deleteExpense, restoreExpense } = useExpenses();
  const toast = useToast();
  const [state, setState] = useState<DialogState>({ mode: 'closed' });
  const close = useCallback(() => setState({ mode: 'closed' }), []);

  const handleCreate = (input: ExpenseInput) => {
    try {
      addExpense(input);
      toast.success({ title: 'Expense added', description: `${formatCurrency(input.amount)} · ${input.description}` });
      close();
    } catch (error) {
      toast.error({ title: 'Could not add expense', description: errorMessage(error) });
    }
  };

  const handleUpdate = (id: string, input: ExpenseInput) => {
    try {
      updateExpense(id, input);
      toast.success({ title: 'Expense updated', description: input.description });
      close();
    } catch (error) {
      toast.error({ title: 'Could not update expense', description: errorMessage(error) });
    }
  };

  const handleDelete = (expense: Expense) => {
    try {
      const removed = deleteExpense(expense.id);
      close();
      toast.success({
        title: 'Expense deleted',
        description: removed.description,
        action: {
          label: 'Undo',
          onClick: () => {
            try {
              restoreExpense(removed);
            } catch (error) {
              toast.error({ title: 'Could not restore expense', description: errorMessage(error) });
            }
          },
        },
      });
    } catch (error) {
      toast.error({ title: 'Could not delete expense', description: errorMessage(error) });
    }
  };

  const value = useMemo<ExpenseDialogContextValue>(
    () => ({
      openCreate: () => setState({ mode: 'create' }),
      openEdit: (expense) => setState({ mode: 'edit', expense }),
      requestDelete: (expense) => setState({ mode: 'delete', expense }),
    }),
    [],
  );

  return (
    <ExpenseDialogContext.Provider value={value}>
      {children}

      <Modal
        open={state.mode === 'create' || state.mode === 'edit'}
        onClose={close}
        title={state.mode === 'edit' ? 'Edit expense' : 'Add expense'}
        description={state.mode === 'edit' ? 'Update the details of this expense.' : 'Record a new expense.'}
      >
        {state.mode === 'create' && <ExpenseForm onSubmit={handleCreate} onCancel={close} />}
        {state.mode === 'edit' && (
          <ExpenseForm
            key={state.expense.id}
            expense={state.expense}
            onSubmit={(input) => handleUpdate(state.expense.id, input)}
            onCancel={close}
          />
        )}
      </Modal>

      <Modal
        open={state.mode === 'delete'}
        onClose={close}
        title="Delete expense?"
        description="This removes the expense from your records."
        size="sm"
      >
        {state.mode === 'delete' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <CategoryIcon category={state.expense.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{state.expense.description}</p>
                <p className="text-xs text-slate-500">
                  {state.expense.category} · {formatDate(state.expense.date)}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {formatCurrency(state.expense.amount)}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(state.expense)} data-autofocus>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ExpenseDialogContext.Provider>
  );
}

export function useExpenseDialogs(): ExpenseDialogContextValue {
  const context = useContext(ExpenseDialogContext);
  if (!context) throw new Error('useExpenseDialogs must be used within an ExpenseDialogProvider');
  return context;
}
