import { Check } from 'lucide-react';
import type { FormatOption } from '@/lib/export/formats';
import { cn } from '@/lib/utils';
import { FormSection } from './FormSection';
import { formatIcon } from './formatIcons';

interface FormatPickerProps {
  options: readonly FormatOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function FormatPicker({ options, value, onChange, disabled }: FormatPickerProps) {
  const selected = options.find((o) => o.id === value);
  return (
    <FormSection title="Format">
      <div role="radiogroup" aria-label="Export format" className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const Icon = formatIcon(option.id);
          const checked = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              data-autofocus={checked ? '' : undefined}
              disabled={disabled}
              onClick={() => onChange(option.id)}
              title={option.description}
              className={cn(
                'relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-sm font-medium ring-1 ring-inset transition',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                checked ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {checked && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-indigo-600" aria-hidden />}
              <Icon className="h-5 w-5" aria-hidden />
              {option.label}
            </button>
          );
        })}
      </div>
      {selected && <p className="text-xs text-slate-500">{selected.description}</p>}
    </FormSection>
  );
}
