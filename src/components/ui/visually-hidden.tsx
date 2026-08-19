import type * as React from 'react';

/**
 * Visually hidden but available to assistive tech.
 *
 * Deliberately not `display: none` or `visibility: hidden` — both remove the
 * content from the accessibility tree, which defeats the purpose.
 */
export function VisuallyHidden({ children, ...props }: React.ComponentPropsWithRef<'span'>) {
  return (
    <span className="sr-only" {...props}>
      {children}
    </span>
  );
}
