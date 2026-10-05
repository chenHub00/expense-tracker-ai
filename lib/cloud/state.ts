import type { DestinationId } from './destinations';
import type { ExportFormat, TemplateId } from './reports';
import type { Schedule } from './schedule';

export const CLOUD_STORAGE_KEY = 'expense-tracker:cloud:v1';
const MAX_HISTORY = 50;

export interface Connection {
  account: string;
  connectedAt: string;
  lastSyncAt: string | null;
  autoSync: boolean;
}

export interface HistoryEntry {
  id: string;
  templateId: TemplateId;
  destinationId: DestinationId;
  format: ExportFormat;
  trigger: 'manual' | 'schedule';
  status: 'completed' | 'failed';
  createdAt: string;
  records: number;
  sizeBytes: number;
  /** Human readable target, e.g. a folder path or "to alex@example.com". */
  location: string;
}

export interface SharedLink {
  id: string;
  templateId: TemplateId;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  records: number;
  hideDescriptions: boolean;
}

export interface CloudState {
  connections: Partial<Record<DestinationId, Connection>>;
  schedules: Schedule[];
  history: HistoryEntry[];
  links: SharedLink[];
}

export const EMPTY_CLOUD_STATE: CloudState = { connections: {}, schedules: [], history: [], links: [] };

export function loadCloudState(): CloudState {
  try {
    const raw = window.localStorage.getItem(CLOUD_STORAGE_KEY);
    if (!raw) return EMPTY_CLOUD_STATE;
    const parsed = JSON.parse(raw) as Partial<CloudState>;
    return {
      connections: parsed.connections ?? {},
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };
  } catch {
    return EMPTY_CLOUD_STATE;
  }
}

export function saveCloudState(state: CloudState): void {
  try {
    window.localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify({ ...state, history: state.history.slice(0, MAX_HISTORY) }));
  } catch {
    // Export settings are a convenience; failing to persist them must not break exporting.
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatRelative(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
  // Timestamps a few seconds ahead of the last clock tick still read as "just now".
  if (abs < 45_000) return 'just now';
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  return rtf.format(Math.round(diff / 86_400_000), 'day');
}
