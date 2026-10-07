import { describe, expect, it } from 'vitest';
import { createFormatRegistry, type ExportFormat } from '../formats';

const fake = (id: string, extension = id): ExportFormat => ({
  id,
  label: id.toUpperCase(),
  extension,
  mimeType: 'text/plain',
  description: '',
  serialize: async () => new Blob([''], { type: 'text/plain' }),
});

describe('createFormatRegistry', () => {
  it('lists formats in order and looks them up by id', () => {
    const registry = createFormatRegistry([fake('a'), fake('b')]);
    expect(registry.list().map((f) => f.id)).toEqual(['a', 'b']);
    expect(registry.get('b').label).toBe('B');
  });

  it('rejects unknown ids, duplicates and empty registries', () => {
    expect(() => createFormatRegistry([fake('a')]).get('zzz')).toThrow(/Unknown export format/);
    expect(() => createFormatRegistry([fake('a'), fake('a')])).toThrow(/Duplicate/);
    expect(() => createFormatRegistry([])).toThrow();
  });

  it('reports unique extensions', () => {
    expect(createFormatRegistry([fake('a', 'txt'), fake('b', 'txt'), fake('c')]).extensions()).toEqual(['txt', 'c']);
  });
});
