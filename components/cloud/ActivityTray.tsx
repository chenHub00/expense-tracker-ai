'use client';

import { ChevronDown, CircleAlert, CircleCheck, Loader, X } from 'lucide-react';
import { useState } from 'react';
import { DESTINATION_BY_ID } from '@/lib/cloud/destinations';
import { TEMPLATE_BY_ID } from '@/lib/cloud/reports';
import { cn } from '@/lib/utils';
import { useCloud, type Job } from './CloudProvider';
import { ServiceMark } from './ui';

/** Floating panel listing background export jobs; stays visible across pages. */
export function ActivityTray() {
  const { jobs, dismissJob } = useCloud();
  const [collapsed, setCollapsed] = useState(false);
  if (jobs.length === 0) return null;

  const running = jobs.filter((j) => j.status === 'running').length;

  return (
    <section
      aria-label="Background activity"
      className="fixed bottom-4 left-4 right-4 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-900/10 backdrop-blur animate-slide-up sm:right-auto sm:w-80"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-2 bg-slate-900 px-4 py-2.5 text-left text-sm font-medium text-white"
      >
        <span className="flex items-center gap-2">
          {running > 0 ? <Loader className="h-4 w-4 animate-spin" aria-hidden /> : <CircleCheck className="h-4 w-4 text-emerald-400" aria-hidden />}
          {running > 0 ? `${running} ${running === 1 ? 'task' : 'tasks'} running in background` : 'All tasks finished'}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition', collapsed && 'rotate-180')} aria-hidden />
      </button>
      {!collapsed && (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto" aria-live="polite">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} onDismiss={() => dismissJob(job.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function JobRow({ job, onDismiss }: { job: Job; onDismiss: () => void }) {
  const destination = DESTINATION_BY_ID[job.destinationId];
  const progress = job.status === 'completed' ? 100 : Math.round(((job.stageIndex + 0.5) / job.stages.length) * 100);
  const title = job.trigger === 'sync' ? `Auto-sync to ${destination.name}` : `${TEMPLATE_BY_ID[job.templateId].name} → ${destination.name}`;
  const detail =
    job.status === 'failed'
      ? job.error
      : job.status === 'completed'
        ? job.location
        : `${job.stages[job.stageIndex]}…`;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <ServiceMark id={job.destinationId} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-slate-900">{title}</p>
          {job.trigger === 'schedule' && (
            <span className="shrink-0 rounded bg-violet-50 px-1 text-[10px] font-semibold text-violet-700">Scheduled</span>
          )}
        </div>
        <p className={cn('truncate text-xs', job.status === 'failed' ? 'text-rose-600' : 'text-slate-500')} title={detail}>
          {detail}
        </p>
        {job.status !== 'failed' && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full transition-all duration-500', job.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500')}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {job.status === 'running' ? (
        <span className="text-xs tabular-nums text-slate-400">{progress}%</span>
      ) : (
        <div className="flex items-center gap-1">
          {job.status === 'completed' ? (
            <CircleCheck className="h-4 w-4 text-emerald-500" aria-label="Completed" />
          ) : (
            <CircleAlert className="h-4 w-4 text-rose-500" aria-label="Failed" />
          )}
          <button type="button" onClick={onDismiss} className="rounded p-0.5 text-slate-400 hover:text-slate-600" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}
