'use client';

import { useEffect } from 'react';
import { SHORTCUTS, type ShortcutName } from '@/config/shortcuts';
import { useSettingsStore } from '@/store/settings-store';

export type ShortcutHandlers = Partial<Record<ShortcutName, () => void>>;

/**
 * Returns true when a keystroke belongs to the user's typing, not to the app.
 *
 * Without this, typing "n" into the task field would add a task instead of a
 * letter — the single most common way keyboard shortcuts break a form.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true): void {
  const shortcutsEnabled = useSettingsStore((state) => state.settings.shortcutsEnabled);

  useEffect(() => {
    if (!enabled || !shortcutsEnabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // Modifiers belong to the browser and the OS. Claiming Cmd+R would break
      // reload; claiming Ctrl+key collides with screen-reader commands.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      // A dialog owns the keyboard while it is open.
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;

      const pressed = event.key.toLowerCase();

      for (const [name, definition] of Object.entries(SHORTCUTS)) {
        if (definition.key.toLowerCase() !== pressed) continue;
        const handler = handlers[name as ShortcutName];
        if (!handler) continue;
        // Space would otherwise scroll the page, and it is the primary control.
        event.preventDefault();
        handler();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, enabled, shortcutsEnabled]);
}
