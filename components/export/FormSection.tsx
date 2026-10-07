export function FormSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <legend className="text-sm font-semibold text-slate-900">{title}</legend>
        {action}
      </div>
      {children}
    </fieldset>
  );
}
