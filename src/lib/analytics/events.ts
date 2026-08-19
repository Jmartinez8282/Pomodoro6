import type { Settings, TimerMode } from '@/types';

/**
 * The complete analytics surface, as a closed union.
 *
 * Typing events rather than passing free-form strings keeps names from drifting
 * ("task_created" vs "taskCreated" vs "create_task") once several call sites
 * exist — a mess that is invisible until the GA reports are already fragmented.
 */
export type AnalyticsEvent =
  | {
      name: 'session_complete';
      params: { mode: TimerMode; duration_min: number; had_task: boolean };
    }
  | { name: 'session_skipped'; params: { mode: TimerMode } }
  | { name: 'task_created' }
  | { name: 'task_completed'; params: { pomodoros: number } }
  | { name: 'settings_changed'; params: { setting: keyof Settings } }
  | { name: 'data_exported' }
  | { name: 'data_imported' }
  | { name: 'consent_decision'; params: { granted: boolean } };

let consentGranted = false;

export function setAnalyticsConsent(granted: boolean): void {
  consentGranted = granted;
}

/**
 * Send an event. A no-op until consent is granted.
 *
 * Never include user-authored text — task titles, notes, anything typed. Only
 * counts and enumerations leave the device. The event union enforces this by
 * construction: there is no param anywhere that accepts an arbitrary string.
 */
export function track(event: AnalyticsEvent): void {
  if (!consentGranted) return;
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', event.name, 'params' in event ? event.params : {});
}
