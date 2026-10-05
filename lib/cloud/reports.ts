import { getCategoryTotals } from '../analytics';
import { sortByDateDesc } from '../filters';
import type { Expense } from '../types';
import { formatCurrency, formatDate, monthKey, toISODate } from '../utils';

export type TemplateId = 'tax-report' | 'monthly-summary' | 'category-analysis' | 'full-backup';
export type ExportFormat = 'csv' | 'json' | 'md';

export interface BreakdownRow {
  label: string;
  count: number;
  total: number;
  /** Share of the report total, 0–100. */
  share: number;
}

/** A template applied to the current data: what every destination renders. */
export interface Report {
  templateId: TemplateId;
  title: string;
  period: string;
  generatedAt: string;
  rows: Expense[];
  count: number;
  total: number;
  breakdown: BreakdownRow[];
  /** Spending per month (YYYY-MM), oldest first. Used by Category Analysis. */
  monthly: Array<{ month: string; total: number }>;
}

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  tagline: string;
  description: string;
  defaultFormat: ExportFormat;
  /** Tailwind classes for the template's accent tile. */
  accent: string;
  select: (expenses: Expense[], now: Date) => { rows: Expense[]; period: string };
}

const round = (n: number) => Math.round(n * 100) / 100;

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'tax-report',
    name: 'Tax Report',
    tagline: 'Year to date, itemised',
    description: 'Every expense this calendar year with category subtotals, ready for your accountant.',
    defaultFormat: 'csv',
    accent: 'from-emerald-500 to-teal-600',
    select: (expenses, now) => {
      const year = String(now.getFullYear());
      return { rows: expenses.filter((e) => e.date.startsWith(year)), period: `Jan 1 – ${formatDate(toISODate(now), { month: 'short', day: 'numeric' })}, ${year}` };
    },
  },
  {
    id: 'monthly-summary',
    name: 'Monthly Summary',
    tagline: 'This month at a glance',
    description: 'Totals by category for the current month plus the full list, great for a quick check-in.',
    defaultFormat: 'md',
    accent: 'from-indigo-500 to-violet-600',
    select: (expenses, now) => {
      const key = monthKey(now);
      return {
        rows: expenses.filter((e) => e.date.startsWith(key)),
        period: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      };
    },
  },
  {
    id: 'category-analysis',
    name: 'Category Analysis',
    tagline: 'Where the money goes',
    description: 'All-time breakdown by category with share of spend and month-by-month totals.',
    defaultFormat: 'csv',
    accent: 'from-orange-500 to-pink-600',
    select: (expenses) => ({ rows: expenses, period: 'All time' }),
  },
  {
    id: 'full-backup',
    name: 'Full Backup',
    tagline: 'Everything, machine-readable',
    description: 'A complete JSON snapshot of every expense, suitable for archiving or restoring.',
    defaultFormat: 'json',
    accent: 'from-slate-600 to-slate-800',
    select: (expenses) => ({ rows: expenses, period: 'All time' }),
  },
];

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<TemplateId, TemplateDefinition>;

export function buildReport(templateId: TemplateId, expenses: Expense[], now = new Date()): Report {
  const template = TEMPLATE_BY_ID[templateId];
  const { rows, period } = template.select(expenses, now);
  const sorted = sortByDateDesc(rows);
  const total = round(sorted.reduce((sum, e) => sum + e.amount, 0));
  const monthlyMap = new Map<string, number>();
  for (const e of sorted) monthlyMap.set(e.date.slice(0, 7), (monthlyMap.get(e.date.slice(0, 7)) ?? 0) + e.amount);
  return {
    templateId,
    title: template.name,
    period,
    generatedAt: now.toISOString(),
    rows: sorted,
    count: sorted.length,
    total,
    breakdown: getCategoryTotals(sorted).map((c) => ({
      label: c.category,
      count: c.count,
      total: round(c.total),
      share: round(c.percentage),
    })),
    monthly: [...monthlyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, t]) => ({ month, total: round(t) })),
  };
}

function csvCell(value: string): string {
  // Neutralise spreadsheet formula injection and quote cells containing separators.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const csvLines = (rows: string[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

export function reportToCSV(report: Report): string {
  if (report.templateId === 'category-analysis') {
    return csvLines([
      ['Category', 'Expenses', 'Total', 'Share %', 'Average'],
      ...report.breakdown.map((b) => [b.label, String(b.count), b.total.toFixed(2), b.share.toFixed(1), (b.total / b.count).toFixed(2)]),
      [],
      ['Month', 'Total'],
      ...report.monthly.map((m) => [m.month, m.total.toFixed(2)]),
    ]);
  }
  return csvLines([
    ['Date', 'Category', 'Amount', 'Description'],
    ...report.rows.map((e) => [e.date, e.category, e.amount.toFixed(2), e.description]),
  ]);
}

export function reportToJSON(report: Report): string {
  return JSON.stringify(
    {
      template: report.templateId,
      title: report.title,
      period: report.period,
      generatedAt: report.generatedAt,
      summary: { count: report.count, total: report.total, byCategory: report.breakdown, byMonth: report.monthly },
      expenses: report.rows,
    },
    null,
    2,
  );
}

const mdEscape = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/** Markdown that pastes cleanly into Notion, Slack, GitHub or Obsidian. */
export function reportToMarkdown(report: Report, { maxRows = 50 } = {}): string {
  const lines = [
    `## ${report.title} · ${report.period}`,
    '',
    `**${report.count} expenses · ${formatCurrency(report.total)}**`,
    '',
    '| Category | Expenses | Total | Share |',
    '| --- | ---: | ---: | ---: |',
    ...report.breakdown.map((b) => `| ${b.label} | ${b.count} | ${formatCurrency(b.total)} | ${b.share.toFixed(1)}% |`),
  ];
  if (report.templateId !== 'category-analysis' && report.rows.length > 0) {
    lines.push('', '| Date | Category | Amount | Description |', '| --- | --- | ---: | --- |');
    for (const e of report.rows.slice(0, maxRows)) {
      lines.push(`| ${e.date} | ${e.category} | ${formatCurrency(e.amount)} | ${mdEscape(e.description)} |`);
    }
    if (report.rows.length > maxRows) lines.push('', `_…and ${report.rows.length - maxRows} more_`);
  }
  lines.push('', `_Generated ${new Date(report.generatedAt).toLocaleString('en-US')} with Expense Tracker_`);
  return lines.join('\n');
}

export const FORMAT_META: Record<ExportFormat, { label: string; extension: string; mime: string }> = {
  csv: { label: 'CSV', extension: 'csv', mime: 'text/csv;charset=utf-8' },
  json: { label: 'JSON', extension: 'json', mime: 'application/json' },
  md: { label: 'Markdown', extension: 'md', mime: 'text/markdown;charset=utf-8' },
};

export function renderReport(report: Report, format: ExportFormat): Blob {
  const body = format === 'csv' ? reportToCSV(report) : format === 'json' ? reportToJSON(report) : reportToMarkdown(report, { maxRows: Infinity });
  // The BOM makes Excel open UTF-8 CSV correctly.
  return new Blob(format === 'csv' ? ['﻿', body] : [body], { type: FORMAT_META[format].mime });
}

export function reportFilename(report: Report, format: ExportFormat): string {
  const date = report.generatedAt.slice(0, 10);
  return `${report.templateId}-${date}.${FORMAT_META[format].extension}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
