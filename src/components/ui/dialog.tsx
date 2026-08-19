'use client';

import type * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { IconButton } from './icon-button';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Required. Radix warns at runtime for an unlabelled dialog; making it a
   * required prop turns that into a compile-time guarantee instead.
   */
  title: string;
  /** Hide the title visually while keeping it for assistive tech. */
  titleVisuallyHidden?: boolean;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  /**
   * Focused on open. Defaults to the first tabbable element. Point this at the
   * first *meaningful* control rather than letting focus land on the close
   * button, and at Cancel for destructive confirmations.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Set false for destructive confirmations so a stray click cannot dismiss. */
  dismissible?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const sizes = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
} as const;

/**
 * A modal dialog.
 *
 * Wraps Radix rather than hand-rolling: focus trapping, focus restoration,
 * `aria-modal`, inert background content, scroll locking and Escape handling
 * are each individually subtle and collectively where hand-written dialogs fail
 * accessibility audits.
 *
 * Below `sm` it renders as a bottom sheet with its own scroll container, which
 * keeps a focused field from being pushed under the viewport edge by the
 * on-screen keyboard (WCAG 2.4.11, Focus Not Obscured).
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  titleVisuallyHidden = false,
  description,
  size = 'md',
  initialFocusRef,
  dismissible = true,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]',
            'data-[state=open]:animate-fade-in motion-reduce:animate-none',
          )}
        />
        <DialogPrimitive.Content
          {...(initialFocusRef && {
            onOpenAutoFocus: (event: Event) => {
              event.preventDefault();
              initialFocusRef.current?.focus();
            },
          })}
          {...(!dismissible && {
            onPointerDownOutside: (e: Event) => e.preventDefault(),
            onInteractOutside: (e: Event) => e.preventDefault(),
            onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
          })}
          className={cn(
            'fixed z-50 flex flex-col border border-border bg-surface shadow-overlay',
            // Mobile: bottom sheet, capped so it never covers the whole screen.
            'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl',
            // sm and up: centred modal.
            'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85dvh] sm:w-full',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
            sizes[size],
            'data-[state=open]:animate-slide-up sm:data-[state=open]:animate-scale-in',
            'motion-reduce:animate-none',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3">
            <div className="min-w-0 space-y-1">
              <DialogPrimitive.Title
                className={cn(
                  'text-lg font-semibold text-foreground',
                  titleVisuallyHidden && 'sr-only',
                )}
              >
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close dialog" size="sm" icon={<X className="size-4" />} />
            </DialogPrimitive.Close>
          </div>

          {/* Its own scroll container: long content scrolls inside the sheet
              rather than the page behind it. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>

          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
