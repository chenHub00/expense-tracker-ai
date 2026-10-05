import { DESTINATION_BY_ID, type DestinationId } from '@/lib/cloud/destinations';
import { cn } from '@/lib/utils';

export function ServiceMark({ id, size = 'md' }: { id: DestinationId; size?: 'sm' | 'md' | 'lg' }) {
  const d = DESTINATION_BY_ID[id];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-bold tracking-tight shadow-sm',
        d.tile,
        size === 'sm' && 'h-7 w-7 rounded-lg text-[10px]',
        size === 'md' && 'h-10 w-10 text-xs',
        size === 'lg' && 'h-14 w-14 rounded-2xl text-base',
      )}
    >
      {d.mark}
    </span>
  );
}

export type SyncTone = 'ok' | 'busy' | 'idle' | 'error';

export function StatusDot({ tone }: { tone: SyncTone }) {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden>
      {tone === 'busy' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />}
      <span
        className={cn(
          'relative inline-flex h-2 w-2 rounded-full',
          tone === 'ok' && 'bg-emerald-500',
          tone === 'busy' && 'bg-sky-500',
          tone === 'idle' && 'bg-slate-300',
          tone === 'error' && 'bg-rose-500',
        )}
      />
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50',
        checked ? 'bg-indigo-600' : 'bg-slate-300',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export function SimulatedBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-600/20"
      title="This integration is simulated: no data leaves your browser."
    >
      Demo
    </span>
  );
}
