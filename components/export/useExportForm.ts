'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ExportResult, ExportService } from '@/lib/export/exportService';
import { resolveFilename, suggestFilename } from '@/lib/export/filename';
import { countByCategory, isRangeInvalid, selectExpenses, toggleCategory } from '@/lib/export/selection';
import { summarize } from '@/lib/export/summary';
import type { ExportSelection } from '@/lib/export/types';
import { CATEGORIES, type Category, type Expense } from '@/lib/types';

export interface DateRange {
  from: string;
  to: string;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * State and rules for the export form, with no markup. Selection state (range, categories)
 * is kept apart from output state (format, file name) so typing a file name never re-filters.
 */
export function useExportForm(expenses: readonly Expense[], service: ExportService) {
  const formats = service.formats;
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const [categories, setCategories] = useState<readonly Category[]>(CATEGORIES);
  const [formatId, setFormatId] = useState(() => formats.list()[0].id);
  const [filename, setFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const selection = useMemo<ExportSelection>(() => ({ ...range, categories }), [range, categories]);
  const rows = useMemo(() => selectExpenses(expenses, selection), [expenses, selection]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const categoryCounts = useMemo(() => countByCategory(expenses, range), [expenses, range]);

  const format = formats.get(formatId);
  const invalidRange = isRangeInvalid(range);
  const disabledReason = invalidRange
    ? 'The start date must be before the end date.'
    : categories.length === 0
      ? 'Select at least one category.'
      : rows.length === 0
        ? 'No expenses match these options.'
        : null;

  const submit = useCallback(async (): Promise<ExportResult> => {
    setIsExporting(true);
    try {
      // Let the loading state paint before potentially heavy work (PDF rendering).
      await nextFrame();
      return await service.run({ expenses, selection, formatId, filename });
    } catch (error) {
      setIsExporting(false);
      throw error;
    }
  }, [service, expenses, selection, formatId, filename]);

  return {
    formats: formats.list(),
    format,
    setFormatId,
    range,
    setRange,
    invalidRange,
    categories,
    toggleCategory: (category: Category) => setCategories((prev) => toggleCategory(prev, category)),
    selectAllCategories: () => setCategories(CATEGORIES),
    clearCategories: () => setCategories([]),
    categoryCounts,
    filename,
    setFilename,
    suggestedFilename: suggestFilename(range),
    resolvedFilename: resolveFilename(filename, range, format.extension, formats.extensions()),
    rows,
    summary,
    disabledReason,
    isExporting,
    submit,
  };
}
