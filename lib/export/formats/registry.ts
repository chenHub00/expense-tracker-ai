import type { ExportFormat } from './format';

export interface FormatRegistry {
  list(): readonly ExportFormat[];
  /** Throws for an unknown id, so a typo fails loudly instead of exporting the wrong thing. */
  get(id: string): ExportFormat;
  extensions(): readonly string[];
}

export function createFormatRegistry(formats: readonly ExportFormat[]): FormatRegistry {
  if (formats.length === 0) throw new Error('An export format registry needs at least one format.');
  const byId = new Map<string, ExportFormat>();
  for (const format of formats) {
    if (byId.has(format.id)) throw new Error(`Duplicate export format id "${format.id}".`);
    byId.set(format.id, format);
  }
  const extensions = [...new Set(formats.map((f) => f.extension))];
  return {
    list: () => formats,
    get(id) {
      const format = byId.get(id);
      if (!format) throw new Error(`Unknown export format "${id}".`);
      return format;
    },
    extensions: () => extensions,
  };
}
