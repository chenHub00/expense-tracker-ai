'use client';

import { Check, Copy, ExternalLink, Link2, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TEMPLATES, type TemplateId } from '@/lib/cloud/reports';
import type { SharedLink } from '@/lib/cloud/state';
import { cn } from '@/lib/utils';
import { useCloud } from './CloudProvider';
import { Toggle } from './ui';

const EXPIRY_OPTIONS: Array<{ label: string; days: number | null }> = [
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'Never', days: null },
];

export function ShareDialog({ open, onClose, initialTemplate }: { open: boolean; onClose: () => void; initialTemplate?: TemplateId }) {
  return (
    <Modal open={open} onClose={onClose} title="Share a read-only snapshot" description="Anyone with the link can view it. No account needed.">
      <ShareForm initialTemplate={initialTemplate} />
    </Modal>
  );
}

function ShareForm({ initialTemplate }: { initialTemplate?: TemplateId }) {
  const { createShareLink } = useCloud();
  const toast = useToast();
  const selectId = useId();
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplate ?? 'monthly-summary');
  const [expiry, setExpiry] = useState<number | null>(7);
  const [hideDescriptions, setHideDescriptions] = useState(false);
  const [link, setLink] = useState<SharedLink | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      setLink(await createShareLink({ templateId, expiresInDays: expiry, hideDescriptions }));
    } catch {
      toast.error({ title: 'Could not create link', description: 'Your browser does not support the compression this needs.' });
    } finally {
      setIsCreating(false);
    }
  };

  if (link) return <LinkResult link={link} onReset={() => setLink(null)} />;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-slate-500">
          What to share
        </label>
        <select
          id={selectId}
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value as TemplateId)}
          className="block w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600"
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}: {t.tagline}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-slate-500">Link expires after</legend>
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
          {EXPIRY_OPTIONS.map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={expiry === o.days}
              onClick={() => setExpiry(o.days)}
              className={cn(
                'rounded-md px-2 py-1.5 text-xs font-medium transition',
                expiry === o.days ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Hide descriptions</p>
          <p className="text-xs text-slate-500">Share dates, categories and amounts only, for extra privacy.</p>
        </div>
        <Toggle checked={hideDescriptions} onChange={setHideDescriptions} label="Hide descriptions" />
      </div>
      <p className="flex items-start gap-2 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        The snapshot is compressed into the link itself. Nothing is uploaded, and the data reflects your expenses right now.
      </p>
      <div className="flex justify-end">
        <Button onClick={handleCreate} loading={isCreating}>
          <Link2 className="h-4 w-4" aria-hidden />
          Create link
        </Button>
      </div>
    </div>
  );
}

export function LinkResult({ link, onReset }: { link: SharedLink; onReset?: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Loaded on demand; QR codes hold about 2.9 KB, so large snapshots may not fit.
    import('qrcode')
      .then((QR) => QR.toDataURL(link.url, { errorCorrectionLevel: 'L', margin: 1, width: 220, color: { dark: '#0f172a' } }))
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQrError(true));
    return () => {
      cancelled = true;
    };
  }, [link.url]);

  const copy = async () => {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code for the share link" width={180} height={180} className="rounded-lg bg-white p-1" />
        ) : qrError ? (
          <p className="px-6 py-10 text-center text-xs text-slate-500">
            This snapshot is too large for a QR code. Share the link instead, or pick a smaller template such as Monthly Summary.
          </p>
        ) : (
          <div className="h-[180px] w-[180px] animate-pulse rounded-lg bg-slate-200" />
        )}
        <p className="text-xs text-slate-500">Scan with a phone camera to open</p>
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={link.url}
          aria-label="Share link"
          onFocus={(e) => e.target.select()}
          className="block min-w-0 flex-1 rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-inset ring-slate-300"
        />
        <Button onClick={copy} variant={copied ? 'secondary' : 'primary'}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {link.records} records · {link.expiresAt ? `expires ${new Date(link.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'never expires'}
          {' · '}
          {(link.url.length / 1024).toFixed(1)} KB link
        </span>
        <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
          Preview <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>
      {onReset && (
        <button type="button" onClick={onReset} className="text-xs font-medium text-slate-500 hover:text-slate-700">
          ← Create another link
        </button>
      )}
    </div>
  );
}
