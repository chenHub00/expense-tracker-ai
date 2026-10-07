import { useId } from 'react';
import { DATE_PRESETS, type DatePreset } from '@/lib/datePresets';
import { cn } from '@/lib/utils';
import { FormSection } from './FormSection';
import type { DateRange } from './useExportForm';

const ALL_TIME: DatePreset = { label: 'All time', range: () => ({ from: '', to: '' }) };

const controlClass =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600';

interface DateRangeFieldProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  invalid: boolean;
  disabled?: boolean;
  presets?: readonly DatePreset[];
}

export function DateRangeField({ value, onChange, invalid, disabled, presets = DATE_PRESETS }: DateRangeFieldProps) {
  const fromId = useId();
  const toId = useId();
  const isActive = (preset: DatePreset) => {
    const r = preset.range();
    return r.from === value.from && r.to === value.to;
  };

  return (
    <FormSection title="Date range">
      <div className="flex flex-wrap gap-1.5">
        {[ALL_TIME, ...presets].map((preset) => {
          const active = isActive(preset);
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(preset.range())}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
                active ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={fromId} className="mb-1 block text-xs font-medium text-slate-500">
            Start date
          </label>
          <input
            id={fromId}
            type="date"
            value={value.from}
            max={value.to || undefined}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className={cn(controlClass, invalid && 'ring-rose-400')}
          />
        </div>
        <div>
          <label htmlFor={toId} className="mb-1 block text-xs font-medium text-slate-500">
            End date
          </label>
          <input
            id={toId}
            type="date"
            value={value.to}
            min={value.from || undefined}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className={cn(controlClass, invalid && 'ring-rose-400')}
          />
        </div>
      </div>
      {invalid && (
        <p className="text-xs font-medium text-rose-600" role="alert">
          The start date must be on or before the end date.
        </p>
      )}
    </FormSection>
  );
}
