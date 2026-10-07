import type { Expense } from '../types';
import type { FileSaver } from './fileSaver';
import { resolveFilename } from './filename';
import type { FormatRegistry } from './formats';
import { selectExpenses } from './selection';
import { summarize } from './summary';
import type { ExportSelection } from './types';

export interface ExportRequest {
  expenses: readonly Expense[];
  selection: ExportSelection;
  formatId: string;
  /** User-typed base name; empty means "use the suggested name". */
  filename: string;
}

export interface ExportResult {
  filename: string;
  count: number;
}

export interface ExportService {
  readonly formats: FormatRegistry;
  /** Selects, serialises and saves. Rejects when nothing matches or the format fails. */
  run(request: ExportRequest): Promise<ExportResult>;
}

export interface ExportServiceDependencies {
  formats: FormatRegistry;
  saver: FileSaver;
  /** Injected so tests can pin the "generated at" timestamp. */
  now?: () => Date;
}

export class NothingToExportError extends Error {
  constructor() {
    super('No expenses match these options.');
    this.name = 'NothingToExportError';
  }
}

/**
 * The export use case. It depends only on abstractions (a format registry, a file saver and a
 * clock), so the same policy runs in the browser, in tests, or against another destination.
 */
export function createExportService({ formats, saver, now = () => new Date() }: ExportServiceDependencies): ExportService {
  return {
    formats,
    async run({ expenses, selection, formatId, filename }) {
      const format = formats.get(formatId);
      const rows = selectExpenses(expenses, selection);
      if (rows.length === 0) throw new NothingToExportError();
      const blob = await format.serialize({ rows, summary: summarize(rows), selection, generatedAt: now() });
      const name = resolveFilename(filename, selection, format.extension, formats.extensions());
      saver.save(blob, name);
      return { filename: name, count: rows.length };
    },
  };
}
