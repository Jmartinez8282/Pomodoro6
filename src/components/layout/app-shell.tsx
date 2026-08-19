'use client';

import { useCallback, useMemo, useState } from 'react';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { TimerAnnouncer } from '@/components/timer/timer-announcer';
import { useKeyboardShortcuts, type ShortcutHandlers } from '@/hooks/use-keyboard-shortcuts';
import { useTimerEffects } from '@/hooks/use-timer-effects';
import { getAudioEngine } from '@/lib/audio/audio-engine';
import { useTimerStore } from '@/store/timer-store';
import { ShortcutsDialog } from './shortcuts-dialog';
import { TopBar } from './top-bar';

/**
 * Owns everything that must exist exactly once: the effect bridge, the live
 * region, the global shortcut layer, and the dialogs those shortcuts open.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const dispatch = useTimerStore((state) => state.dispatch);

  useTimerEffects();

  const handlers = useMemo<ShortcutHandlers>(
    () => ({
      toggle: () => {
        // Every path that starts the timer also unlocks audio. Browsers only
        // allow an AudioContext to start from a user gesture, so this is the
        // moment the chime becomes possible at all.
        void getAudioEngine().unlock();
        dispatch({ type: useTimerStore.getState().status === 'running' ? 'PAUSE' : 'START' });
      },
      reset: () => dispatch({ type: 'RESET' }),
      skip: () => dispatch({ type: 'SKIP' }),
      focusMode: () => dispatch({ type: 'SET_MODE', mode: 'focus' }),
      shortBreakMode: () => dispatch({ type: 'SET_MODE', mode: 'shortBreak' }),
      longBreakMode: () => dispatch({ type: 'SET_MODE', mode: 'longBreak' }),
      newTask: () => {
        const input = document.querySelector<HTMLInputElement>('input[placeholder^="What are you"]');
        input?.focus();
      },
      settings: () => setSettingsOpen(true),
      help: () => setShortcutsOpen(true),
    }),
    [dispatch],
  );

  useKeyboardShortcuts(handlers);

  const onPointerDown = useCallback(() => {
    void getAudioEngine().unlock();
  }, []);

  return (
    <div className="flex min-h-dvh flex-col" onPointerDown={onPointerDown}>
      <TimerAnnouncer />
      <TopBar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      {children}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
