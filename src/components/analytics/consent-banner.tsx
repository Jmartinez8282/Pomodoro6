'use client';

import { useCallback, useEffect, useState } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Button } from '@/components/ui';
import {
  type ConsentDecision,
  readConsent,
  setDefaultConsent,
  updateConsent,
  writeConsent,
} from '@/lib/analytics/consent';
import { setAnalyticsConsent, track } from '@/lib/analytics/events';
import { cn } from '@/lib/utils/cn';

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Consent gate for Google Analytics.
 *
 * The GA tag is not rendered at all until the user accepts. Consent Mode's
 * default-denied signal is queued first regardless, so if the tag ever does
 * load it starts in a non-tracking state — belt and braces, because the
 * compliance question ("did anything leave the device before consent?") should
 * have the same answer no matter which layer you inspect.
 */
export function ConsentBanner() {
  const [decision, setDecision] = useState<ConsentDecision | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setDefaultConsent();

    void readConsent().then((stored) => {
      if (stored) {
        setDecision(stored.analytics);
        setAnalyticsConsent(stored.analytics === 'granted');
        // Replay the stored choice on every load; Consent Mode state does not
        // persist across page loads on its own.
        updateConsent(stored.analytics);
      }
      setResolved(true);
    });
  }, []);

  const decide = useCallback((next: ConsentDecision) => {
    setDecision(next);
    setAnalyticsConsent(next === 'granted');
    void writeConsent(next).then(() => {
      track({ name: 'consent_decision', params: { granted: next === 'granted' } });
    });
  }, []);

  // Nothing renders until storage has been read, so the banner never flashes
  // for someone who decided months ago.
  if (!resolved) return null;

  return (
    <>
      {decision === 'granted' && MEASUREMENT_ID ? <GoogleAnalytics gaId={MEASUREMENT_ID} /> : null}

      {decision === null ? (
        <>
          {/* Reserves space below the content while the banner is up. Without
              it the fixed banner sits over the bottom of the page on a phone,
              making whatever is underneath — usually the last task — both
              unreadable and untappable. */}
          <div aria-hidden className="h-44 sm:h-0" />
          <div
            role="region"
            aria-label="Cookie consent"
            className={cn(
              'fixed z-70 rounded-2xl border border-border bg-surface p-4 shadow-overlay',
              'inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-sm',
              'animate-slide-up motion-reduce:animate-none',
            )}
          >
            <p className="text-sm font-medium text-foreground">Analytics</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&rsquo;d like to use Google Analytics to understand how GitIshDone is used. Your
              tasks and session history never leave your device either way.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => decide('granted')}>
                Accept
              </Button>
              <Button size="sm" variant="ghost" onClick={() => decide('denied')}>
                Decline
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
