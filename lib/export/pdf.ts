import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CATEGORIES } from '../types';
import { formatCurrency, formatDate } from '../utils';
import type { ExportContext } from './formats';

const INDIGO: [number, number, number] = [79, 70, 229];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_900: [number, number, number] = [15, 23, 42];

/** Header cell aligned with its right-aligned numeric column. */
function right(content: string) {
  return { content, styles: { halign: 'right' as const } };
}

function describePeriod({ options, summary }: ExportContext): string {
  const from = options.from || summary.firstDate;
  const to = options.to || summary.lastDate;
  if (!from || !to) return 'All time';
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export async function renderPdf(context: ExportContext): Promise<Blob> {
  const { rows, summary, options, generatedAt } = context;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...SLATE_900);
  doc.text('Expense Report', margin, 56);

  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...SLATE_500);
  const categories =
    options.categories.length === CATEGORIES.length ? 'All categories' : options.categories.join(', ');
  doc.text(`Period: ${describePeriod(context)}`, margin, 76);
  doc.text(`Categories: ${categories}`, margin, 90, { maxWidth: pageWidth - margin * 2 });
  doc.text(`Generated ${generatedAt.toLocaleString('en-US')}`, margin, 104);

  // Summary: totals per category.
  autoTable(doc, {
    startY: 122,
    margin: { left: margin, right: margin },
    head: [['Category', right('Expenses'), right('Total')]],
    body: summary.byCategory.map((c) => [c.category, String(c.count), formatCurrency(c.total)]),
    foot: [['All', right(String(summary.count)), right(formatCurrency(summary.total))]],
    theme: 'grid',
    headStyles: { fillColor: INDIGO },
    footStyles: { fillColor: [238, 242, 255], textColor: SLATE_900 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    styles: { fontSize: 9 },
    tableWidth: 300,
  });

  // Detail table.
  autoTable(doc, {
    margin: { left: margin, right: margin, bottom: 50 },
    head: [['Date', 'Category', 'Description', right('Amount')]],
    body: rows.map((e) => [formatDate(e.date), e.category, e.description, formatCurrency(e.amount)]),
    theme: 'striped',
    headStyles: { fillColor: INDIGO },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 90 }, 3: { halign: 'right', cellWidth: 80 } },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8).setTextColor(...SLATE_500);
      doc.text('Expense Tracker', margin, pageHeight - 24);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 24, { align: 'right' });
    },
  });

  return doc.output('blob');
}
