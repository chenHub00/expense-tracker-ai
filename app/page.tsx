'use client';

import { Download, Plus, Sparkles, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { RecentExpenses } from '@/components/dashboard/RecentExpenses';
import { SummaryCards, SummaryCardsSkeleton } from '@/components/dashboard/SummaryCards';
import { useExpenseDialogs } from '@/components/providers/ExpenseDialogProvider';
import { useExpenses } from '@/components/providers/ExpenseProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card, Skeleton } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getMonthlyTotals, getSummary } from '@/lib/analytics';
import { downloadFile, expensesToCSV } from '@/lib/csv';
import { sortByDateDesc } from '@/lib/filters';
import { LOCALE, todayISO } from '@/lib/utils';

export default function DashboardPage() {
  const { expenses, isLoading, loadSampleData } = useExpenses();
  const { openCreate } = useExpenseDialogs();
  const toast = useToast();

  const summary = useMemo(() => getSummary(expenses), [expenses]);
  const monthly = useMemo(() => getMonthlyTotals(expenses, 6), [expenses]);
  const recent = useMemo(() => sortByDateDesc(expenses).slice(0, 5), [expenses]);

  // Computed client-side only (after load) so server and client markup always match.
  const monthName = isLoading ? null : new Date().toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });

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

  const handleExport = () => {
    downloadFile(`expenses-${todayISO()}.csv`, expensesToCSV(sortByDateDesc(expenses)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={monthName ? `Overview of your spending · ${monthName}` : 'Overview of your spending'}
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={isLoading || expenses.length === 0}>
              <Download className="h-4 w-4" aria-hidden />
              Export Data
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Add expense
            </Button>
          </>
        }
      />

      {isLoading ? (
        <>
          <SummaryCardsSkeleton />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </>
      ) : expenses.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="Start tracking your spending"
            description="Add your first expense to see summaries, trends and category breakdowns here. Or load demo data to explore the app."
          >
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Add your first expense
            </Button>
            <Button variant="secondary" onClick={handleLoadSample}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Load sample data
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <SummaryCards summary={summary} />
          <div className="grid gap-6 lg:grid-cols-2">
            <MonthlyChart data={monthly} />
            <CategoryBreakdown expenses={expenses} />
          </div>
          <RecentExpenses expenses={recent} />
        </div>
      )}
    </div>
  );
}
