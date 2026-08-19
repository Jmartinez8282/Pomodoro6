'use client';

import { useEffect } from 'react';
import { getAudioEngine } from '@/lib/audio/audio-engine';
import { toast } from '@/components/ui';
import { formatDuration } from '@/lib/utils/time';
import { useSettingsStore } from '@/store/settings-store';
import { registerEffectHandlers } from '@/store/timer-store';
import { useTimerStore } from '@/store/timer-store';

/**
 * Connects the engine's effects to the browser.
 *
 * The engine emits effects as plain data and knows nothing about audio,
 * notifications, or toasts. This hook is the only place those live, which is
 * what keeps the engine testable without a DOM.
 */
export function useTimerEffects(): void {
  const settings = useSettingsStore((state) => state.settings);
  const status = useTimerStore((state) => state.status);
  const mode = useTimerStore((state) => state.mode);

  useEffect(() => {
    const audio = getAudioEngine();

    const unregister = registerEffectHandlers({
      playAlarm: () => {
        const { alarmSound, alarmVolume } = useSettingsStore.getState().settings;
        audio.playAlarm(alarmSound, alarmVolume);
      },

      scheduleAlarm: (atEpochMs) => {
        const { alarmSound, alarmVolume } = useSettingsStore.getState().settings;
        audio.scheduleAlarm(atEpochMs, alarmSound, alarmVolume);
      },

      cancelAlarm: () => audio.cancelAlarm(),

      notify: (title, body) => {
        const { notificationsEnabled } = useSettingsStore.getState().settings;
        if (!notificationsEnabled) return;
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        // Only fire when the tab is hidden. A system notification for a window
        // the user is already looking at is pure noise.
        if (document.visibilityState === 'visible') return;
        try {
          new Notification(title, { body, tag: 'gitishdone-timer', icon: '/icon.svg' });
        } catch {
          /* some browsers require a service worker registration; ignore */
        }
      },

      onAwayCompletion: (completedAt) => {
        const time = new Date(completedAt).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        });
        toast.info('Timer finished while you were away', {
          id: 'away-completion',
          description: `The session ended at ${time}. It was recorded, but the next one has not been started.`,
          duration: 10_000,
        });
      },
    });

    return unregister;
  }, []);

  // Ambient sound follows the session, not the page. Stopping it during breaks
  // is the default because most people want the quiet to signal the change.
  useEffect(() => {
    const audio = getAudioEngine();
    const { ambientSound, ambientVolume, ambientOnlyDuringFocus } = settings;

    const shouldPlay =
      ambientSound !== 'none' &&
      status === 'running' &&
      (!ambientOnlyDuringFocus || mode === 'focus');

    if (shouldPlay) audio.setAmbient(ambientSound, ambientVolume);
    else audio.stopAmbient();
  }, [settings, status, mode]);

  // Browsers suspend audio contexts on backgrounded tabs. Resuming on return
  // means the next chime is not silently dropped.
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === 'visible') void getAudioEngine().unlock();
    };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, []);

  // Keep the tab title useful when the app is in a background tab — the most
  // common way this app is actually used.
  useEffect(() => {
    if (!settings.showSecondsInTitle) return;

    const base = 'GitIshDone';
    let frame: ReturnType<typeof setInterval> | null = null;

    const update = () => {
      const state = useTimerStore.getState();
      if (state.status !== 'running' || state.endsAt === null) {
        document.title = base;
        return;
      }
      const remaining = Math.max(0, state.endsAt - Date.now());
      const label = state.mode === 'focus' ? 'Focus' : 'Break';
      document.title = `${formatDuration(remaining)} · ${label}`;
    };

    update();
    frame = setInterval(update, 1000);

    return () => {
      if (frame) clearInterval(frame);
      document.title = base;
    };
  }, [settings.showSecondsInTitle, status]);
}
