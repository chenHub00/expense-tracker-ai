'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useExpenseDialogs } from '@/components/providers/ExpenseDialogProvider';
import { CategoryBadge, CategoryIcon } from '@/components/ui/CategoryBadge';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

function RowActions({ expense }: { expense: Expense }) {
  const { openEdit, requestDelete } = useExpenseDialogs();
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => openEdit(expense)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
        aria-label={`Edit ${expense.description}`}
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => requestDelete(expense)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Delete ${expense.description}`}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  return (
    <>
      {/* Desktop table */}
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th scope="col" className="py-3 pl-6 pr-3">
              Description
            </th>
            <th scope="col" className="px-3 py-3">
              Category
            </th>
            <th scope="col" className="px-3 py-3">
              Date
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Amount
            </th>
            <th scope="col" className="py-3 pl-3 pr-6 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {expenses.map((expense) => (
            <tr key={expense.id} className="group transition hover:bg-slate-50/70">
              <td className="py-3 pl-6 pr-3">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={expense.category} size="sm" />
                  <span className="font-medium text-slate-900">{expense.description}</span>
                </div>
              </td>
              <td className="px-3 py-3">
                <CategoryBadge category={expense.category} />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(expense.date)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-900">
                {formatCurrency(expense.amount)}
              </td>
              <td className="py-3 pl-3 pr-6">
                <div className="opacity-60 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <RowActions expense={expense} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile list */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {expenses.map((expense) => (
          <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
            <CategoryIcon category={expense.category} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{expense.description}</p>
              <p className="text-xs text-slate-500">
                {expense.category} · {formatDate(expense.date)}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(expense.amount)}</span>
              <div className="-mr-2">
                <RowActions expense={expense} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
