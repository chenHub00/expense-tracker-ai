import { Inbox } from 'lucide-react';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ExportPreviewProps {
  rows: readonly Expense[];
  /** Explains why nothing is shown when `rows` is empty. */
  emptyMessage: string | null;
  limit?: number;
}

export function ExportPreview({ rows, emptyMessage, limit = 8 }: ExportPreviewProps) {
  const count = rows.length;
  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
        {count > 0 && (
          <span className="text-xs text-slate-500">
            {count > limit ? `First ${limit} of ${count.toLocaleString('en-US')} rows` : `All ${count} ${count === 1 ? 'row' : 'rows'}`}
          </span>
        )}
      </div>
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <Inbox className="h-8 w-8 text-slate-300" aria-hidden />
          <p className="text-sm font-medium text-slate-700">Nothing to export</p>
          {emptyMessage && <p className="text-xs text-slate-500">{emptyMessage}</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Date</th>
                <th scope="col" className="px-4 py-2 font-medium">Category</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Amount</th>
                <th scope="col" className="px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, limit).map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDate(e.date)}</td>
                  <td className="px-4 py-2">
                    <CategoryBadge category={e.category} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums text-slate-900">{formatCurrency(e.amount)}</td>
                  <td className="max-w-[16rem] truncate px-4 py-2 text-slate-600" title={e.description}>
                    {e.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {count > limit && (
            <p className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-500">
              + {(count - limit).toLocaleString('en-US')} more in the exported file
            </p>
          )}
        </div>
      )}
    </div>
  );
}
