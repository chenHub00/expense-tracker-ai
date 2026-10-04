'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useExpenseDialogs } from '@/components/providers/ExpenseDialogProvider';
import { Card, CardHeader } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/CategoryBadge';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function RecentExpenses({ expenses }: { expenses: Expense[] }) {
  const { openEdit } = useExpenseDialogs();

  return (
    <Card>
      <CardHeader
        title="Recent expenses"
        description="Your latest transactions"
        action={
          <Link
            href="/expenses"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      <ul className="mt-3 divide-y divide-slate-100 pb-2">
        {expenses.map((expense) => (
          <li key={expense.id}>
            <button
              type="button"
              onClick={() => openEdit(expense)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 sm:px-6"
              aria-label={`Edit ${expense.description}`}
            >
              <CategoryIcon category={expense.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{expense.description}</p>
                <p className="text-xs text-slate-500">
                  {expense.category} · {formatDate(expense.date)}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {formatCurrency(expense.amount)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
