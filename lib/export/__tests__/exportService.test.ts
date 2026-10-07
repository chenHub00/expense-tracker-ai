import { describe, expect, it, vi } from 'vitest';
import { NothingToExportError, createExportService } from '../exportService';
import type { FileSaver } from '../fileSaver';
import { createFormatRegistry, type ExportFormat } from '../formats';
import type { ExportDocument } from '../types';
import { ALL, SAMPLE } from './fixtures';

/**
 * Dependency inversion in practice: the service is exercised with an in-memory saver, a
 * recording format and a fixed clock. No DOM, no real files.
 */
function setup() {
  const saved: Array<{ blob: Blob; filename: string }> = [];
  const saver: FileSaver = { save: (blob, filename) => saved.push({ blob, filename }) };
  const seen: ExportDocument[] = [];
  const recorder: ExportFormat = {
    id: 'rec',
    label: 'Recorder',
    extension: 'txt',
    mimeType: 'text/plain',
    description: 'Records what it was given',
    serialize: vi.fn(async (doc: ExportDocument) => {
      seen.push(doc);
      return new Blob([String(doc.rows.length)], { type: 'text/plain' });
    }),
  };
  const now = new Date('2026-10-05T09:30:00.000Z');
  const service = createExportService({ formats: createFormatRegistry([recorder]), saver, now: () => now });
  return { service, saved, seen, now };
}

describe('createExportService', () => {
  it('selects, serialises and saves with the resolved file name', async () => {
    const { service, saved, seen, now } = setup();
    const result = await service.run({ expenses: SAMPLE, selection: { ...ALL, categories: ['Food'] }, formatId: 'rec', filename: 'lunch.txt' });

    expect(result).toEqual({ filename: 'lunch.txt', count: 2 });
    expect(saved).toHaveLength(1);
    expect(saved[0].filename).toBe('lunch.txt');
    expect(await saved[0].blob.text()).toBe('2');
    expect(seen[0].generatedAt).toBe(now);
    expect(seen[0].summary.total).toBe(19.75);
    expect(seen[0].rows.every((e) => e.category === 'Food')).toBe(true);
  });

  it('suggests a file name when none is given', async () => {
    const { service, saved } = setup();
    await service.run({ expenses: SAMPLE, selection: { ...ALL, from: '2026-10-01', to: '2026-10-31' }, formatId: 'rec', filename: '' });
    expect(saved[0].filename).toBe('expenses-2026-10-01-to-2026-10-31.txt');
  });

  it('refuses to save an empty export', async () => {
    const { service, saved } = setup();
    await expect(service.run({ expenses: SAMPLE, selection: { ...ALL, categories: [] }, formatId: 'rec', filename: '' })).rejects.toBeInstanceOf(
      NothingToExportError,
    );
    expect(saved).toHaveLength(0);
  });

  it('fails loudly for an unknown format and saves nothing', async () => {
    const { service, saved } = setup();
    await expect(service.run({ expenses: SAMPLE, selection: ALL, formatId: 'nope', filename: '' })).rejects.toThrow(/Unknown export format/);
    expect(saved).toHaveLength(0);
  });

  it('does not save when serialisation fails', async () => {
    const saver: FileSaver = { save: vi.fn() };
    const broken: ExportFormat = {
      id: 'bad',
      label: 'Bad',
      extension: 'bad',
      mimeType: 'text/plain',
      description: '',
      serialize: async () => {
        throw new Error('boom');
      },
    };
    const service = createExportService({ formats: createFormatRegistry([broken]), saver });
    await expect(service.run({ expenses: SAMPLE, selection: ALL, formatId: 'bad', filename: '' })).rejects.toThrow('boom');
    expect(saver.save).not.toHaveBeenCalled();
  });
});
