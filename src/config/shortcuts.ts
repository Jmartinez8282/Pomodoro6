export interface ShortcutDefinition {
  /** `event.key`, compared case-insensitively. */
  key: string;
  label: string;
  description: string;
}

/**
 * Single-key accelerators.
 *
 * WCAG 2.2 SC 2.1.4 (Character Key Shortcuts) applies: single-character
 * shortcuts collide with screen-reader browse-mode quick-nav keys. Compliance
 * here comes from two properties, both implemented in `use-keyboard-shortcuts`:
 * they can be turned off entirely in settings, and they never fire while focus
 * is in a text field. Every one of them also has a visible control equivalent —
 * they are accelerators, never the only path.
 */
export const SHORTCUTS = {
  toggle: { key: ' ', label: 'Space', description: 'Start or pause the timer' },
  reset: { key: 'r', label: 'R', description: 'Reset the current session' },
  skip: { key: 's', label: 'S', description: 'Skip to the next session' },
  focusMode: { key: '1', label: '1', description: 'Switch to Focus' },
  shortBreakMode: { key: '2', label: '2', description: 'Switch to Short Break' },
  longBreakMode: { key: '3', label: '3', description: 'Switch to Long Break' },
  newTask: { key: 'n', label: 'N', description: 'Add a new task' },
  settings: { key: ',', label: ',', description: 'Open settings' },
  help: { key: '?', label: '?', description: 'Show keyboard shortcuts' },
} as const satisfies Record<string, ShortcutDefinition>;

export type ShortcutName = keyof typeof SHORTCUTS;
