'use client';

import { CalendarClock } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DESTINATIONS, DESTINATION_BY_ID, type DestinationId } from '@/lib/cloud/destinations';
import { FORMAT_META, TEMPLATES, TEMPLATE_BY_ID, type ExportFormat, type TemplateId } from '@/lib/cloud/reports';
import { WEEKDAYS, computeNextRun, describeSchedule, type Frequency, type Schedule } from '@/lib/cloud/schedule';
import { cn } from '@/lib/utils';
import { useCloud } from './CloudProvider';

const selectClass =
  'block w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600';

// Email needs recipients and is a one-off action, so schedules target files.
const SCHEDULABLE = DESTINATIONS.filter((d) => d.id !== 'email');

export function ScheduleDialog({ open, onClose, schedule }: { open: boolean; onClose: () => void; schedule?: Schedule }) {
  return (
    <Modal open={open} onClose={onClose} title={schedule ? 'Edit backup schedule' : 'Schedule automatic backups'} description="Runs automatically while Expense Tracker is open, and catches up on missed runs when you return.">
      <ScheduleForm onClose={onClose} schedule={schedule} />
    </Modal>
  );
}

function ScheduleForm({ onClose, schedule }: { onClose: () => void; schedule?: Schedule }) {
  const { connections, saveSchedule } = useCloud();
  const ids = { template: useId(), destination: useId(), weekday: useId(), day: useId(), time: useId() };
  const [templateId, setTemplateId] = useState<TemplateId>(schedule?.templateId ?? 'full-backup');
  const [destinationId, setDestinationId] = useState<DestinationId>(
    // Prefer a connected file store; Sheets only takes CSV, so it is a poor default for backups.
    schedule?.destinationId ??
      (SCHEDULABLE.find((d) => d.requiresConnection && d.id !== 'google-sheets' && connections[d.id])?.id ?? 'download'),
  );
  const [format, setFormat] = useState<ExportFormat>(schedule?.format ?? 'json');
  const [frequency, setFrequency] = useState<Frequency>(schedule?.frequency ?? 'weekly');
  const [weekday, setWeekday] = useState(schedule?.weekday ?? 1);
  const [monthDay, setMonthDay] = useState(schedule?.monthDay ?? 1);
  const [time, setTime] = useState(schedule?.time ?? '09:00');

  const destination = DESTINATION_BY_ID[destinationId];
  const effectiveFormat = destination.formats.includes(format) ? format : destination.formats[0];
  const rule = { frequency, weekday, monthDay, time };
  const next = computeNextRun(rule, new Date());
  const notConnected = destination.requiresConnection && !connections[destinationId];

  const save = () => {
    saveSchedule({ id: schedule?.id, templateId, destinationId, format: effectiveFormat, enabled: true, ...rule });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.template} className="mb-1 block text-xs font-medium text-slate-500">
            Template
          </label>
          <select
            id={ids.template}
            value={templateId}
            onChange={(e) => {
              const id = e.target.value as TemplateId;
              setTemplateId(id);
              setFormat(TEMPLATE_BY_ID[id].defaultFormat);
            }}
            className={selectClass}
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.destination} className="mb-1 block text-xs font-medium text-slate-500">
            Destination
          </label>
          <select id={ids.destination} value={destinationId} onChange={(e) => setDestinationId(e.target.value as DestinationId)} className={selectClass}>
            {SCHEDULABLE.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.requiresConnection && !connections[d.id] ? ' (not connected)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {destination.formats.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Format</span>
          {destination.formats.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={effectiveFormat === f}
              onClick={() => setFormat(f)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                effectiveFormat === f ? 'bg-indigo-600 text-white ring-indigo-600' : 'text-slate-600 ring-slate-300 hover:bg-slate-50',
              )}
            >
              {FORMAT_META[f].label}
            </button>
          ))}
        </div>
      )}
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-slate-500">Repeat</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
          {(['daily', 'weekly', 'monthly'] as Frequency[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={frequency === f}
              onClick={() => setFrequency(f)}
              className={cn(
                'rounded-md py-1.5 text-xs font-medium capitalize transition',
                frequency === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        {frequency === 'weekly' && (
          <div>
            <label htmlFor={ids.weekday} className="mb-1 block text-xs font-medium text-slate-500">
              Day
            </label>
            <select id={ids.weekday} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={selectClass}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
        {frequency === 'monthly' && (
          <div>
            <label htmlFor={ids.day} className="mb-1 block text-xs font-medium text-slate-500">
              Day of month
            </label>
            <select id={ids.day} value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))} className={selectClass}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={cn(frequency === 'daily' && 'col-span-2')}>
          <label htmlFor={ids.time} className="mb-1 block text-xs font-medium text-slate-500">
            Time
          </label>
          <input id={ids.time} type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} className={selectClass} />
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">{describeSchedule(rule)}</span>, export <span className="font-semibold">{TEMPLATE_BY_ID[templateId].name}</span> as{' '}
          {FORMAT_META[effectiveFormat].label} to <span className="font-semibold">{destination.name}</span>. Next run{' '}
          {next.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
        </p>
      </div>
      {notConnected && (
        <p className="text-xs text-amber-700">
          {destination.name} isn&apos;t connected yet. Runs will fail until you connect it in Integrations.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save}>{schedule ? 'Save changes' : 'Create schedule'}</Button>
      </div>
    </div>
  );
}
