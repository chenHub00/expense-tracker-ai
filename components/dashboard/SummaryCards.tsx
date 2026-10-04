import { CalendarDays, TrendingDown, TrendingUp, Trophy, Wallet, type LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/CategoryBadge';
import type { SpendingSummary } from '@/lib/analytics';
import { cn, formatCurrency } from '@/lib/utils';

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  footer,
  children,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  iconClass?: string;
  footer: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', iconClass)}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
        {children}
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <div className="mt-1 text-sm text-slate-500">{footer}</div>
    </Card>
  );
}

function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) return <span>No spending last month</span>;
  const up = change > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-medium',
          // Spending more is "bad", so it's shown in red.
          up ? 'text-rose-600' : 'text-emerald-600',
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {Math.abs(change).toFixed(1)}%
      </span>
      vs last month
    </span>
  );
}

export function SummaryCards({ summary }: { summary: SpendingSummary }) {
  const { topCategory } = summary;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total spending"
        value={formatCurrency(summary.total)}
        icon={Wallet}
        iconClass="bg-indigo-50 text-indigo-600"
        footer={`${summary.count} ${summary.count === 1 ? 'expense' : 'expenses'} recorded`}
      />
      <StatCard
        label="This month"
        value={formatCurrency(summary.monthTotal)}
        icon={CalendarDays}
        iconClass="bg-sky-50 text-sky-600"
        footer={<ChangeIndicator change={summary.monthChange} />}
      />
      <StatCard
        label="Daily average"
        value={formatCurrency(summary.dailyAverage)}
        icon={TrendingUp}
        iconClass="bg-amber-50 text-amber-600"
        footer={`Across ${summary.monthCount} ${summary.monthCount === 1 ? 'expense' : 'expenses'} this month`}
      />
      <StatCard
        label="Top category"
        value={topCategory ? topCategory.category : '—'}
        icon={topCategory ? undefined : Trophy}
        iconClass="bg-slate-100 text-slate-500"
        footer={
          topCategory
            ? `${formatCurrency(topCategory.total)} · ${topCategory.percentage.toFixed(0)}% ${
                summary.topCategoryScope === 'month' ? 'this month' : 'all time'
              }`
            : 'No expenses yet'
        }
      >
        {topCategory && <CategoryIcon category={topCategory.category} size="sm" />}
      </StatCard>
    </div>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="space-y-3 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-40" />
        </Card>
      ))}
    </div>
  );
}
