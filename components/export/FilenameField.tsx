import { useId } from 'react';
import { FormSection } from './FormSection';

interface FilenameFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Shown when empty and used if the field is left blank. */
  suggestion: string;
  extension: string;
  /** The exact name the file will be saved as. */
  resolvedName: string;
  disabled?: boolean;
}

export function FilenameField({ value, onChange, suggestion, extension, resolvedName, disabled }: FilenameFieldProps) {
  const id = useId();
  return (
    <FormSection title="File name">
      <label htmlFor={id} className="sr-only">
        File name
      </label>
      <div className="flex rounded-lg shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-indigo-600">
        <input
          id={id}
          type="text"
          value={value}
          placeholder={suggestion}
          maxLength={120}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="block min-w-0 flex-1 rounded-l-lg border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <span className="flex items-center rounded-r-lg border-l border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">.{extension}</span>
      </div>
      <p className="text-xs text-slate-500">
        Saved as <span className="font-medium text-slate-700">{resolvedName}</span>
      </p>
    </FormSection>
  );
}
