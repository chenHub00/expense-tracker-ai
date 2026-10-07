import { describe, expect, it } from 'vitest';
import { resolveFilename, sanitizeFilename, suggestFilename } from '../filename';

describe('suggestFilename', () => {
  it('describes the range', () => {
    expect(suggestFilename({ from: '2026-01-01', to: '2026-03-31' })).toBe('expenses-2026-01-01-to-2026-03-31');
    expect(suggestFilename({ from: '2026-01-01', to: '' })).toBe('expenses-since-2026-01-01');
    expect(suggestFilename({ from: '', to: '2026-03-31' })).toBe('expenses-until-2026-03-31');
    expect(suggestFilename({ from: '', to: '' }, '2026-10-05')).toBe('expenses-2026-10-05');
  });
});

describe('sanitizeFilename', () => {
  it('removes invalid characters and a known extension', () => {
    expect(sanitizeFilename('my/report: Q3.csv', ['csv', 'json'])).toBe('my-report-Q3');
    expect(sanitizeFilename('Q3  report.JSON', ['csv', 'json'])).toBe('Q3 report');
  });

  it('keeps unknown extensions as part of the name', () => {
    expect(sanitizeFilename('notes.txt', ['csv'])).toBe('notes.txt');
  });

  it('caps the length', () => {
    expect(sanitizeFilename('a'.repeat(200))).toHaveLength(120);
  });
});

describe('resolveFilename', () => {
  it('falls back to the suggestion and appends the extension', () => {
    expect(resolveFilename('   ', { from: '2026-01-01', to: '2026-01-31' }, 'pdf')).toBe('expenses-2026-01-01-to-2026-01-31.pdf');
    expect(resolveFilename('Taxes.pdf', { from: '', to: '' }, 'pdf')).toBe('Taxes.pdf');
  });
});
