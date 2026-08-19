import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { siteConfig } from '@/config/site';
import { AppChrome } from '@/components/layout/app-chrome';
import { HydrationGate } from '@/components/layout/hydration-gate';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author }],
  keywords: ['pomodoro', 'timer', 'focus', 'productivity', 'todo list', 'time tracking'],
  openGraph: {
    type: 'website',
    url: siteConfig.url,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: 'default',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // No `maximum-scale` and no `user-scalable=no`: blocking zoom fails WCAG
  // 1.4.4 and is a genuine barrier for low-vision users.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1b1a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` is required and scoped to <html>: next-themes
    // writes the theme class before React hydrates, so this one element
    // legitimately differs between server and client.
    <html lang="en" suppressHydrationWarning className={inter.variable} data-accent="sage">
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          <HydrationGate />
          <AppChrome />
          <a
            href="#main"
            className="sr-only rounded-lg bg-surface px-4 py-2 text-sm font-medium shadow-overlay focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
          >
            Skip to content
          </a>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
