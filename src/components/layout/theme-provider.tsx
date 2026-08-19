'use client';

import type * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Wraps `next-themes` rather than hand-rolling theme state.
 *
 * The value it adds is a blocking inline script that applies the stored theme
 * before first paint. Without that, a dark-mode user sees a white flash on
 * every navigation — a problem no amount of React state can fix, because React
 * has not run yet.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
