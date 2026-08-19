'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

const listeners = new Set<() => void>();
const notifyListeners = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): NotificationPermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

const getServerSnapshot = (): NotificationPermissionState => 'unsupported';

export interface UseNotificationsResult {
  permission: NotificationPermissionState;
  isSupported: boolean;
  canEnable: boolean;
  request: () => Promise<boolean>;
}

/**
 * Notification permission, requested on demand.
 *
 * Deliberately never prompted on page load. A permission dialog before the user
 * has done anything is the pattern browsers now actively penalise, it is
 * dismissed by most people reflexively, and a denial is effectively permanent —
 * the browser will not ask again. Tying the prompt to the user switching the
 * setting on means it arrives when the intent is unambiguous.
 */
export function useNotifications(): UseNotificationsResult {
  const permission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const request = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    // Asking again after a denial is a no-op in every browser; returning early
    // keeps callers from treating it as a transient failure.
    if (Notification.permission === 'denied') return false;

    try {
      const result = await Notification.requestPermission();
      notifyListeners();
      return result === 'granted';
    } catch {
      return false;
    }
  }, []);

  return {
    permission,
    isSupported: permission !== 'unsupported',
    canEnable: permission === 'default' || permission === 'granted',
    request,
  };
}
