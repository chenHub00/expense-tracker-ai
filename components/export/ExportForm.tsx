'use client';

import { useExpenses } from '@/components/providers/ExpenseProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { CategoryPicker } from './CategoryPicker';
import { DateRangeField } from './DateRangeField';
import { ExportPreview } from './ExportPreview';
import { useExportService } from './ExportServiceContext';
import { ExportSummaryStats } from './ExportSummaryStats';
import { FilenameField } from './FilenameField';
import { FormatPicker } from './FormatPicker';
import { useExportForm } from './useExportForm';

/** Composes the export form: wires state from useExportForm into presentational parts. */
export function ExportForm({ onDone }: { onDone: () => void }) {
  const { expenses } = useExpenses();
  const toast = useToast();
  const form = useExportForm(expenses, useExportService());
  const { summary, format, isExporting, disabledReason } = form;

  const handleExport = async () => {
    try {
      const result = await form.submit();
      toast.success({
        title: 'Export complete',
        description: `${result.count} ${result.count === 1 ? 'expense' : 'expenses'} saved to ${result.filename}.`,
      });
      onDone();
    } catch (error) {
      toast.error({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Something went wrong while creating the file.',
      });
    }
  };

  return (
    <div className="flex flex-col">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-6" aria-busy={isExporting}>
          <FormatPicker options={form.formats} value={format.id} onChange={form.setFormatId} disabled={isExporting} />
          <DateRangeField value={form.range} onChange={form.setRange} invalid={form.invalidRange} disabled={isExporting} />
          <CategoryPicker
            selected={form.categories}
            counts={form.categoryCounts}
            onToggle={form.toggleCategory}
            onSelectAll={form.selectAllCategories}
            onClear={form.clearCategories}
            disabled={isExporting}
          />
          <FilenameField
            value={form.filename}
            onChange={form.setFilename}
            suggestion={form.suggestedFilename}
            extension={format.extension}
            resolvedName={form.resolvedFilename}
            disabled={isExporting}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <ExportSummaryStats summary={summary} />
          <ExportPreview rows={form.rows} emptyMessage={disabledReason} />
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
          <Button onClick={handleExport} loading={isExporting} disabled={disabledReason !== null} className="flex-1 sm:flex-none">
            {isExporting ? 'Exporting…' : `Export ${format.label}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
