'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Milliseconds before auto-dismiss. `null` keeps it until dismissed. */
  duration: number | null;
  action?: { label: string; onClick: () => void };
}

/**
 * A module-scoped store rather than the app's Zustand store.
 *
 * Toasts are a property of the UI kit, not of the application, and the boundary
 * rule forbids primitives from importing app state. Keeping the queue local is
 * what lets `toast()` be called from anywhere — including non-React code such
 * as the timer engine's effect handler — without a provider or a hook.
 */
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

/** The server never has toasts; a stable empty array keeps hydration clean. */
const EMPTY: Toast[] = [];
function getServerSnapshot() {
  return EMPTY;
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export interface ToastOptions {
  description?: string;
  duration?: number | null;
  action?: { label: string; onClick: () => void };
  /** Reuse an id to replace an existing toast instead of stacking duplicates. */
  id?: string;
}

function push(variant: ToastVariant, title: string, options: ToastOptions = {}): string {
  const id = options.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const duration = options.duration === undefined ? 5000 : options.duration;

  const next: Toast = {
    id,
    title,
    variant,
    duration,
    ...(options.description !== undefined && { description: options.description }),
    ...(options.action !== undefined && { action: options.action }),
  };

  const existing = timers.get(id);
  if (existing) clearTimeout(existing);

  toasts = [...toasts.filter((t) => t.id !== id), next].slice(-3);
  emit();

  if (duration !== null) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration),
    );
  }
  return id;
}

export const toast = {
  info: (title: string, options?: ToastOptions) => push('info', title, options),
  success: (title: string, options?: ToastOptions) => push('success', title, options),
  warning: (title: string, options?: ToastOptions) => push('warning', title, options),
  error: (title: string, options?: ToastOptions) =>
    push('error', title, { duration: 8000, ...options }),
  dismiss: dismissToast,
};

const icons: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const accents: Record<ToastVariant, string> = {
  info: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
};

function ToastCard({ item }: { item: Toast }) {
  const Icon = icons[item.variant];
  const onDismiss = useCallback(() => dismissToast(item.id), [item.id]);

  // Pause the auto-dismiss while the pointer is over the toast, so a toast the
  // user is actively reading does not vanish mid-sentence.
  useEffect(() => {
    return () => {
      const timer = timers.get(item.id);
      if (timer) clearTimeout(timer);
    };
  }, [item.id]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-border',
        'bg-surface p-3.5 shadow-overlay',
        'animate-slide-up motion-reduce:animate-none',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', accents[item.variant])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
        ) : null}
        {item.action ? (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            className={cn(
              'mt-2 rounded-md text-sm font-medium text-accent-text underline underline-offset-2',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss: ${item.title}`}
        className={cn(
          'shrink-0 rounded-md p-1 text-subtle-foreground hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Renders the toast queue. Mount once, in the root layout.
 *
 * The region is `polite`, never `assertive`: a finished pomodoro is not an
 * emergency, and assertive announcements interrupt whatever the user is
 * currently reading.
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
      className={cn(
        'pointer-events-none fixed z-[60] flex flex-col gap-2',
        'inset-x-3 bottom-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-90',
      )}
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
