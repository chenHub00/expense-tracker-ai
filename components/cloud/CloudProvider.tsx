'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useExpenses } from '@/components/providers/ExpenseProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { DESTINATION_BY_ID, type DestinationId } from '@/lib/cloud/destinations';
import {
  TEMPLATE_BY_ID,
  buildReport,
  downloadBlob,
  renderReport,
  reportFilename,
  type ExportFormat,
  type TemplateId,
} from '@/lib/cloud/reports';
import { computeNextRun, type Schedule } from '@/lib/cloud/schedule';
import { encodeShare, toSharePayload } from '@/lib/cloud/share';
import {
  EMPTY_CLOUD_STATE,
  loadCloudState,
  saveCloudState,
  type CloudState,
  type Connection,
  type HistoryEntry,
  type SharedLink,
} from '@/lib/cloud/state';
import { generateId } from '@/lib/utils';
import { ActivityTray } from './ActivityTray';

export type JobTrigger = 'manual' | 'schedule' | 'sync';

export interface Job {
  id: string;
  templateId: TemplateId;
  destinationId: DestinationId;
  format: ExportFormat;
  trigger: JobTrigger;
  stages: string[];
  stageIndex: number;
  status: 'running' | 'completed' | 'failed';
  records: number;
  location: string;
  error?: string;
}

export interface ExportRequest {
  templateId: TemplateId;
  destinationId: DestinationId;
  format: ExportFormat;
  trigger?: JobTrigger;
  /** Email recipients, used for the email destination. */
  recipients?: string[];
  /** Spreadsheet name, used for Google Sheets. */
  sheetName?: string;
}

interface CloudContextValue extends CloudState {
  isReady: boolean;
  jobs: Job[];
  runExport: (request: ExportRequest) => string;
  dismissJob: (id: string) => void;
  connect: (id: DestinationId, account: string) => void;
  disconnect: (id: DestinationId) => void;
  setAutoSync: (id: DestinationId, autoSync: boolean) => void;
  saveSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt' | 'lastRunAt' | 'nextRunAt'> & { id?: string }) => void;
  removeSchedule: (id: string) => void;
  toggleSchedule: (id: string, enabled: boolean) => void;
  createShareLink: (options: { templateId: TemplateId; expiresInDays: number | null; hideDescriptions: boolean }) => Promise<SharedLink>;
  removeLink: (id: string) => void;
  clearHistory: () => void;
}

const CloudContext = createContext<CloudContextValue | null>(null);

// Simulated network latency per job step; long enough to read, short enough not to annoy.
const STEP_MS = 650;
const SYNC_DEBOUNCE_MS = 2500;
const SCHEDULER_INTERVAL_MS = 20_000;

export function CloudProvider({ children }: { children: React.ReactNode }) {
  const { expenses, isLoading } = useExpenses();
  const toast = useToast();
  const [state, setState] = useState<CloudState>(EMPTY_CLOUD_STATE);
  const [isReady, setIsReady] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  // Refs let timers and the scheduler read the latest values without re-subscribing.
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const stateRef = useRef(state);
  stateRef.current = state;
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  useEffect(() => {
    setState(loadCloudState());
    setIsReady(true);
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (isReady) saveCloudState(state);
  }, [state, isReady]);

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const dismissJob = useCallback((id: string) => setJobs((prev) => prev.filter((j) => j.id !== id)), []);

  const runExport = useCallback(
    (request: ExportRequest): string => {
      const { templateId, destinationId, format, trigger = 'manual' } = request;
      const destination = DESTINATION_BY_ID[destinationId];
      const id = generateId();
      const report = buildReport(templateId, expensesRef.current);
      const blob = renderReport(report, format);
      const filename = request.sheetName ? `${request.sheetName}.${format}` : reportFilename(report, format);
      const location =
        destinationId === 'email' ? `to ${request.recipients?.join(', ') ?? ''}` : destination.location(filename);
      const connected = !destination.requiresConnection || Boolean(stateRef.current.connections[destinationId]);

      const job: Job = {
        id,
        templateId,
        destinationId,
        format,
        trigger,
        stages: destination.stages,
        stageIndex: 0,
        status: 'running',
        records: report.count,
        location,
      };
      setJobs((prev) => [job, ...prev.filter((j) => j.status === 'running' || j.trigger !== 'sync')].slice(0, 6));

      const record = (status: HistoryEntry['status']) => {
        if (trigger === 'sync') return;
        const entry: HistoryEntry = {
          id,
          templateId,
          destinationId,
          format,
          trigger,
          status,
          createdAt: new Date().toISOString(),
          records: report.count,
          sizeBytes: blob.size,
          location: status === 'failed' ? `${destination.name} is not connected` : location,
        };
        setState((prev) => ({ ...prev, history: [entry, ...prev.history] }));
      };

      const finish = () => {
        if (destinationId === 'download') downloadBlob(blob, filename);
        updateJob(id, { status: 'completed', stageIndex: destination.stages.length });
        record('completed');
        if (destination.requiresConnection) {
          setState((prev) => {
            const connection = prev.connections[destinationId];
            if (!connection) return prev;
            return {
              ...prev,
              connections: { ...prev.connections, [destinationId]: { ...connection, lastSyncAt: new Date().toISOString() } },
            };
          });
        }
        if (trigger !== 'sync') {
          toast.success({
            title: `${TEMPLATE_BY_ID[templateId].name} ${destinationId === 'email' ? 'sent' : 'exported'}`,
            description: `${report.count} records · ${destination.name}`,
          });
        }
        later(() => dismissJob(id), trigger === 'sync' ? 2500 : 6000);
      };

      const step = (index: number) => {
        // A connection can be removed while a job is in flight.
        if (destination.requiresConnection && !stateRef.current.connections[destinationId]) {
          updateJob(id, { status: 'failed', error: `${destination.name} was disconnected` });
          record('failed');
          return;
        }
        if (index >= destination.stages.length) return finish();
        updateJob(id, { stageIndex: index });
        later(() => step(index + 1), STEP_MS + Math.random() * 300);
      };

      if (!connected) {
        updateJob(id, { status: 'failed', error: `${destination.name} is not connected` });
        record('failed');
        later(() => dismissJob(id), 8000);
      } else {
        later(() => step(0), 50);
      }
      return id;
    },
    [dismissJob, later, toast, updateJob],
  );

  // Scheduler: runs due schedules while the app is open, including runs missed while it was closed.
  useEffect(() => {
    if (!isReady || isLoading) return;
    const tick = () => {
      const now = new Date();
      const due = stateRef.current.schedules.filter((s) => s.enabled && new Date(s.nextRunAt) <= now);
      if (due.length === 0) return;
      for (const s of due) {
        runExport({ templateId: s.templateId, destinationId: s.destinationId, format: s.format, trigger: 'schedule' });
      }
      setState((prev) => ({
        ...prev,
        schedules: prev.schedules.map((s) =>
          due.some((d) => d.id === s.id)
            ? { ...s, lastRunAt: now.toISOString(), nextRunAt: computeNextRun(s, now).toISOString() }
            : s,
        ),
      }));
    };
    tick();
    const interval = setInterval(tick, SCHEDULER_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isReady, isLoading, runExport]);

  // Auto-sync: after the expenses change, push a full backup to every service with auto-sync on.
  const lastSynced = useRef<typeof expenses | null>(null);
  useEffect(() => {
    if (!isReady || isLoading) return;
    if (lastSynced.current === null) {
      lastSynced.current = expenses;
      return;
    }
    if (lastSynced.current === expenses) return;
    const timer = setTimeout(() => {
      lastSynced.current = expenses;
      for (const [id, connection] of Object.entries(stateRef.current.connections)) {
        if (!connection?.autoSync) continue;
        const destinationId = id as DestinationId;
        runExport({
          templateId: 'full-backup',
          destinationId,
          format: DESTINATION_BY_ID[destinationId].formats.includes('json') ? 'json' : 'csv',
          trigger: 'sync',
        });
      }
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [expenses, isReady, isLoading, runExport]);

  const setConnection = useCallback((id: DestinationId, connection: Connection | null) => {
    setState((prev) => {
      const connections = { ...prev.connections };
      if (connection) connections[id] = connection;
      else delete connections[id];
      return { ...prev, connections };
    });
  }, []);

  const value = useMemo<CloudContextValue>(
    () => ({
      ...state,
      isReady,
      jobs,
      runExport,
      dismissJob,
      connect: (id, account) =>
        setConnection(id, { account, connectedAt: new Date().toISOString(), lastSyncAt: null, autoSync: false }),
      disconnect: (id) => setConnection(id, null),
      setAutoSync: (id, autoSync) => {
        const connection = stateRef.current.connections[id];
        if (connection) setConnection(id, { ...connection, autoSync });
      },
      saveSchedule: (input) => {
        const now = new Date();
        setState((prev) => {
          const existing = input.id ? prev.schedules.find((s) => s.id === input.id) : undefined;
          const schedule: Schedule = {
            ...input,
            id: existing?.id ?? generateId(),
            createdAt: existing?.createdAt ?? now.toISOString(),
            lastRunAt: existing?.lastRunAt ?? null,
            nextRunAt: computeNextRun(input, now).toISOString(),
          };
          return {
            ...prev,
            schedules: existing
              ? prev.schedules.map((s) => (s.id === schedule.id ? schedule : s))
              : [...prev.schedules, schedule],
          };
        });
      },
      removeSchedule: (id) => setState((prev) => ({ ...prev, schedules: prev.schedules.filter((s) => s.id !== id) })),
      toggleSchedule: (id, enabled) =>
        setState((prev) => ({
          ...prev,
          schedules: prev.schedules.map((s) =>
            s.id === id
              ? { ...s, enabled, nextRunAt: enabled ? computeNextRun(s, new Date()).toISOString() : s.nextRunAt }
              : s,
          ),
        })),
      createShareLink: async ({ templateId, expiresInDays, hideDescriptions }) => {
        const report = buildReport(templateId, expensesRef.current);
        const createdAt = new Date();
        const expiresAt = expiresInDays ? new Date(createdAt.getTime() + expiresInDays * 86_400_000).toISOString() : null;
        const token = await encodeShare(toSharePayload(report, expiresAt, hideDescriptions));
        const link: SharedLink = {
          id: generateId(),
          templateId,
          url: `${window.location.origin}/share#${token}`,
          createdAt: createdAt.toISOString(),
          expiresAt,
          records: report.count,
          hideDescriptions,
        };
        setState((prev) => ({ ...prev, links: [link, ...prev.links] }));
        return link;
      },
      removeLink: (id) => setState((prev) => ({ ...prev, links: prev.links.filter((l) => l.id !== id) })),
      clearHistory: () => setState((prev) => ({ ...prev, history: [] })),
    }),
    [state, isReady, jobs, runExport, dismissJob, setConnection],
  );

  return (
    <CloudContext.Provider value={value}>
      {children}
      <ActivityTray />
    </CloudContext.Provider>
  );
}

export function useCloud(): CloudContextValue {
  const context = useContext(CloudContext);
  if (!context) throw new Error('useCloud must be used within a CloudProvider');
  return context;
}

/** Re-renders periodically so relative times ("2 minutes ago") stay current. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
