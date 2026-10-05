import type { Expense } from './types';

function escapeCell(value: string): string {
  // Neutralise spreadsheet formula injection and quote cells containing separators.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function expensesToCSV(expenses: Expense[]): string {
  const header = ['Date', 'Category', 'Amount', 'Description'];
  const rows = expenses.map((e) => [e.date, e.category, e.amount.toFixed(2), e.description]);
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export function downloadFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8'): void {
  // The BOM makes Excel open UTF-8 content correctly.
  const blob = new Blob(['﻿', content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
