'use client';

import { Clock, Eye, LinkIcon, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { Card, Skeleton } from '@/components/ui/Card';
import { CATEGORY_META } from '@/lib/categories';
import { decodeShare, type SharePayload } from '@/lib/cloud/share';
import { CATEGORIES } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

type ViewState = { status: 'loading' } | { status: 'invalid' } | { status: 'expired'; payload: SharePayload } | { status: 'ok'; payload: SharePayload };

export default function SharedReportPage() {
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    const load = () => {
      const token = window.location.hash.slice(1);
      if (!token) return setState({ status: 'invalid' });
      decodeShare(token)
        .then((payload) =>
          setState(
            payload.expiresAt && new Date(payload.expiresAt).getTime() <= Date.now()
              ? { status: 'expired', payload }
              : { status: 'ok', payload },
          ),
        )
        .catch(() => setState({ status: 'invalid' }));
    };
    load();
    window.addEventListener('hashchange', load);
    return () => window.removeEventListener('hashchange', load);
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }
  if (state.status !== 'ok') {
    const expired = state.status === 'expired';
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          {expired ? <Clock className="h-6 w-6" aria-hidden /> : <ShieldAlert className="h-6 w-6" aria-hidden />}
        </span>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">{expired ? 'This link has expired' : 'This link is not valid'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {expired
            ? `It stopped working on ${new Date(state.payload.expiresAt!).toLocaleDateString('en-US', { dateStyle: 'medium' })}. Ask the sender for a new one.`
            : 'It may have been cut off when it was copied. Ask the sender to share it again.'}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline">
          Go to Expense Tracker
        </Link>
      </Card>
    );
  }
  return <SharedReport payload={state.payload} />;
}

function SharedReport({ payload }: { payload: SharePayload }) {
  const { total, breakdown } = useMemo(() => {
    const totals = new Map<string, number>();
    let sum = 0;
    for (const [, category, amount] of payload.rows) {
      sum += amount;
      totals.set(category, (totals.get(category) ?? 0) + amount);
    }
    return {
      total: sum,
      breakdown: CATEGORIES.filter((c) => totals.has(c))
        .map((c) => ({ category: c, total: totals.get(c)! }))
        .sort((a, b) => b.total - a.total),
    };
  }, [payload]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-6 text-white">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-indigo-100">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Read-only snapshot
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{payload.title}</h1>
          <p className="text-sm text-indigo-100">{payload.period}</p>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
          {[
            { label: 'Total', value: formatCurrency(total) },
            { label: 'Expenses', value: String(payload.rows.length) },
            { label: 'Created', value: new Date(payload.generatedAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) },
            { label: 'Expires', value: payload.expiresAt ? new Date(payload.expiresAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Never' },
          ].map((s) => (
            <div key={s.label} className="bg-white px-6 py-3">
              <dt className="text-xs text-slate-500">{s.label}</dt>
              <dd className="text-base font-semibold tabular-nums text-slate-900">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {breakdown.length > 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">By category</h2>
          <ul className="mt-4 space-y-3">
            {breakdown.map((b) => (
              <li key={b.category}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{b.category}</span>
                  <span className="tabular-nums text-slate-900">
                    {formatCurrency(b.total)} <span className="text-slate-400">· {((b.total / total) * 100).toFixed(0)}%</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(b.total / total) * 100}%`, backgroundColor: CATEGORY_META[b.category].color }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Date</th>
                <th scope="col" className="px-6 py-3 font-medium">Category</th>
                {!payload.hideDescriptions && <th scope="col" className="px-6 py-3 font-medium">Description</th>}
                <th scope="col" className="px-6 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payload.rows.map(([date, category, amount, description], i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap px-6 py-2.5 text-slate-600">{formatDate(date)}</td>
                  <td className="px-6 py-2.5">
                    <CategoryBadge category={category} />
                  </td>
                  {!payload.hideDescriptions && <td className="px-6 py-2.5 text-slate-700">{description}</td>}
                  <td className="whitespace-nowrap px-6 py-2.5 text-right font-medium tabular-nums text-slate-900">{formatCurrency(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <LinkIcon className="h-3.5 w-3.5" aria-hidden />
        Shared from Expense Tracker. This data lives in the link itself and was never uploaded.
      </p>
    </div>
  );
}
