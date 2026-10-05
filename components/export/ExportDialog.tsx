'use client';

import { Braces, Check, FileSpreadsheet, FileText, Inbox, type LucideIcon } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { DATE_PRESETS } from '@/components/expenses/ExpenseFiltersBar';
import { useExpenses } from '@/components/providers/ExpenseProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { Modal } from '@/components/ui/Modal';
import { CATEGORY_META } from '@/lib/categories';
import { EXPORT_FORMATS, downloadBlob } from '@/lib/export/formats';
import {
  defaultExportOptions,
  isRangeInvalid,
  sanitizeFilename,
  selectExpenses,
  suggestFilename,
  summarize,
  type ExportFormat,
  type ExportOptions,
} from '@/lib/export/options';
import { CATEGORIES, type Category } from '@/lib/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const PREVIEW_LIMIT = 8;

const FORMAT_ICONS: Record<ExportFormat, LucideIcon> = {
  csv: FileSpreadsheet,
  json: Braces,
  pdf: FileText,
};

const controlClass =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Export expenses"
      description="Choose a format, narrow down the data and check the preview before downloading."
    >
      {/* Mounted only while open, so every opening starts from fresh options. */}
      <ExportForm onDone={onClose} />
    </Modal>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <legend className="text-sm font-semibold text-slate-900">{title}</legend>
        {action}
      </div>
      {children}
    </fieldset>
  );
}

function ExportForm({ onDone }: { onDone: () => void }) {
  const { expenses } = useExpenses();
  const toast = useToast();
  const ids = { from: useId(), to: useId(), filename: useId() };
  const [options, setOptions] = useState<ExportOptions>(() => defaultExportOptions());
  const [isExporting, setIsExporting] = useState(false);

  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const invalidRange = isRangeInvalid(options);
  const rows = useMemo(() => (invalidRange ? [] : selectExpenses(expenses, options)), [expenses, options, invalidRange]);
  const summary = useMemo(() => summarize(rows), [rows]);

  // Per-category counts within the chosen dates, so each chip shows what it would add.
  const countsInRange = useMemo(() => {
    const inRange = selectExpenses(expenses, { ...options, categories: [...CATEGORIES] });
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    for (const e of inRange) counts[e.category] += 1;
    return counts;
  }, [expenses, options]);

  const format = EXPORT_FORMATS[options.format];
  const suggested = suggestFilename(options);
  const baseName = sanitizeFilename(options.filename) || suggested;
  const fullName = `${baseName}.${format.extension}`;
  const activePreset = DATE_PRESETS.find((p) => {
    const r = p.range();
    return r.from === options.from && r.to === options.to;
  });
  const isAllTime = !options.from && !options.to;

  const toggleCategory = (category: Category) =>
    set(
      'categories',
      options.categories.includes(category)
        ? options.categories.filter((c) => c !== category)
        : CATEGORIES.filter((c) => c === category || options.categories.includes(c)),
    );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Let the loading state paint before potentially heavy work (PDF rendering).
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const blob = await format.serialize({ rows, summary, options, generatedAt: new Date() });
      downloadBlob(blob, fullName);
      toast.success({
        title: 'Export complete',
        description: `${summary.count} ${summary.count === 1 ? 'expense' : 'expenses'} saved to ${fullName}.`,
      });
      onDone();
    } catch (error) {
      setIsExporting(false);
      toast.error({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Something went wrong while creating the file.',
      });
    }
  };

  const disabledReason = invalidRange
    ? 'The start date must be before the end date.'
    : options.categories.length === 0
      ? 'Select at least one category.'
      : summary.count === 0
        ? 'No expenses match these options.'
        : null;

  return (
    <div className="flex flex-col">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Options */}
        <div className="space-y-6" aria-busy={isExporting}>
          <Section title="Format">
            <div role="radiogroup" aria-label="Export format" className="grid grid-cols-3 gap-2">
              {Object.values(EXPORT_FORMATS).map((f) => {
                const Icon = FORMAT_ICONS[f.id];
                const selected = options.format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-autofocus={selected ? '' : undefined}
                    disabled={isExporting}
                    onClick={() => set('format', f.id)}
                    title={f.description}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-sm font-medium ring-1 ring-inset transition',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                      selected
                        ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600'
                        : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
                    )}
                  >
                    {selected && (
                      <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-indigo-600" aria-hidden />
                    )}
                    <Icon className="h-5 w-5" aria-hidden />
                    {f.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">{format.description}</p>
          </Section>

          <Section title="Date range">
            <div className="flex flex-wrap gap-1.5">
              {[{ label: 'All time', range: () => ({ from: '', to: '' }) }, ...DATE_PRESETS].map((preset) => {
                const active = preset.label === 'All time' ? isAllTime : activePreset?.label === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={active}
                    disabled={isExporting}
                    onClick={() => setOptions((prev) => ({ ...prev, ...preset.range() }))}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
                      active
                        ? 'bg-indigo-600 text-white ring-indigo-600'
                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={ids.from} className="mb-1 block text-xs font-medium text-slate-500">
                  Start date
                </label>
                <input
                  id={ids.from}
                  type="date"
                  value={options.from}
                  max={options.to || undefined}
                  disabled={isExporting}
                  onChange={(e) => set('from', e.target.value)}
                  className={cn(controlClass, invalidRange && 'ring-rose-400')}
                />
              </div>
              <div>
                <label htmlFor={ids.to} className="mb-1 block text-xs font-medium text-slate-500">
                  End date
                </label>
                <input
                  id={ids.to}
                  type="date"
                  value={options.to}
                  min={options.from || undefined}
                  disabled={isExporting}
                  onChange={(e) => set('to', e.target.value)}
                  className={cn(controlClass, invalidRange && 'ring-rose-400')}
                />
              </div>
            </div>
            {invalidRange && (
              <p className="text-xs font-medium text-rose-600" role="alert">
                The start date must be on or before the end date.
              </p>
            )}
          </Section>

          <Section
            title="Categories"
            action={
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => set('categories', [...CATEGORIES])}
                  className="rounded px-1.5 py-0.5 font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Select all
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => set('categories', [])}
                  className="rounded px-1.5 py-0.5 font-medium text-slate-500 hover:bg-slate-100"
                >
                  Clear
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((category) => {
                const selected = options.categories.includes(category);
                const { icon: Icon, iconClass } = CATEGORY_META[category];
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selected}
                    disabled={isExporting}
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ring-1 ring-inset transition',
                      selected
                        ? 'bg-white text-slate-900 ring-indigo-300'
                        : 'bg-slate-50 text-slate-400 ring-slate-200 hover:text-slate-600',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                        selected ? iconClass : 'bg-slate-100 text-slate-400',
                      )}
                      aria-hidden
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{category}</span>
                    <span className="text-xs tabular-nums text-slate-400">{countsInRange[category]}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="File name">
            <label htmlFor={ids.filename} className="sr-only">
              File name
            </label>
            <div className="flex rounded-lg shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-indigo-600">
              <input
                id={ids.filename}
                type="text"
                value={options.filename}
                placeholder={suggested}
                maxLength={120}
                disabled={isExporting}
                onChange={(e) => set('filename', e.target.value)}
                className="block min-w-0 flex-1 rounded-l-lg border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <span className="flex items-center rounded-r-lg border-l border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                .{format.extension}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Saved as <span className="font-medium text-slate-700">{fullName}</span>
            </p>
          </Section>
        </div>

        {/* Summary and preview */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200" aria-live="polite">
            <Stat label="Records" value={summary.count.toLocaleString('en-US')} />
            <Stat label="Total" value={formatCurrency(summary.total)} />
            <Stat
              label="Dates"
              value={formatSpan(summary.firstDate, summary.lastDate)}
            />
          </div>

          <div className="min-w-0 flex-1 overflow-hidden rounded-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
              {summary.count > 0 && (
                <span className="text-xs text-slate-500">
                  {summary.count > PREVIEW_LIMIT
                    ? `First ${PREVIEW_LIMIT} of ${summary.count.toLocaleString('en-US')} rows`
                    : `All ${summary.count} ${summary.count === 1 ? 'row' : 'rows'}`}
                </span>
              )}
            </div>
            {summary.count === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <Inbox className="h-8 w-8 text-slate-300" aria-hidden />
                <p className="text-sm font-medium text-slate-700">Nothing to export</p>
                <p className="text-xs text-slate-500">{disabledReason}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">Date</th>
                      <th scope="col" className="px-4 py-2 font-medium">Category</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">Amount</th>
                      <th scope="col" className="px-4 py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, PREVIEW_LIMIT).map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDate(e.date)}</td>
                        <td className="px-4 py-2">
                          <CategoryBadge category={e.category} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums text-slate-900">
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="max-w-[16rem] truncate px-4 py-2 text-slate-600" title={e.description}>
                          {e.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {summary.count > PREVIEW_LIMIT && (
                  <p className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-500">
                    + {(summary.count - PREVIEW_LIMIT).toLocaleString('en-US')} more in the exported file
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-6 -mb-5 mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500" aria-live="polite">
          {isExporting
            ? `Preparing your ${format.label} file…`
            : disabledReason ?? `${summary.count} ${summary.count === 1 ? 'record' : 'records'} · ${formatCurrency(summary.total)} · ${format.label}`}
        </p>
        <div className="flex gap-2 sm:justify-end">
          <Button variant="secondary" onClick={onDone} disabled={isExporting} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            loading={isExporting}
            disabled={disabledReason !== null}
            className="flex-1 sm:flex-none"
          >
            {isExporting ? 'Exporting…' : `Export ${format.label}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** "Oct 4", "Apr 10 – Oct 4" within one year, otherwise "Dec 2025 – Oct 2026". */
function formatSpan(first: string | null, last: string | null): string {
  if (!first || !last) return '—';
  const dayMonth: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (first === last) return formatDate(first, dayMonth);
  if (first.slice(0, 4) === last.slice(0, 4)) return `${formatDate(first, dayMonth)} – ${formatDate(last, dayMonth)}`;
  const monthYear: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  return `${formatDate(first, monthYear)} – ${formatDate(last, monthYear)}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3 sm:px-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 sm:text-base">{value}</p>
    </div>
  );
}
