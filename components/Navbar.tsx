'use client';

import { CloudUpload, LayoutDashboard, List, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useExpenseDialogs } from '@/components/providers/ExpenseDialogProvider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: List },
  { href: '/exports', label: 'Exports', icon: CloudUpload },
];

export function Navbar() {
  const pathname = usePathname();
  const { openCreate } = useExpenseDialogs();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm">
              <Wallet className="h-5 w-5" aria-hidden />
            </span>
            <span className="hidden text-base font-semibold tracking-tight text-slate-900 sm:block">
              Expense Tracker
            </span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition sm:px-3',
                    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {/* Icons only on phones: three labels plus the add button don't fit at 375px. */}
                  <span className="sr-only sm:not-sr-only">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <Button onClick={openCreate} aria-label="Add expense">
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Add expense</span>
        </Button>
      </div>
    </header>
  );
}
