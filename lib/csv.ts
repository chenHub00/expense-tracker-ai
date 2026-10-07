import { browserFileSaver } from './export/fileSaver';
import type { Expense } from './types';

/** UTF-8 byte order mark; makes Excel read CSV files as UTF-8. */
export const UTF8_BOM = '\uFEFF';

/**
 * Escapes one CSV cell: neutralises spreadsheet formula injection (cells starting with
 * = + - @ tab or CR get a leading apostrophe) and quotes cells containing separators.
 */
export function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Serialises a table of cells to CSV text (RFC 4180, CRLF line endings). */
export function toCsv(table: ReadonlyArray<ReadonlyArray<string>>): string {
  return table.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

/** CSV used by the Expenses page's quick export. */
export function expensesToCSV(expenses: readonly Expense[]): string {
  return toCsv([
    ['Date', 'Category', 'Description', 'Amount'],
    ...expenses.map((e) => [e.date, e.category, e.description, e.amount.toFixed(2)]),
  ]);
}

export function downloadFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8'): void {
  browserFileSaver.save(new Blob([UTF8_BOM, content], { type: mimeType }), filename);
}
