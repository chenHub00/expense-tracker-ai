import { csvFormat } from './csv';
import { jsonFormat } from './json';
import { pdfFormat } from './pdf';
import { createFormatRegistry } from './registry';

export type { ExportFormat, FormatOption } from './format';
export { createFormatRegistry, type FormatRegistry } from './registry';
export { csvFormat, jsonFormat, pdfFormat };

/** The formats the app offers. Adding a format: implement ExportFormat and list it here. */
export const defaultFormatRegistry = createFormatRegistry([csvFormat, jsonFormat, pdfFormat]);
