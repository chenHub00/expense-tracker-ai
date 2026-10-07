import { Braces, FileDown, FileSpreadsheet, FileText, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  csv: FileSpreadsheet,
  json: Braces,
  pdf: FileText,
};

/** Icon for a format id. Unknown formats get a generic icon, so new formats need no UI change. */
export function formatIcon(id: string): LucideIcon {
  return ICONS[id] ?? FileDown;
}
