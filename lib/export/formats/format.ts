import type { ExportDocument } from '../types';

/**
 * The contract every export format implements.
 *
 * Substitutability rules (checked for every registered format by formats.contract.test.ts):
 * - `serialize` resolves for any document, including one with no rows.
 * - The resolved Blob's `type` equals `mimeType`.
 * - The document is never mutated.
 */
export interface ExportFormat {
  readonly id: string;
  readonly label: string;
  /** File extension without the dot. */
  readonly extension: string;
  readonly mimeType: string;
  /** One line shown to users when choosing a format. */
  readonly description: string;
  serialize(document: ExportDocument): Promise<Blob>;
}

/** The read-only facts a UI needs to offer a format; pickers depend on this, not on `serialize`. */
export type FormatOption = Pick<ExportFormat, 'id' | 'label' | 'extension' | 'description'>;
