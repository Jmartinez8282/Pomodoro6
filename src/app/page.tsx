import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { TaskList } from '@/components/tasks/task-list';
import { TimerPanel } from '@/components/timer/timer-panel';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <AppShell>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
        {/* Single column on phones, side-by-side from lg where both panels fit
            without either being cramped. The timer stays first in the DOM, so
            keyboard and screen-reader order matches importance at every width. */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-12">
          <TimerPanel />
          <TaskList />
        </div>
      </main>
    </AppShell>
  );
}
