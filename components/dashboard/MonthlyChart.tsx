import { Card, CardHeader } from '@/components/ui/Card';
import type { MonthlyTotal } from '@/lib/analytics';
import { cn, formatCompactCurrency, formatCurrency, niceCeil } from '@/lib/utils';

export function MonthlyChart({ data }: { data: MonthlyTotal[] }) {
  const max = niceCeil(Math.max(...data.map((d) => d.total)));
  const ticks = [max, max / 2, 0];
  const average = data.reduce((acc, d) => acc + d.total, 0) / data.length;
  const position = (value: number) => `${(1 - value / max) * 100}%`;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Monthly spending"
        description={`Last ${data.length} months · avg ${formatCurrency(average)} / month`}
      />
      <div className="flex gap-3 px-5 pb-5 pt-8 sm:px-6">
        {/* Y axis labels */}
        <div className="relative h-[200px] w-12 shrink-0 text-xs tabular-nums text-slate-400" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: position(tick) }}>
              {formatCompactCurrency(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-[200px]">
            {ticks.map((tick) => (
              <div
                key={tick}
                className={cn('absolute inset-x-0 border-t', tick === 0 ? 'border-slate-200' : 'border-dashed border-slate-200')}
                style={{ top: position(tick) }}
                aria-hidden
              />
            ))}
            <ol className="relative flex h-full items-end gap-2 sm:gap-4" aria-label="Monthly spending">
              {data.map((month) => (
                <li key={month.key} className="group relative flex h-full flex-1 items-end justify-center">
                  <span className="sr-only">
                    {month.label}: {formatCurrency(month.total)}
                  </span>
                  <div
                    className={cn(
                      'relative w-full max-w-12 rounded-t-md transition-all duration-500',
                      month.isCurrent ? 'bg-indigo-600' : 'bg-indigo-200 group-hover:bg-indigo-400',
                      month.total > 0 && 'min-h-[3px]',
                    )}
                    style={{ height: `${(month.total / max) * 100}%` }}
                    aria-hidden
                  >
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition group-hover:opacity-100">
                      {formatCurrency(month.total)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-2 flex gap-2 sm:gap-4" aria-hidden>
            {data.map((month) => (
              <span
                key={month.key}
                className={cn(
                  'flex-1 text-center text-xs',
                  month.isCurrent ? 'font-semibold text-slate-900' : 'text-slate-500',
                )}
              >
                {month.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
