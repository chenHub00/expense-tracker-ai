import { CATEGORY_META } from '@/lib/categories';
import { CATEGORIES, type Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FormSection } from './FormSection';

interface CategoryPickerProps {
  selected: readonly Category[];
  /** Expenses per category within the chosen dates. */
  counts: Record<Category, number>;
  onToggle: (category: Category) => void;
  onSelectAll: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function CategoryPicker({ selected, counts, onToggle, onSelectAll, onClear, disabled }: CategoryPickerProps) {
  return (
    <FormSection
      title="Categories"
      action={
        <div className="flex gap-1 text-xs">
          <button type="button" disabled={disabled} onClick={onSelectAll} className="rounded px-1.5 py-0.5 font-medium text-indigo-600 hover:bg-indigo-50">
            Select all
          </button>
          <button type="button" disabled={disabled} onClick={onClear} className="rounded px-1.5 py-0.5 font-medium text-slate-500 hover:bg-slate-100">
            Clear
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((category) => {
          const isSelected = selected.includes(category);
          const { icon: Icon, iconClass } = CATEGORY_META[category];
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onToggle(category)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ring-1 ring-inset transition',
                isSelected ? 'bg-white text-slate-900 ring-indigo-300' : 'bg-slate-50 text-slate-400 ring-slate-200 hover:text-slate-600',
              )}
            >
              <span
                className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', isSelected ? iconClass : 'bg-slate-100 text-slate-400')}
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{category}</span>
              <span className="text-xs tabular-nums text-slate-400">{counts[category]}</span>
            </button>
          );
        })}
      </div>
    </FormSection>
  );
}
