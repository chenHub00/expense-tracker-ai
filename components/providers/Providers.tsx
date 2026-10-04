'use client';

import { ExpenseDialogProvider } from './ExpenseDialogProvider';
import { ExpenseProvider } from './ExpenseProvider';
import { ToastProvider } from './ToastProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ExpenseProvider>
        <ExpenseDialogProvider>{children}</ExpenseDialogProvider>
      </ExpenseProvider>
    </ToastProvider>
  );
}
