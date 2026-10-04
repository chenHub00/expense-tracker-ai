'use client';

import { PieChart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { getCategoryTotals, getMonthExpenses } from '@/lib/analytics';
import { CATEGORY_META } from '@/lib/categories';
import type { Expense } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

type Scope = 'month' | 'all';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CategoryBreakdown({ expenses }: { expenses: Expense[] }) {
  const [scope, setScope] = useState<Scope>('month');

  const totals = useMemo(
    () => getCategoryTotals(scope === 'month' ? getMonthExpenses(expenses, new Date()) : expenses),
    [expenses, scope],
  );
  const grandTotal = totals.reduce((acc, t) => acc + t.total, 0);

  // Precompute arc offsets for each segment of the donut.
  let offset = 0;
  const segments = totals.map((t) => {
    const length = (t.total / grandTotal) * CIRCUMFERENCE;
    const segment = { ...t, length, offset };
    offset += length;
    return segment;
  });

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Spending by category"
        description={scope === 'month' ? 'Current month' : 'All time'}
        action={
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Time range">
            {(['month', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                aria-pressed={scope === s}
                className={cn(
                  'rounded-md px-2.5 py-1 transition',
                  scope === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {s === 'month' ? 'This month' : 'All time'}
              </button>
            ))}
          </div>
        }
      />

      {totals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <PieChart className="h-8 w-8 text-slate-300" aria-hidden />
          <p className="text-sm text-slate-500">No expenses {scope === 'month' ? 'this month' : 'yet'}.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 px-5 pb-5 pt-4 sm:flex-row sm:px-6">
          <div className="relative h-40 w-40 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Category breakdown chart">
              <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="12" />
              {segments.map((s) => (
                <circle
                  key={s.category}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={CATEGORY_META[s.category].color}
                  strokeWidth="12"
                  strokeDasharray={`${s.length} ${CIRCUMFERENCE - s.length}`}
                  strokeDashoffset={-s.offset}
                  className="transition-all duration-500"
                >
                  <title>
                    {s.category}: {formatCurrency(s.total)} ({s.percentage.toFixed(1)}%)
                  </title>
                </circle>
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-base font-semibold tabular-nums text-slate-900">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <ul className="w-full space-y-2.5">
            {totals.map((t) => (
              <li key={t.category} className="text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_META[t.category].color }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-slate-700">{t.category}</span>
                  <span className="tabular-nums font-medium text-slate-900">{formatCurrency(t.total)}</span>
                  <span className="w-11 text-right tabular-nums text-xs text-slate-500">{t.percentage.toFixed(0)}%</span>
                </div>
                <div className="ml-[18px] mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${t.percentage}%`, backgroundColor: CATEGORY_META[t.category].color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
