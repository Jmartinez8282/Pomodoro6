'use client';

import type * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium select-none',
    'transition-[background-color,color,border-color,box-shadow,transform] duration-150',
    'motion-reduce:transition-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:pointer-events-none disabled:opacity-45',
    'active:scale-[0.98] motion-reduce:active:scale-100',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-foreground shadow-card hover:brightness-110',
        secondary: 'bg-surface text-foreground shadow-card hover:bg-surface-hover',
        outline: 'border border-border bg-transparent text-foreground hover:bg-surface-hover',
        ghost: 'bg-transparent text-muted-foreground hover:bg-surface-hover hover:text-foreground',
        danger: 'bg-danger text-danger-foreground hover:brightness-110',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-sm',
        md: 'h-10 rounded-lg px-4 text-sm',
        lg: 'h-12 rounded-xl px-6 text-base',
        /** The primary Start/Pause control. */
        xl: 'h-14 rounded-2xl px-10 text-lg tracking-wide',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
);

export interface ButtonProps
  extends Omit<React.ComponentPropsWithRef<'button'>, 'color'>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render into the child element instead of a `<button>`.
   *
   * Preferred over a polymorphic `as` prop: it composes with `next/link`
   * without pushing generic inference onto every consumer, which is what makes
   * polymorphic components produce unreadable type errors.
   */
  asChild?: boolean;
  /** Shows a spinner, sets `aria-busy`, and blocks interaction. */
  isLoading?: boolean;
  /** Announced to assistive tech while loading. */
  loadingText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  isLoading = false,
  loadingText = 'Loading',
  leadingIcon,
  trailingIcon,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          {/* The label stays in the layout but is hidden, so the button does
              not change width when it enters the loading state. */}
          <span className="invisible contents">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            <span className="sr-only">{loadingText}</span>
          </span>
        </>
      ) : (
        <>
          {leadingIcon}
          {children}
          {trailingIcon}
        </>
      )}
    </Comp>
  );
}
