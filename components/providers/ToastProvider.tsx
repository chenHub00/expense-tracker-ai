'use client';

import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: ToastAction;
}

type ToastOptions = Omit<Toast, 'id' | 'variant'>;

interface ToastContextValue {
  success: (options: ToastOptions) => void;
  error: (options: ToastOptions) => void;
  info: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 4500;

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheck, className: 'text-emerald-600' },
  error: { icon: CircleAlert, className: 'text-rose-600' },
  info: { icon: Info, className: 'text-indigo-600' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { icon: Icon, className } = VARIANT_STYLES[toast.variant];

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 animate-slide-up"
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', className)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-slate-500">{toast.description}</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className="shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, options: ToastOptions) => {
    const id = ++nextId.current;
    // Keep at most three toasts on screen.
    setToasts((current) => [...current.slice(-2), { ...options, id, variant }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (o) => push('success', o),
      error: (o) => push('error', o),
      info: (o) => push('info', o),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
