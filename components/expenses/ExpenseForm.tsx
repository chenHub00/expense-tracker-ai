'use client';

import { CalendarDays } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { CATEGORY_META } from '@/lib/categories';
import { CATEGORIES, type Expense, type ExpenseInput } from '@/lib/types';
import { cn, todayISO } from '@/lib/utils';
import {
  MAX_DESCRIPTION_LENGTH,
  toExpenseInput,
  validateExpense,
  type ExpenseFormValues,
} from '@/lib/validation';

interface ExpenseFormProps {
  expense?: Expense;
  onSubmit: (input: ExpenseInput) => void | Promise<void>;
  onCancel: () => void;
}

type Field = keyof ExpenseFormValues;
const FIELD_ORDER: Field[] = ['amount', 'date', 'category', 'description'];

const inputClass = (invalid: boolean) =>
  cn(
    'block w-full rounded-lg border-0 bg-white py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400',
    'focus:outline-none focus:ring-2 focus:ring-inset transition',
    invalid ? 'ring-rose-300 focus:ring-rose-500' : 'ring-slate-300 focus:ring-indigo-600',
  );

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-rose-600">
      {message}
    </p>
  );
}

export function ExpenseForm({ expense, onSubmit, onCancel }: ExpenseFormProps) {
  const today = useMemo(() => todayISO(), []);
  const [values, setValues] = useState<ExpenseFormValues>(() =>
    expense
      ? {
          date: expense.date,
          amount: expense.amount.toFixed(2),
          category: expense.category,
          description: expense.description,
        }
      : { date: today, amount: '', category: '', description: '' },
  );
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fieldRefs = useRef<Partial<Record<Field, HTMLElement | null>>>({});

  const errors = useMemo(() => validateExpense(values, today), [values, today]);
  const visibleError = (field: Field) => (touched[field] || submitAttempted ? errors[field] : undefined);

  const setField = <K extends Field>(field: K, value: ExpenseFormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));
  const markTouched = (field: Field) => setTouched((current) => ({ ...current, [field]: true }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitAttempted(true);

    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(toExpenseInput(values));
    } finally {
      setSubmitting(false);
    }
  }

  const descriptionLength = values.description.trim().length;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="expense-amount" className="block text-sm font-medium text-slate-700">
            Amount
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500">
              $
            </span>
            <input
              id="expense-amount"
              ref={(el) => {
                fieldRefs.current.amount = el;
              }}
              data-autofocus
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={values.amount}
              onChange={(e) => setField('amount', e.target.value)}
              onBlur={() => {
                markTouched('amount');
                // Normalise valid amounts to two decimals for a cleaner display.
                if (!errors.amount) setField('amount', Number(values.amount.replace(/,/g, '')).toFixed(2));
              }}
              aria-invalid={Boolean(visibleError('amount'))}
              aria-describedby={visibleError('amount') ? 'expense-amount-error' : undefined}
              className={cn(inputClass(Boolean(visibleError('amount'))), 'pl-7 pr-3 tabular-nums')}
            />
          </div>
          <FieldError id="expense-amount-error" message={visibleError('amount')} />
        </div>

        <div>
          <label htmlFor="expense-date" className="block text-sm font-medium text-slate-700">
            Date
          </label>
          <div className="relative mt-1.5">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              id="expense-date"
              ref={(el) => {
                fieldRefs.current.date = el;
              }}
              type="date"
              max={today}
              min="2000-01-01"
              value={values.date}
              onChange={(e) => setField('date', e.target.value)}
              onBlur={() => markTouched('date')}
              aria-invalid={Boolean(visibleError('date'))}
              aria-describedby={visibleError('date') ? 'expense-date-error' : undefined}
              className={cn(inputClass(Boolean(visibleError('date'))), 'pl-9 pr-3')}
            />
          </div>
          <FieldError id="expense-date-error" message={visibleError('date')} />
        </div>
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-slate-700">Category</legend>
        <div
          role="radiogroup"
          aria-invalid={Boolean(visibleError('category'))}
          aria-describedby={visibleError('category') ? 'expense-category-error' : undefined}
          className="mt-1.5 grid grid-cols-2 gap-2"
        >
          {CATEGORIES.map((category, index) => {
            const { icon: Icon, iconClass } = CATEGORY_META[category];
            const selected = values.category === category;
            return (
              <button
                key={category}
                ref={
                  index === 0
                    ? (el) => {
                        fieldRefs.current.category = el;
                      }
                    : undefined
                }
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setField('category', category);
                  markTouched('category');
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                  selected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', iconClass)}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="truncate">{category}</span>
              </button>
            );
          })}
        </div>
        <FieldError id="expense-category-error" message={visibleError('category')} />
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="expense-description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <span
            className={cn(
              'text-xs tabular-nums',
              descriptionLength > MAX_DESCRIPTION_LENGTH ? 'text-rose-600' : 'text-slate-400',
            )}
          >
            {descriptionLength}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
        <input
          id="expense-description"
          ref={(el) => {
            fieldRefs.current.description = el;
          }}
          type="text"
          autoComplete="off"
          placeholder="e.g. Weekly groceries"
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          onBlur={() => markTouched('description')}
          aria-invalid={Boolean(visibleError('description'))}
          aria-describedby={visibleError('description') ? 'expense-description-error' : undefined}
          className={cn(inputClass(Boolean(visibleError('description'))), 'mt-1.5 px-3')}
        />
        <FieldError id="expense-description-error" message={visibleError('description')} />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {expense ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
}
