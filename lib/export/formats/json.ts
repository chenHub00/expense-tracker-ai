import { includesAllCategories } from '../selection';
import type { ExportFormat } from './format';

const MIME_TYPE = 'application/json';

export const jsonFormat: ExportFormat = {
  id: 'json',
  label: 'JSON',
  extension: 'json',
  mimeType: MIME_TYPE,
  description: 'Structured data with filters and totals, for developers',
  async serialize({ rows, summary, selection, generatedAt }) {
    const payload = {
      generatedAt: generatedAt.toISOString(),
      filters: {
        from: selection.from || null,
        to: selection.to || null,
        categories: includesAllCategories(selection) ? 'all' : selection.categories,
      },
      summary,
      expenses: rows.map(({ date, category, amount, description }) => ({ date, category, amount, description })),
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: MIME_TYPE });
  },
};
