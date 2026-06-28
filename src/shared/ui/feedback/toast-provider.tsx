'use client';

import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastVariant = 'info' | 'success' | 'error' | 'loading';

interface ToastOptions {
  description?: string;
  duration?: number;
  title: string;
  variant?: ToastVariant;
}

interface ToastRecord extends Required<Omit<ToastOptions, 'duration'>> {
  id: string;
  duration: number;
}

interface ToastContextValue {
  dismissToast: (id: string) => void;
  showToast: (options: ToastOptions) => string;
  updateToast: (id: string, options: Partial<ToastOptions>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef(new Map<string, number>());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearTimer],
  );

  const scheduleDismiss = useCallback(
    (id: string, duration: number) => {
      clearTimer(id);
      if (duration <= 0) {
        return;
      }

      const timer = window.setTimeout(() => dismissToast(id), duration);
      timersRef.current.set(id, timer);
    },
    [clearTimer, dismissToast],
  );

  const showToast = useCallback(
    ({ description = '', duration, title, variant = 'info' }: ToastOptions) => {
      const id = crypto.randomUUID();
      const resolvedDuration = duration ?? (variant === 'loading' ? 0 : 3200);
      const toast: ToastRecord = {
        description,
        duration: resolvedDuration,
        id,
        title,
        variant,
      };

      setToasts((current) => [...current.slice(-4), toast]);
      scheduleDismiss(id, resolvedDuration);
      return id;
    },
    [scheduleDismiss],
  );

  const updateToast = useCallback(
    (id: string, options: Partial<ToastOptions>) => {
      setToasts((current) =>
        current.map((toast) => {
          if (toast.id !== id) {
            return toast;
          }

          const variant = options.variant ?? toast.variant;
          const duration = options.duration ?? (variant === 'loading' ? 0 : 3200);
          scheduleDismiss(id, duration);
          return {
            ...toast,
            ...options,
            description: options.description ?? toast.description,
            duration,
            title: options.title ?? toast.title,
            variant,
          };
        }),
      );
    },
    [scheduleDismiss],
  );

  const value = useMemo(
    () => ({ dismissToast, showToast, updateToast }),
    [dismissToast, showToast, updateToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions text">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastItem({ onDismiss, toast }: { onDismiss: (id: string) => void; toast: ToastRecord }) {
  const Icon = toastIcon(toast.variant);

  return (
    <div className={`toast-card toast-card--${toast.variant}`} role="status">
      <div className="toast-card__icon">
        <Icon
          className={['toast-card__symbol', toast.variant === 'loading' ? 'animate-spin' : '']
            .filter(Boolean)
            .join(' ')}
        />
      </div>
      <div className="toast-card__content">
        <div className="toast-card__title">{toast.title}</div>
        {toast.description ? (
          <div className="toast-card__description">{toast.description}</div>
        ) : null}
      </div>
      <button
        type="button"
        className="toast-card__close"
        aria-label="Close"
        onClick={() => onDismiss(toast.id)}
      >
        <X className="toast-card__close-icon" />
      </button>
    </div>
  );
}

function toastIcon(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return CheckCircle2;
    case 'error':
      return AlertTriangle;
    case 'loading':
      return Loader2;
    default:
      return Info;
  }
}
