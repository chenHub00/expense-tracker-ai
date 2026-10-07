import { describe, expect, it } from 'vitest';
import { csvFormat, defaultFormatRegistry, jsonFormat } from '../formats';
import { SAMPLE, deepFreeze, documentOf } from './fixtures';

/**
 * Liskov substitution: every registered format must honour the ExportFormat contract,
 * so callers can treat them interchangeably. New formats are covered automatically.
 */
describe.each(defaultFormatRegistry.list().map((f) => [f.id, f] as const))('format "%s" honours the contract', (_id, format) => {
  it('produces a Blob of its declared MIME type', async () => {
    const blob = await format.serialize(documentOf(SAMPLE));
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(format.mimeType);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('accepts a document with no rows', async () => {
    await expect(format.serialize(documentOf([]))).resolves.toBeInstanceOf(Blob);
  });

  it('does not mutate the document', async () => {
    await expect(format.serialize(deepFreeze(documentOf([...SAMPLE])))).resolves.toBeInstanceOf(Blob);
  });

  it('has a usable extension', () => {
    expect(format.extension).toMatch(/^[a-z0-9]+$/);
  });
});

describe('csvFormat', () => {
  it('writes a BOM, the export column order and escaped cells', async () => {
    const blob = await csvFormat.serialize(documentOf(SAMPLE));
    // Blob#text() strips a leading BOM, so check the raw bytes for it.
    expect([...new Uint8Array(await blob.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = (await blob.text()).split('\r\n');
    expect(lines[0]).toBe('Date,Category,Amount,Description');
    expect(lines).toContain('2026-09-02,Food,12.50,"Lunch, ""special"""');
    expect(lines).toContain("2026-10-01,Food,7.25,'=SUM(A1:A9)");
  });
});

describe('jsonFormat', () => {
  it('includes filters, summary and trimmed expense records', async () => {
    const doc = documentOf(SAMPLE, { from: '2026-09-01', to: '', categories: ['Food', 'Bills'] });
    const json = JSON.parse(await (await jsonFormat.serialize(doc)).text());
    expect(json.filters).toEqual({ from: '2026-09-01', to: null, categories: ['Food', 'Bills'] });
    expect(json.summary.count).toBe(4);
    expect(Object.keys(json.expenses[0])).toEqual(['date', 'category', 'amount', 'description']);
  });
});
