'use client';

import {
  CalendarClock,
  CalendarDays,
  ChartPie,
  ClipboardCopy,
  Cloud,
  DatabaseBackup,
  History,
  Landmark,
  Link2,
  Pencil,
  Plus,
  QrCode,
  RotateCw,
  Share2,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useCloud, useNow } from '@/components/cloud/CloudProvider';
import { ConsentPanel } from '@/components/cloud/ConsentPanel';
import { ExportFlowDialog } from '@/components/cloud/ExportFlowDialog';
import { ScheduleDialog } from '@/components/cloud/ScheduleDialog';
import { LinkResult, ShareDialog } from '@/components/cloud/ShareDialog';
import { ServiceMark, SimulatedBadge, StatusDot, Toggle, type SyncTone } from '@/components/cloud/ui';
import { useExpenses } from '@/components/providers/ExpenseProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, Skeleton } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { DESTINATIONS, DESTINATION_BY_ID, type DestinationId } from '@/lib/cloud/destinations';
import { FORMAT_META, TEMPLATES, TEMPLATE_BY_ID, buildReport, reportToMarkdown, type TemplateId } from '@/lib/cloud/reports';
import { describeSchedule, type Schedule } from '@/lib/cloud/schedule';
import { formatBytes, formatRelative, type SharedLink } from '@/lib/cloud/state';
import { cn, formatCurrency, monthKey } from '@/lib/utils';

const TEMPLATE_ICONS: Record<TemplateId, LucideIcon> = {
  'tax-report': Landmark,
  'monthly-summary': CalendarDays,
  'category-analysis': ChartPie,
  'full-backup': DatabaseBackup,
};

const CLOUD_SERVICES = DESTINATIONS.filter((d) => d.requiresConnection);

type FlowState = { template?: TemplateId; destination?: DestinationId } | null;

export default function ExportHubPage() {
  const { expenses, isLoading } = useExpenses();
  const cloud = useCloud();
  const toast = useToast();
  const now = useNow();
  const [flow, setFlow] = useState<FlowState>(null);
  const [share, setShare] = useState<{ template?: TemplateId } | null>(null);
  const [schedule, setSchedule] = useState<{ schedule?: Schedule } | null>(null);
  const [connecting, setConnecting] = useState<DestinationId | null>(null);
  const [viewLink, setViewLink] = useState<SharedLink | null>(null);

  const reports = useMemo(() => Object.fromEntries(TEMPLATES.map((t) => [t.id, buildReport(t.id, expenses)])), [expenses]);
  const ready = !isLoading && cloud.isReady;

  const copyMarkdown = async (id: TemplateId) => {
    try {
      await navigator.clipboard.writeText(reportToMarkdown(reports[id]));
      toast.success({ title: 'Copied as Markdown', description: 'Paste it into Notion, Slack, GitHub or Obsidian.' });
    } catch {
      toast.error({ title: 'Could not copy', description: 'Your browser blocked clipboard access.' });
    }
  };

  // Sync status across all connected services.
  const connected = CLOUD_SERVICES.filter((d) => cloud.connections[d.id]);
  const syncing = cloud.jobs.filter((j) => j.status === 'running' && DESTINATION_BY_ID[j.destinationId].requiresConnection);
  const lastSync = connected
    .map((d) => cloud.connections[d.id]?.lastSyncAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);
  const syncTone: SyncTone = syncing.length > 0 ? 'busy' : connected.length > 0 ? 'ok' : 'idle';
  const syncText =
    syncing.length > 0
      ? `Syncing to ${[...new Set(syncing.map((j) => DESTINATION_BY_ID[j.destinationId].name))].join(', ')}…`
      : connected.length > 0
        ? `${connected.length} ${connected.length === 1 ? 'service' : 'services'} connected · ${lastSync ? `last sync ${formatRelative(lastSync, now)}` : 'not synced yet'}`
        : 'No cloud services connected';

  const thisMonth = monthKey(new Date(now));
  const activeLinks = cloud.links.filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > now);
  const stats = [
    { label: 'Exports this month', value: cloud.history.filter((h) => monthKey(new Date(h.createdAt)) === thisMonth && h.status === 'completed').length },
    { label: 'Connected services', value: `${connected.length}/${CLOUD_SERVICES.length}` },
    { label: 'Active schedules', value: cloud.schedules.filter((s) => s.enabled).length },
    { label: 'Live share links', value: activeLinks.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Hub"
        description="Send, sync and share your expenses with the tools you already use."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShare({})} disabled={!ready || expenses.length === 0}>
              <Share2 className="h-4 w-4" aria-hidden />
              Share
            </Button>
            <Button onClick={() => setFlow({})} disabled={!ready || expenses.length === 0}>
              <Upload className="h-4 w-4" aria-hidden />
              New export
            </Button>
          </>
        }
      />

      {/* Sync status + stats */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
              <Cloud className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900" aria-live="polite">
                <StatusDot tone={syncTone} />
                {ready ? syncText : 'Loading…'}
              </p>
              <p className="text-xs text-slate-500">Cloud services are simulated in this demo. Downloads, Markdown, share links and QR codes are real.</p>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 divide-slate-100 sm:grid-cols-4 sm:divide-x">
          {stats.map((s) => (
            <div key={s.label} className="px-5 py-3 sm:px-6">
              <dt className="text-xs font-medium text-slate-500">{s.label}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">{ready ? s.value : '–'}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Templates */}
      <section aria-labelledby="templates-heading" className="space-y-3">
        <h2 id="templates-heading" className="text-base font-semibold text-slate-900">
          Templates
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((t) => {
            const Icon = TEMPLATE_ICONS[t.id];
            const r = reports[t.id];
            return (
              <Card key={t.id} className="flex flex-col p-5">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', t.accent)}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{t.name}</h3>
                <p className="text-xs text-slate-500">{t.tagline}</p>
                <div className="mt-3 text-xs text-slate-600">
                  {ready ? (
                    <>
                      <span className="font-semibold text-slate-900">{r.count}</span> records ·{' '}
                      <span className="font-semibold text-slate-900">{formatCurrency(r.total)}</span>
                    </>
                  ) : (
                    <Skeleton className="h-4 w-28" />
                  )}
                </div>
                {/* Periods depend on today's date, so they render client-side only. */}
                <p className="text-[11px] text-slate-400">{ready ? `${r.period} · ${FORMAT_META[t.defaultFormat].label}` : '\u00a0'}</p>
                <div className="mt-4 flex items-center gap-1.5 pt-1">
                  <Button size="sm" className="flex-1" onClick={() => setFlow({ template: t.id })} disabled={!ready || r.count === 0}>
                    Export
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => copyMarkdown(t.id)} disabled={!ready || r.count === 0} aria-label={`Copy ${t.name} as Markdown`} title="Copy as Markdown">
                    <ClipboardCopy className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShare({ template: t.id })} disabled={!ready || r.count === 0} aria-label={`Share ${t.name}`} title="Share link">
                    <Link2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Integrations */}
        <Card className="lg:col-span-3">
          <CardHeader title="Integrations" description="Connect a service once, then export to it in one click or keep it in sync." />
          <ul className="mt-3 divide-y divide-slate-100">
            {CLOUD_SERVICES.map((d) => {
              const connection = cloud.connections[d.id];
              const busy = syncing.some((j) => j.destinationId === d.id);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
                  <ServiceMark id={d.id} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      {d.name} <SimulatedBadge />
                    </p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <StatusDot tone={busy ? 'busy' : connection ? 'ok' : 'idle'} />
                      {busy
                        ? 'Syncing…'
                        : connection
                          ? `${connection.account} · ${connection.lastSyncAt ? `synced ${formatRelative(connection.lastSyncAt, now)}` : 'connected'}`
                          : d.description}
                    </p>
                  </div>
                  {connection ? (
                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
                      <label className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-600">
                        <Toggle checked={connection.autoSync} onChange={(v) => cloud.setAutoSync(d.id, v)} label={`Auto-sync to ${d.name}`} />
                        Auto-sync
                      </label>
                      <Button size="sm" variant="secondary" onClick={() => setFlow({ template: 'full-backup', destination: d.id })}>
                        Export
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => cloud.disconnect(d.id)}>
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setConnecting(d.id)} disabled={!ready}>
                      Connect
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:px-6">
            Auto-sync uploads a fresh Full Backup a few seconds after you add, edit or delete an expense.
          </p>
        </Card>

        {/* Schedules */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Scheduled backups"
            description="Recurring exports that run on their own."
            action={
              <Button size="sm" variant="secondary" onClick={() => setSchedule({})} disabled={!ready}>
                <Plus className="h-4 w-4" aria-hidden />
                New
              </Button>
            }
          />
          {cloud.schedules.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <CalendarClock className="h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-2 text-sm font-medium text-slate-700">No schedules yet</p>
              <p className="mt-0.5 text-xs text-slate-500">For example, a weekly Full Backup to Dropbox every Monday.</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {cloud.schedules.map((s) => (
                <li key={s.id} className={cn('flex items-start gap-3 px-5 py-3 sm:px-6', !s.enabled && 'opacity-60')}>
                  <ServiceMark id={s.destinationId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{describeSchedule(s)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {TEMPLATE_BY_ID[s.templateId].name} → {DESTINATION_BY_ID[s.destinationId].name} · {FORMAT_META[s.format].label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {s.enabled ? `Next run ${formatRelative(s.nextRunAt, now)}` : 'Paused'}
                      {s.lastRunAt && ` · last ran ${formatRelative(s.lastRunAt, now)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Toggle checked={s.enabled} onChange={(v) => cloud.toggleSchedule(s.id, v)} label="Schedule enabled" />
                    <button type="button" onClick={() => setSchedule({ schedule: s })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Edit schedule">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => cloud.removeSchedule(s.id)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete schedule">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* History */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Export history"
            description="Every export, wherever it went."
            action={
              cloud.history.length > 0 && (
                <Button size="sm" variant="ghost" onClick={cloud.clearHistory}>
                  Clear
                </Button>
              )
            }
          />
          {cloud.history.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <History className="h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-2 text-sm font-medium text-slate-700">No exports yet</p>
              <p className="mt-0.5 text-xs text-slate-500">Exports you run, send or schedule will show up here.</p>
            </div>
          ) : (
            <ul className="mt-3 max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
              {cloud.history.map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <ServiceMark id={h.destinationId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                      <span className="truncate">
                        {TEMPLATE_BY_ID[h.templateId].name} → {DESTINATION_BY_ID[h.destinationId].name}
                      </span>
                      {h.trigger === 'schedule' && (
                        <span className="shrink-0 rounded bg-violet-50 px-1 text-[10px] font-semibold text-violet-700">Scheduled</span>
                      )}
                    </p>
                    <p className={cn('truncate text-xs', h.status === 'failed' ? 'text-rose-600' : 'text-slate-500')} title={h.location}>
                      {h.location}
                    </p>
                  </div>
                  <div className="hidden text-right text-xs sm:block">
                    <p className="text-slate-700" title={new Date(h.createdAt).toLocaleString('en-US')}>
                      {formatRelative(h.createdAt, now)}
                    </p>
                    <p className="text-slate-400">
                      {h.records} rows · {formatBytes(h.sizeBytes)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                      h.status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20',
                    )}
                  >
                    {h.status === 'completed' ? 'Done' : 'Failed'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      h.destinationId === 'email'
                        ? setFlow({ template: h.templateId, destination: 'email' })
                        : cloud.runExport({ templateId: h.templateId, destinationId: h.destinationId, format: h.format })
                    }
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Run again with current data"
                    title="Run again with current data"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Shared links */}
        <Card className="lg:col-span-2">
          <CardHeader title="Shared links" description="Read-only snapshots anyone with the link can open." />
          {cloud.links.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <QrCode className="h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-2 text-sm font-medium text-slate-700">Nothing shared yet</p>
              <p className="mt-0.5 text-xs text-slate-500">Create a link or QR code to show a report on any device.</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {cloud.links.map((l) => {
                const expired = Boolean(l.expiresAt && new Date(l.expiresAt).getTime() <= now);
                return (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', expired ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600')}>
                      <Link2 className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{TEMPLATE_BY_ID[l.templateId].name}</p>
                      <p className="text-xs text-slate-500">
                        {l.records} rows · {expired ? 'expired' : l.expiresAt ? `expires ${formatRelative(l.expiresAt, now)}` : 'no expiry'}
                        {l.hideDescriptions && ' · private'}
                      </p>
                    </div>
                    {!expired && (
                      <button type="button" onClick={() => setViewLink(l)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Show link and QR code">
                        <QrCode className="h-4 w-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => cloud.removeLink(l.id)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove from list">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <ExportFlowDialog open={flow !== null} onClose={() => setFlow(null)} initialTemplate={flow?.template} initialDestination={flow?.destination} />
      <ShareDialog open={share !== null} onClose={() => setShare(null)} initialTemplate={share?.template} />
      <ScheduleDialog open={schedule !== null} onClose={() => setSchedule(null)} schedule={schedule?.schedule} />
      <Modal open={connecting !== null} onClose={() => setConnecting(null)} title={`Connect ${connecting ? DESTINATION_BY_ID[connecting].name : ''}`} size="sm">
        {connecting && <ConsentPanel destinationId={connecting} onDone={() => setConnecting(null)} onCancel={() => setConnecting(null)} />}
      </Modal>
      <Modal open={viewLink !== null} onClose={() => setViewLink(null)} title="Share link">
        {viewLink && <LinkResult link={viewLink} />}
      </Modal>
    </div>
  );
}
