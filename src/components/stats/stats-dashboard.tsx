'use client';

import { useMemo } from 'react';
import { BarChart3, Clock, Flame, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, EmptyState, Skeleton } from '@/components/ui';
import { useHydrated } from '@/hooks/use-hydrated';
import { computeStats } from '@/lib/stats/aggregate';
import { formatFocusTime } from '@/lib/utils/time';
import { useSessionsStore } from '@/store/sessions-store';
import { useSettingsStore } from '@/store/settings-store';
import { ContributionHeatmap } from './contribution-heatmap';
import { FocusBarChart } from './focus-bar-chart';
import { StatTile } from './stat-tile';

export function StatsDashboard() {
  const hydrated = useHydrated();
  const sessions = useSessionsStore((state) => state.sessions);
  const settings = useSettingsStore((state) => state.settings);

  // Recomputed only when the ledger or the goal changes. Deriving on every
  // render would be wasteful across a year of sessions; caching it in the store
  // would let the numbers drift from the log.
  const stats = useMemo(() => computeStats(sessions, settings), [sessions, settings]);

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              key={i}
              className="h-24 rounded-2xl"
              {...(i === 0 ? { loadingLabel: 'Loading your stats' } : {})}
            />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!stats.hasData) {
    return (
      <EmptyState
        variant="card"
        icon={<BarChart3 className="size-6" />}
        title="No sessions yet"
        description="Finish your first focus session and your stats will start building here — daily totals, streaks, and a year at a glance."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Today"
          value={formatFocusTime(stats.today.focusMs)}
          hint={`Goal ${formatFocusTime(stats.today.goalMs)}`}
          icon={<Clock className="size-4" />}
          emphasis={stats.today.goalMet}
        />
        <StatTile
          label="This week"
          value={formatFocusTime(stats.week.totalFocusMs)}
          hint={`${formatFocusTime(stats.week.dailyAverageMs)} per active day`}
          icon={<BarChart3 className="size-4" />}
        />
        <StatTile
          label="Streak"
          value={`${stats.streak.current} ${stats.streak.current === 1 ? 'day' : 'days'}`}
          hint={
            stats.streak.atRisk ? 'Hit your goal today to keep it' : `Best: ${stats.streak.longest}`
          }
          icon={<Flame className="size-4" />}
          emphasis={stats.streak.current > 0 && !stats.streak.atRisk}
        />
        <StatTile
          label="Sessions"
          value={String(stats.totalSessions)}
          hint={`${formatFocusTime(stats.averageSessionMs)} average`}
          icon={<Target className="size-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This week</CardTitle>
        </CardHeader>
        <FocusBarChart days={stats.week.days} goalMs={stats.today.goalMs} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatFocusTime(stats.totalFocusMs)} total
          </p>
        </CardHeader>
        <ContributionHeatmap cells={stats.heatmap} />
      </Card>
    </div>
  );
}
