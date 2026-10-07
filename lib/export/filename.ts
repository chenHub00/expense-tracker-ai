import { todayISO } from '../utils';
import type { ExportSelection } from './types';

export function suggestFilename({ from, to }: Pick<ExportSelection, 'from' | 'to'>, today = todayISO()): string {
  if (from && to) return `expenses-${from}-to-${to}`;
  if (from) return `expenses-since-${from}`;
  if (to) return `expenses-until-${to}`;
  return `expenses-${today}`;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Cleans a user-typed base name: drops a trailing known extension, replaces characters that
 * are invalid in file names on common systems, and tidies separators. May return ''.
 */
export function sanitizeFilename(name: string, knownExtensions: readonly string[] = []): string {
  const extension = knownExtensions.length
    ? new RegExp(`\\.(${knownExtensions.map(escapeRegExp).join('|')})$`, 'i')
    : null;
  return (extension ? name.trim().replace(extension, '') : name)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*-[\s-]*/g, '-')
    .trim()
    .slice(0, 120);
}

/** The final file name: the cleaned input, or a suggestion when empty, plus the extension. */
export function resolveFilename(
  input: string,
  selection: Pick<ExportSelection, 'from' | 'to'>,
  extension: string,
  knownExtensions: readonly string[] = [extension],
): string {
  return `${sanitizeFilename(input, knownExtensions) || suggestFilename(selection)}.${extension}`;
}
