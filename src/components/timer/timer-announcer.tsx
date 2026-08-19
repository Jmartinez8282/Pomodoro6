'use client';

import { useEffect, useRef, useState } from 'react';
import { registerEffectHandlers } from '@/store/timer-store';

/**
 * The timer's only live region.
 *
 * A countdown must never be announced continuously — a screen reader reading
 * "24:31, 24:30, 24:29" makes the whole app unusable, which is why the digits
 * themselves are `aria-hidden`. This region receives only milestone messages
 * from the engine: started, paused, resumed, skipped, reset, completed.
 *
 * `polite`, never `assertive`: a finished pomodoro is not an emergency, and an
 * assertive announcement would cut across whatever the user is reading.
 */
export function TimerAnnouncer() {
  const [message, setMessage] = useState('');
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unregister = registerEffectHandlers({
      announce: (next) => {
        // Re-setting identical text would not be re-announced by most screen
        // readers. Clearing first guarantees each milestone is spoken, even
        // when two consecutive messages happen to match.
        setMessage('');
        requestAnimationFrame(() => setMessage(next));

        if (clearTimer.current) clearTimeout(clearTimer.current);
        clearTimer.current = setTimeout(() => setMessage(''), 5000);
      },
    });

    return () => {
      unregister();
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
