import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { StatsDashboard } from '@/components/stats/stats-dashboard';

export const metadata: Metadata = {
  title: 'Stats',
  description: 'Your focus time, streaks, and daily patterns.',
  alternates: { canonical: '/stats' },
};

export default function StatsPage() {
  return (
    <AppShell>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Stats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything here is derived from your session history, stored on this device.
          </p>
        </div>
        <StatsDashboard />
      </main>
    </AppShell>
  );
}
