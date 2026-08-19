import { getStorageAdapter } from '@/lib/storage';

export type ConsentDecision = 'granted' | 'denied';

export interface ConsentState {
  analytics: ConsentDecision;
  decidedAt: string;
}

/** Consent Mode v2 signal names. */
type ConsentSignal =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage'
  | 'functionality_storage'
  | 'personalization_storage'
  | 'security_storage';

type GtagConsentPayload = Partial<Record<ConsentSignal, ConsentDecision>>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]): void {
  if (typeof window === 'undefined') return;
  window.dataLayer ??= [];
  // Push directly rather than calling window.gtag: the default-denied signal
  // must be queued *before* the GA script loads, and at that point the gtag
  // function does not exist yet.
  window.dataLayer.push(args);
}

/**
 * The Consent Mode v2 default. Must run before the GA tag loads.
 *
 * Everything starts denied. Google's tag will still load once mounted, but with
 * storage denied it sends no cookies and no identifiers until consent is
 * granted — which is the behaviour GDPR and the ePrivacy Directive require, and
 * which the E2E suite asserts by watching for network calls.
 */
export function setDefaultConsent(): void {
  const denied: GtagConsentPayload = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    personalization_storage: 'denied',
  };
  gtag('consent', 'default', {
    ...denied,
    // Strictly necessary; not a tracking signal.
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });
}

export function updateConsent(decision: ConsentDecision): void {
  gtag('consent', 'update', {
    analytics_storage: decision,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  } satisfies GtagConsentPayload);
}

const CONSENT_KEY = 'consent' as const;

export async function readConsent(): Promise<ConsentState | null> {
  const raw = await getStorageAdapter().getItem(CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'analytics' in parsed &&
      (parsed.analytics === 'granted' || parsed.analytics === 'denied')
    ) {
      return parsed as ConsentState;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeConsent(decision: ConsentDecision): Promise<void> {
  const state: ConsentState = { analytics: decision, decidedAt: new Date().toISOString() };
  await getStorageAdapter().setItem(CONSENT_KEY, JSON.stringify(state));
  updateConsent(decision);
}
