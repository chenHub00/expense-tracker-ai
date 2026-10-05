'use client';

import { ArrowLeftRight, Check, Lock, Wallet } from 'lucide-react';
import { useId, useState } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { DESTINATION_BY_ID, type DestinationId } from '@/lib/cloud/destinations';
import { useCloud } from './CloudProvider';
import { ServiceMark } from './ui';

const PERMISSIONS: Partial<Record<DestinationId, string[]>> = {
  'google-sheets': ['Create spreadsheets in your Drive', 'Edit spreadsheets created by Expense Tracker'],
  'google-drive': ['Create files in an “Expense Tracker” folder', 'See files created by Expense Tracker'],
  dropbox: ['Write to /Apps/Expense Tracker', 'Read files in that folder only'],
  onedrive: ['Create files in Documents/Expense Tracker', 'Read files created by Expense Tracker'],
};

/** Simulated OAuth consent screen. */
export function ConsentPanel({ destinationId, onDone, onCancel }: { destinationId: DestinationId; onDone: () => void; onCancel: () => void }) {
  const { connect } = useCloud();
  const toast = useToast();
  const destination = DESTINATION_BY_ID[destinationId];
  const inputId = useId();
  const [account, setAccount] = useState('you@example.com');
  const [isConnecting, setIsConnecting] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.trim());

  const handleAllow = () => {
    setIsConnecting(true);
    // Stand-in for the OAuth redirect round-trip.
    setTimeout(() => {
      connect(destinationId, account.trim());
      toast.success({ title: `${destination.name} connected`, description: `Signed in as ${account.trim()}` });
      onDone();
    }, 1200);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-3 pt-1">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm" aria-hidden>
          <Wallet className="h-7 w-7" />
        </span>
        <ArrowLeftRight className="h-5 w-5 text-slate-300" aria-hidden />
        <ServiceMark id={destinationId} size="lg" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-slate-900">Expense Tracker wants to access your {destination.name} account</p>
        <p className="mt-1 text-sm text-slate-500">You can disconnect at any time from the Export Hub.</p>
      </div>
      <ul className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        {(PERMISSIONS[destinationId] ?? []).map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            {p}
          </li>
        ))}
        <li className="flex items-start gap-2 text-slate-500">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No access to any other files
        </li>
      </ul>
      <div>
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-slate-500">
          Account
        </label>
        <input
          id={inputId}
          type="email"
          value={account}
          disabled={isConnecting}
          onChange={(e) => setAccount(e.target.value)}
          className="block w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600"
        />
      </div>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Demo integration: nothing is sent to {destination.name}. The connection is stored only in this browser.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isConnecting}>
          Cancel
        </Button>
        <Button onClick={handleAllow} loading={isConnecting} disabled={!valid}>
          {isConnecting ? 'Connecting…' : 'Allow access'}
        </Button>
      </div>
    </div>
  );
}
