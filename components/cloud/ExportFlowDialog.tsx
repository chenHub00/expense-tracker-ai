'use client';

import { Check, ExternalLink, Mail, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useExpenses } from '@/components/providers/ExpenseProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DESTINATIONS, DESTINATION_BY_ID, type DestinationId } from '@/lib/cloud/destinations';
import {
  FORMAT_META,
  TEMPLATES,
  TEMPLATE_BY_ID,
  buildReport,
  reportFilename,
  reportToMarkdown,
  type ExportFormat,
  type TemplateId,
} from '@/lib/cloud/reports';
import { cn, formatCurrency } from '@/lib/utils';
import { useCloud } from './CloudProvider';
import { ConsentPanel } from './ConsentPanel';
import { ServiceMark, SimulatedBadge } from './ui';

const STEPS = ['Template', 'Destination', 'Details'] as const;
const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

const inputClass =
  'block w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600';

interface ExportFlowDialogProps {
  open: boolean;
  onClose: () => void;
  initialTemplate?: TemplateId;
  initialDestination?: DestinationId;
}

export function ExportFlowDialog({ open, onClose, initialTemplate, initialDestination }: ExportFlowDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title="New export" description="Runs in the background, so you can keep working.">
      <Flow onClose={onClose} initialTemplate={initialTemplate} initialDestination={initialDestination} />
    </Modal>
  );
}

function Flow({ onClose, initialTemplate, initialDestination }: Omit<ExportFlowDialogProps, 'open'>) {
  const { expenses } = useExpenses();
  const { connections, runExport } = useCloud();
  const [step, setStep] = useState(initialTemplate ? (initialDestination ? 2 : 1) : 0);
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplate ?? 'monthly-summary');
  const [destinationId, setDestinationId] = useState<DestinationId>(initialDestination ?? 'download');
  const [connecting, setConnecting] = useState<DestinationId | null>(null);
  const [format, setFormat] = useState<ExportFormat>(TEMPLATE_BY_ID[initialTemplate ?? 'monthly-summary'].defaultFormat);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [sheetName, setSheetName] = useState('');
  const ids = { recipients: useId(), subject: useId(), message: useId(), sheet: useId() };

  const reports = useMemo(() => Object.fromEntries(TEMPLATES.map((t) => [t.id, buildReport(t.id, expenses)])), [expenses]);
  const report = reports[templateId];
  const destination = DESTINATION_BY_ID[destinationId];
  const [subject, setSubject] = useState('');
  const effectiveSubject = subject || `${report.title} · ${report.period}`;
  const effectiveSheet = sheetName || `${report.title} – ${report.period}`;
  const effectiveFormat = destination.formats.includes(format) ? format : destination.formats[0];

  const chooseTemplate = (id: TemplateId) => {
    setTemplateId(id);
    setFormat(TEMPLATE_BY_ID[id].defaultFormat);
  };

  const chooseDestination = (id: DestinationId) => {
    setDestinationId(id);
    if (DESTINATION_BY_ID[id].requiresConnection && !connections[id]) setConnecting(id);
  };

  const commitDraft = () => {
    const parts = draft.split(/[\s,;]+/).filter(Boolean);
    if (parts.length === 0) return;
    setRecipients((prev) => [...new Set([...prev, ...parts])]);
    setDraft('');
  };

  // Include a half-typed address so "Send" works without pressing Enter first.
  const allRecipients = [...new Set([...recipients, ...draft.split(/[\s,;]+/).filter(Boolean)])];
  const invalidRecipients = allRecipients.filter((r) => !EMAIL_RE.test(r));
  const canRun =
    report.count > 0 &&
    (!destination.requiresConnection || Boolean(connections[destinationId])) &&
    (destinationId !== 'email' || (allRecipients.length > 0 && invalidRecipients.length === 0));

  const run = () => {
    runExport({
      templateId,
      destinationId,
      format: effectiveFormat,
      recipients: allRecipients,
      sheetName: destinationId === 'google-sheets' ? effectiveSheet : undefined,
    });
    onClose();
  };

  if (connecting) {
    return (
      <ConsentPanel
        destinationId={connecting}
        onDone={() => setConnecting(null)}
        onCancel={() => {
          setConnecting(null);
          setDestinationId('download');
        }}
      />
    );
  }

  const mailto = `mailto:${allRecipients.join(',')}?subject=${encodeURIComponent(effectiveSubject)}&body=${encodeURIComponent(
    `${message ? `${message}\n\n` : ''}${reportToMarkdown(report, { maxRows: 25 })}`,
  )}`;

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <ol className="flex items-center gap-2 text-xs font-medium">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? 'step' : undefined}
              className={cn(
                'flex items-center gap-1.5',
                i === step ? 'text-indigo-700' : i < step ? 'text-slate-700 hover:text-indigo-700' : 'text-slate-400',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                  i < step ? 'bg-indigo-600 text-white' : i === step ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600' : 'bg-slate-100',
                )}
              >
                {i < step ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && <span className={cn('h-px flex-1', i < step ? 'bg-indigo-300' : 'bg-slate-200')} />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div role="radiogroup" aria-label="Template" className="grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => {
            const r = reports[t.id];
            const selected = t.id === templateId;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => chooseTemplate(t.id)}
                className={cn(
                  'rounded-xl p-4 text-left ring-1 ring-inset transition',
                  selected ? 'bg-indigo-50/60 ring-2 ring-indigo-600' : 'ring-slate-200 hover:bg-slate-50',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full bg-gradient-to-br', t.accent)} aria-hidden />
                  <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{t.description}</p>
                <p className="mt-2 text-xs font-medium text-slate-700">
                  {r.count} records · {formatCurrency(r.total)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <div role="radiogroup" aria-label="Destination" className="grid gap-2 sm:grid-cols-2">
          {DESTINATIONS.map((d) => {
            const connection = connections[d.id];
            const selected = d.id === destinationId;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => chooseDestination(d.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl p-3 text-left ring-1 ring-inset transition',
                  selected ? 'bg-indigo-50/60 ring-2 ring-indigo-600' : 'ring-slate-200 hover:bg-slate-50',
                )}
              >
                <ServiceMark id={d.id} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    {d.name}
                    {d.simulated && <SimulatedBadge />}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {d.requiresConnection ? (connection ? connection.account : 'Not connected · click to connect') : d.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <ServiceMark id={destinationId} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-slate-900">
                {report.title} → {destination.name}
              </p>
              <p className="text-xs text-slate-500">
                {report.count} records · {formatCurrency(report.total)} · {report.period}
              </p>
            </div>
          </div>

          {destinationId === 'email' && (
            <>
              <div>
                <label htmlFor={ids.recipients} className="mb-1 block text-xs font-medium text-slate-500">
                  To
                </label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1.5 shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-indigo-600">
                  {recipients.map((r) => (
                    <span
                      key={r}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        EMAIL_RE.test(r) ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700',
                      )}
                    >
                      {r}
                      <button type="button" onClick={() => setRecipients((prev) => prev.filter((x) => x !== r))} aria-label={`Remove ${r}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id={ids.recipients}
                    type="email"
                    value={draft}
                    placeholder={recipients.length ? '' : 'accountant@example.com'}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitDraft}
                    onKeyDown={(e) => {
                      if (['Enter', ',', ' ', ';'].includes(e.key)) {
                        e.preventDefault();
                        commitDraft();
                      } else if (e.key === 'Backspace' && !draft) {
                        setRecipients((prev) => prev.slice(0, -1));
                      }
                    }}
                    className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                {recipients.some((r) => !EMAIL_RE.test(r)) && (
                  <p className="mt-1 text-xs text-rose-600" role="alert">
                    Check the highlighted addresses.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={ids.subject} className="mb-1 block text-xs font-medium text-slate-500">
                  Subject
                </label>
                <input id={ids.subject} value={subject} placeholder={effectiveSubject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={ids.message} className="mb-1 block text-xs font-medium text-slate-500">
                  Message (optional)
                </label>
                <textarea id={ids.message} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} placeholder="Hi! Here are my expenses for…" />
              </div>
            </>
          )}

          {destinationId === 'google-sheets' ? (
            <>
              <div>
                <label htmlFor={ids.sheet} className="mb-1 block text-xs font-medium text-slate-500">
                  Spreadsheet name
                </label>
                <input id={ids.sheet} value={sheetName} placeholder={effectiveSheet} onChange={(e) => setSheetName(e.target.value)} className={inputClass} />
              </div>
              <SheetPreview rows={report.rows.slice(0, 4).map((e) => [e.date, e.category, formatCurrency(e.amount), e.description])} name={effectiveSheet} />
            </>
          ) : (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">{destinationId === 'email' ? 'Attachment' : 'Format'}</p>
              <div className="flex gap-2">
                {destination.formats.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={effectiveFormat === f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition',
                      effectiveFormat === f ? 'bg-indigo-600 text-white ring-indigo-600' : 'text-slate-700 ring-slate-300 hover:bg-slate-50',
                    )}
                  >
                    {FORMAT_META[f].label}
                  </button>
                ))}
              </div>
              {destinationId !== 'email' && (
                <p className="mt-2 truncate text-xs text-slate-500">
                  Saves to <span className="font-medium text-slate-700">{destination.location(reportFilename(report, effectiveFormat))}</span>
                </p>
              )}
            </div>
          )}

          {destinationId === 'email' && allRecipients.length > 0 && invalidRecipients.length === 0 && (
            <a href={mailto} className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Or open a pre-filled draft in your own email app
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
          {report.count === 0 && <p className="text-sm text-rose-600">This template has no expenses to export yet.</p>}
        </div>
      )}

      <div className="flex justify-between gap-2 border-t border-slate-100 pt-4">
        <Button variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)} disabled={step === 1 && destination.requiresConnection && !connections[destinationId]}>
            Continue
          </Button>
        ) : (
          <Button onClick={run} disabled={!canRun}>
            {destinationId === 'email' ? 'Send in background' : 'Run in background'}
          </Button>
        )}
      </div>
    </div>
  );
}

function SheetPreview({ name, rows }: { name: string; rows: string[][] }) {
  const cols = ['A', 'B', 'C', 'D'];
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <ServiceMark id="google-sheets" size="sm" />
        <span className="truncate text-sm font-medium text-slate-800">{name}</span>
        <SimulatedBadge />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-400">
              <th className="w-8 border border-slate-200 font-normal" />
              {cols.map((c) => (
                <th key={c} className="border border-slate-200 px-2 py-0.5 font-normal">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-green-700 font-semibold text-white">
              <td className="border border-slate-200 bg-slate-50 text-center font-normal text-slate-400">1</td>
              {['Date', 'Category', 'Amount', 'Description'].map((h) => (
                <td key={h} className="border border-green-800 px-2 py-1">
                  {h}
                </td>
              ))}
            </tr>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border border-slate-200 bg-slate-50 text-center text-slate-400">{i + 2}</td>
                {r.map((cell, j) => (
                  <td key={j} className={cn('max-w-[10rem] truncate border border-slate-200 px-2 py-1 text-slate-700', j === 2 && 'text-right')}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">Frozen header row, currency formatting and a totals row are added automatically.</p>
    </div>
  );
}
