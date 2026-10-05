'use client';

import { Search, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DEFAULT_FILTERS, SORT_LABELS, hasActiveFilters, type ExpenseFilters, type SortOption } from '@/lib/filters';
import { CATEGORIES, type Category } from '@/lib/types';
import { cn, toISODate } from '@/lib/utils';

interface ExpenseFiltersBarProps {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
}

const controlClass =
  'block w-full rounded-lg border-0 bg-white py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600';

export type DatePreset = { label: string; range: () => { from: string; to: string } };

export const DATE_PRESETS: DatePreset[] = [
  {
    label: 'This month',
    range: () => {
      const now = new Date();
      return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) };
    },
  },
  {
    label: 'Last month',
    range: () => {
      const now = new Date();
      return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
  {
    label: 'Last 30 days',
    range: () => {
      const now = new Date();
      return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to: toISODate(now) };
    },
  },
  {
    label: 'This year',
    range: () => {
      const now = new Date();
      return { from: toISODate(new Date(now.getFullYear(), 0, 1)), to: toISODate(now) };
    },
  },
];

export function ExpenseFiltersBar({ filters, onChange }: ExpenseFiltersBarProps) {
  const set = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => onChange({ ...filters, [key]: value });
  const activePreset = DATE_PRESETS.find((p) => {
    const r = p.range();
    return r.from === filters.from && r.to === filters.to;
  });
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <label htmlFor="filter-search" className="sr-only">
            Search expenses
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="filter-search"
            type="search"
            placeholder="Search descriptions…"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            className={cn(controlClass, 'pl-9 pr-3')}
          />
        </div>
        <div className="md:col-span-4">
          <label htmlFor="filter-category" className="sr-only">
            Category
          </label>
          <select
            id="filter-category"
            value={filters.category}
            onChange={(e) => set('category', e.target.value as Category | 'All')}
            className={cn(controlClass, 'px-3')}
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label htmlFor="filter-sort" className="sr-only">
            Sort by
          </label>
          <select
            id="filter-sort"
            value={filters.sort}
            onChange={(e) => set('sort', e.target.value as SortOption)}
            className={cn(controlClass, 'px-3')}
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <label htmlFor="filter-from" className="text-xs font-medium text-slate-500">
              From
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => set('from', e.target.value)}
              className={cn(controlClass, 'px-2.5 sm:w-auto', invalidRange && 'ring-rose-300')}
            />
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <label htmlFor="filter-to" className="text-xs font-medium text-slate-500">
              To
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => set('to', e.target.value)}
              className={cn(controlClass, 'px-2.5 sm:w-auto', invalidRange && 'ring-rose-300')}
            />
          </div>
          {invalidRange && (
            <p className="col-span-2 text-xs font-medium text-rose-600">“From” date is after “To” date.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange({ ...filters, ...preset.range() })}
              aria-pressed={activePreset === preset}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
                activePreset === preset
                  ? 'bg-indigo-600 text-white ring-indigo-600'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {preset.label}
            </button>
          ))}
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
