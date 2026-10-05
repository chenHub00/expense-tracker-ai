'use client';

import { CloudProvider } from '@/components/cloud/CloudProvider';
import { ExpenseDialogProvider } from './ExpenseDialogProvider';
import { ExpenseProvider } from './ExpenseProvider';
import { ToastProvider } from './ToastProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ExpenseProvider>
        <ExpenseDialogProvider>
          <CloudProvider>{children}</CloudProvider>
        </ExpenseDialogProvider>
      </ExpenseProvider>
    </ToastProvider>
  );
}
