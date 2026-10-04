'use client';

import { TriangleAlert, X } from 'lucide-react';
import { useExpenses } from '@/components/providers/ExpenseProvider';

export function StorageErrorBanner() {
  const { loadError, dismissLoadError } = useExpenses();
  if (!loadError) return null;

  return (
    <div role="alert" className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <p className="flex-1 text-sm text-amber-800">{loadError}</p>
        <button
          type="button"
          onClick={dismissLoadError}
          className="rounded-md p-1 text-amber-700 hover:bg-amber-100"
          aria-label="Dismiss warning"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
