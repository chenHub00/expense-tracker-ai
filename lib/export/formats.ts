import { CATEGORIES, type Expense } from '../types';
import type { ExportFormat, ExportOptions, ExportSummary } from './options';

export interface ExportContext {
  rows: Expense[];
  summary: ExportSummary;
  options: ExportOptions;
  generatedAt: Date;
}

export interface FormatDefinition {
  id: ExportFormat;
  label: string;
  extension: string;
  description: string;
  serialize: (context: ExportContext) => Promise<Blob>;
}

function escapeCsvCell(value: string): string {
  // Neutralise spreadsheet formula injection and quote cells containing separators.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

async function toCsv({ rows }: ExportContext): Promise<Blob> {
  const lines = [
    ['Date', 'Category', 'Amount', 'Description'],
    ...rows.map((e) => [e.date, e.category, e.amount.toFixed(2), e.description]),
  ].map((row) => row.map(escapeCsvCell).join(','));
  // The BOM makes Excel open UTF-8 content correctly.
  return new Blob(['﻿', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

async function toJson({ rows, summary, options, generatedAt }: ExportContext): Promise<Blob> {
  const payload = {
    generatedAt: generatedAt.toISOString(),
    filters: {
      from: options.from || null,
      to: options.to || null,
      categories: options.categories.length === CATEGORIES.length ? 'all' : options.categories,
    },
    summary,
    expenses: rows.map(({ date, category, amount, description }) => ({ date, category, amount, description })),
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

async function toPdf(context: ExportContext): Promise<Blob> {
  // Loaded on demand so the PDF libraries are not part of the initial bundle.
  const { renderPdf } = await import('./pdf');
  return renderPdf(context);
}

export const EXPORT_FORMATS: Record<ExportFormat, FormatDefinition> = {
  csv: {
    id: 'csv',
    label: 'CSV',
    extension: 'csv',
    description: 'Spreadsheets like Excel, Numbers or Google Sheets',
    serialize: toCsv,
  },
  json: {
    id: 'json',
    label: 'JSON',
    extension: 'json',
    description: 'Structured data with filters and totals, for developers',
    serialize: toJson,
  },
  pdf: {
    id: 'pdf',
    label: 'PDF',
    extension: 'pdf',
    description: 'A formatted report, ready to print or share',
    serialize: toPdf,
  },
};

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
