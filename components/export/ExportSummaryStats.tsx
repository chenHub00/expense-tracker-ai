import type { ExportSummary } from '@/lib/export/types';
import { formatCurrency, formatDate } from '@/lib/utils';

/** "Oct 4", "Apr 10 – Oct 4" within one year, otherwise "Dec 2025 – Oct 2026". */
export function formatSpan(first: string | null, last: string | null): string {
  if (!first || !last) return '—';
  const dayMonth: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (first === last) return formatDate(first, dayMonth);
  if (first.slice(0, 4) === last.slice(0, 4)) return `${formatDate(first, dayMonth)} – ${formatDate(last, dayMonth)}`;
  const monthYear: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  return `${formatDate(first, monthYear)} – ${formatDate(last, monthYear)}`;
}

export function ExportSummaryStats({ summary }: { summary: Pick<ExportSummary, 'count' | 'total' | 'firstDate' | 'lastDate'> }) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200" aria-live="polite">
      <Stat label="Records" value={summary.count.toLocaleString('en-US')} />
      <Stat label="Total" value={formatCurrency(summary.total)} />
      <Stat label="Dates" value={formatSpan(summary.firstDate, summary.lastDate)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3 sm:px-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 sm:text-base">{value}</p>
    </div>
  );
}
