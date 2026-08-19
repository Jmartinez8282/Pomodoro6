'use client';

import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore, selectActiveTask } from '@/store/tasks-store';
import { useTimer } from '@/hooks/use-timer';
import { useHydrated } from '@/hooks/use-hydrated';
import { ProgressRing, SegmentedControl, Skeleton, type SegmentedOption } from '@/components/ui';
import { MODE_LABELS, TIMER_MODES, type TimerMode } from '@/types';
import { CycleDots } from './cycle-dots';
import { TimerControls } from './timer-controls';
import { TimerDisplay } from './timer-display';

const MODE_SETTING_KEY = {
  focus: 'focusMinutes',
  shortBreak: 'shortBreakMinutes',
  longBreak: 'longBreakMinutes',
} as const;

export function TimerPanel() {
  const hydrated = useHydrated();
  const timer = useTimer();
  const settings = useSettingsStore((state) => state.settings);
  const activeTask = useTasksStore(selectActiveTask);

  const options: SegmentedOption<TimerMode>[] = TIMER_MODES.map((mode) => ({
    value: mode,
    label: MODE_LABELS[mode],
    hint: `${settings[MODE_SETTING_KEY[mode]]}m`,
  }));

  // Persisted state cannot be read during server render, so the first client
  // render must match the server's. A skeleton here is what makes that true
  // without the timer flashing 25:00 before settling on the real value.
  if (!hydrated) return <TimerPanelSkeleton />;

  return (
    <section aria-label="Pomodoro timer" className="flex flex-col items-center gap-7">
      {/* Its own scroll container: at 320px the three labels plus durations are
          wider than the viewport, and the page itself must never scroll
          sideways.

          Width is plain `w-full`, not a `calc(100% + 2rem)` full-bleed with a
          negative margin — that rounds up past the parent on fractional
          layouts and leaks a stray pixel of page-level overflow on some
          platforms but not others.

          The inner `w-max min-w-full` is what makes centring safe inside a
          scroll container: `justify-center` alone makes overflowing content
          unreachable past the left edge, because there is no scrollable area
          before the centred start. */}
      <div className="w-full [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full justify-center">
          <SegmentedControl
            label="Timer mode"
            value={timer.mode}
            onValueChange={timer.setMode}
            options={options}
          />
        </div>
      </div>

      <div className="relative w-full max-w-[min(78vw,20rem)] sm:max-w-sm">
        <ProgressRing value={timer.progress} strokeWidth={3.5} animate={timer.isRunning}>
          <TimerDisplay
            remainingMs={timer.remainingMs}
            mode={timer.mode}
            isRunning={timer.isRunning}
          />
        </ProgressRing>
      </div>

      {activeTask ? (
        <p className="max-w-xs truncate text-center text-sm text-muted-foreground">
          Working on <span className="font-medium text-foreground">{activeTask.title}</span>
        </p>
      ) : null}

      <TimerControls
        status={timer.status}
        onToggle={timer.toggle}
        onReset={timer.reset}
        onSkip={timer.skip}
      />

      <CycleDots
        completed={timer.cyclesCompleted % settings.longBreakInterval}
        total={settings.longBreakInterval}
      />
    </section>
  );
}

function TimerPanelSkeleton() {
  return (
    <section aria-label="Pomodoro timer" className="flex flex-col items-center gap-7">
      <Skeleton className="h-10 w-64 rounded-full" loadingLabel="Loading timer" />
      <Skeleton className="aspect-square w-full max-w-[min(78vw,20rem)] rounded-full sm:max-w-sm" />
      <Skeleton className="h-14 w-40 rounded-2xl" />
      <Skeleton className="h-4 w-40" />
    </section>
  );
}
