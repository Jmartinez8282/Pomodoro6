'use client';

import type * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-full',
    'transition-colors duration-150 motion-reduce:transition-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        ghost: 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
        surface: 'bg-surface text-foreground shadow-card hover:bg-surface-hover',
        accent: 'bg-accent text-accent-foreground hover:brightness-110',
        danger: 'text-muted-foreground hover:bg-danger/10 hover:text-danger',
      },
      // Sizes below 44px keep a transparent tap-target overlay via `before:`,
      // so a visually small control still satisfies WCAG 2.5.8 on touch.
      size: {
        sm: 'relative size-8 before:absolute before:-inset-2',
        md: 'size-10',
        lg: 'size-12',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export interface IconButtonProps
  extends
    Omit<React.ComponentPropsWithRef<'button'>, 'color' | 'children'>,
    VariantProps<typeof iconButtonVariants> {
  /**
   * Required. An icon-only control is invisible to screen readers without it,
   * and making it required means the compiler catches the omission — this is
   * the single most common accessibility defect in icon-driven UIs.
   */
  label: string;
  icon: React.ReactNode;
  asChild?: boolean;
}

export function IconButton({
  className,
  variant,
  size,
  label,
  icon,
  asChild = false,
  ...props
}: IconButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(iconButtonVariants({ variant, size }), className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <span aria-hidden className="pointer-events-none">
        {icon}
      </span>
    </Comp>
  );
}
