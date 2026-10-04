'use client';

import { Download, Plus, Receipt, SearchX, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ExpenseFiltersBar } from '@/components/expenses/ExpenseFiltersBar';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { useExpenseDialogs } from '@/components/providers/ExpenseDialogProvider';
import { useExpenses } from '@/components/providers/ExpenseProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card, Skeleton } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { downloadFile, expensesToCSV } from '@/lib/csv';
import { DEFAULT_FILTERS, applyFilters, hasActiveFilters, type ExpenseFilters } from '@/lib/filters';
import { formatCurrency, todayISO } from '@/lib/utils';

export default function ExpensesPage() {
  const { expenses, isLoading, loadSampleData } = useExpenses();
  const { openCreate } = useExpenseDialogs();
  const toast = useToast();
  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);

  const filtered = useMemo(() => applyFilters(expenses, filters), [expenses, filters]);
  const filteredTotal = useMemo(() => filtered.reduce((acc, e) => acc + e.amount, 0), [filtered]);
  const filtering = hasActiveFilters(filters);

  const handleExport = () => {
    try {
      downloadFile(`expenses-${todayISO()}.csv`, expensesToCSV(filtered));
      toast.success({
        title: 'Export complete',
        description: `${filtered.length} ${filtered.length === 1 ? 'expense' : 'expenses'} exported to CSV.`,
      });
    } catch {
      toast.error({ title: 'Export failed', description: 'Your browser blocked the download.' });
    }
  };

  const handleLoadSample = () => {
    try {
      const count = loadSampleData();
      toast.success({ title: 'Sample data loaded', description: `${count} demo expenses were added.` });
    } catch (error) {
      toast.error({
        title: 'Could not load sample data',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Search, filter and manage all of your expenses."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={isLoading || filtered.length === 0}
              title={filtering ? 'Export the filtered expenses' : 'Export all expenses'}
            >
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Add expense
            </Button>
          </>
        }
      />

      <ExpenseFiltersBar filters={filters} onChange={setFilters} />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
            description="Expenses you add will appear here. You can search, filter, edit and export them."
          >
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Add expense
            </Button>
            <Button variant="secondary" onClick={handleLoadSample}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Load sample data
            </Button>
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No matching expenses"
            description="Try a different search term, category or date range."
          >
            <Button variant="secondary" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-sm sm:px-6">
              <p className="text-slate-500" aria-live="polite">
                Showing <span className="font-medium text-slate-900">{filtered.length}</span>
                {filtering && <> of {expenses.length}</>} {expenses.length === 1 ? 'expense' : 'expenses'}
              </p>
              <p className="text-slate-500">
                Total <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(filteredTotal)}</span>
              </p>
            </div>
            <ExpenseList expenses={filtered} />
          </>
        )}
      </Card>
    </div>
  );
}
