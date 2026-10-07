import type { Category, Expense } from '../types';

/** Which expenses to export. Kept separate from output settings (format, file name). */
export interface ExportSelection {
  /** Inclusive YYYY-MM-DD bounds; an empty string means unbounded. */
  readonly from: string;
  readonly to: string;
  readonly categories: readonly Category[];
}

export interface CategoryTotal {
  readonly category: Category;
  readonly count: number;
  readonly total: number;
}

export interface ExportSummary {
  readonly count: number;
  readonly total: number;
  /** Earliest and latest dates present in the selected rows. */
  readonly firstDate: string | null;
  readonly lastDate: string | null;
  readonly byCategory: readonly CategoryTotal[];
}

/** Everything a format needs to write a file. Formats must treat it as read-only. */
export interface ExportDocument {
  readonly rows: readonly Expense[];
  readonly summary: ExportSummary;
  readonly selection: ExportSelection;
  readonly generatedAt: Date;
}
