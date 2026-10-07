import { UTF8_BOM, toCsv } from '../../csv';
import type { ExportFormat } from './format';

const MIME_TYPE = 'text/csv;charset=utf-8';

export const csvFormat: ExportFormat = {
  id: 'csv',
  label: 'CSV',
  extension: 'csv',
  mimeType: MIME_TYPE,
  description: 'Spreadsheets like Excel, Numbers or Google Sheets',
  async serialize({ rows }) {
    const table = [
      ['Date', 'Category', 'Amount', 'Description'],
      ...rows.map((e) => [e.date, e.category, e.amount.toFixed(2), e.description]),
    ];
    return new Blob([UTF8_BOM, toCsv(table)], { type: MIME_TYPE });
  },
};
