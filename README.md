# GitIshDone

A pomodoro timer and task system that stays honest about where your time goes.

**[Live demo](https://gitishdone.vercel.app)** · Next.js 16 · React 19 · TypeScript · Tailwind 4

---

## What it does

- **Focus timer** with short and long breaks, configurable durations, and auto-start
- **Task list** with pomodoro estimates, an active-task binding, and keyboard reordering
- **Stats** — daily and weekly focus time, streaks, and a 26-week activity heatmap
- **Themes** — light, dark, and system, across five accent palettes
- **Sound** — completion chimes and ambient loops, fully synthesized (no audio files)
- **Keyboard-first** — every action has a shortcut; nothing needs a mouse
- Works offline; your data never leaves your browser

---

## The interesting problem: a timer that does not drift

Most web pomodoro timers are wrong, and they are wrong in the same way:

```js
setInterval(() => { secondsLeft-- }, 1000)
```

That loses time whenever the browser throttles the callback — which it always does. Background tabs clamp `setInterval` to one second or worse, Chrome's intensive throttling freezes timers entirely after a few minutes hidden, and closing a laptop lid stops them dead. A 25-minute session backgrounded for 25 minutes can finish minutes late.

The fix is to stop counting and start comparing. **A deadline timestamp is the only source of truth**; ticks exist purely to notice that it passed:

```ts
start()  →  endsAt = Date.now() + remainingMs
tick()   →  if (Date.now() >= endsAt) complete()
```

Three clocks, each with one job and none of them defining truth:

| Clock | Job | Why |
|---|---|---|
| `endsAt` (wall clock) | Decides when the session is over | Arithmetic, so throttling cannot affect it |
| Web Worker, 1Hz | Notices the deadline in a hidden tab | Worker timers escape most main-thread throttling |
| `requestAnimationFrame` | Smooths the visible countdown | Display only; never consulted for correctness |

Plus a resync on `visibilitychange`, `focus`, and `pageshow` — the last of which covers back/forward-cache restores, where nothing else fires.

### The cases that make it hard

**The laptop slept for an hour.** On wake, the wall clock says 60 minutes elapsed on a 25-minute session. The engine records exactly **one** session, credits it to the real deadline rather than to wake time, clamps `actualMs` to the session length so sleep cannot inflate your focus stats — and then stops. It does not chime an hour late, and it does not auto-start a focus session for someone who is not at their desk.

**Someone changed the clock.** `Date.now()` can be moved by the user or by an NTP correction; `performance.now()` cannot, but on macOS it does *not* advance across sleep. Neither is trustworthy alone, so the engine anchors both at start and compares their deltas. A backwards jump re-anchors the deadline instead of stalling forever.

**Settings changed mid-session.** A running timer is left strictly alone; the new duration applies to the next session. This was the original app's headline bug — its countdown effect was keyed on a context object rebuilt every render, so the timer reset itself whenever anything unrelated changed.

All of this lives in [`src/lib/timer/engine.ts`](src/lib/timer/engine.ts) as a pure reducer:

```ts
reduce(state, event, { now, mono, settings, activeTaskId })
  → { state, effects[] }
```

No React, no DOM, no globals. `now` arrives as a parameter, so "the machine slept for an hour" is a test that passes a timestamp an hour later — no fake timers, no jsdom, no flake. Side effects come back as *data*, which is why a test can assert "exactly one session was recorded with `actualMs` clamped" without mocking an audio API.

---

## Architecture

```
src/
├── app/              Routes, layout, metadata. Thin — each page renders one panel.
├── components/
│   ├── ui/           Design system. Generic, app-agnostic primitives.
│   ├── timer/  tasks/  stats/  settings/  layout/  analytics/
├── hooks/            React bindings: the ticker, shortcuts, effect wiring
├── lib/
│   ├── timer/        The pure engine
│   ├── storage/      StorageAdapter + Zod validation
│   ├── stats/        Aggregation (pure)
│   ├── audio/        Web Audio synthesis
│   └── analytics/    Consent Mode + typed event catalog
├── store/            Zustand slices: timer, tasks, settings, sessions
└── types/
```

### The boundary that matters

`components/ui/**` may not import from `store/`, feature folders, or app services. It is enforced by an ESLint `no-restricted-imports` rule, not by convention:

```js
{
  files: ['src/components/ui/**/*.tsx'],
  rules: { 'no-restricted-imports': ['error', { patterns: [
    { group: ['@/store/*'], message: 'UI primitives must not read application state.' },
  ]}]}
}
```

Primitives take props and emit callbacks; feature components own the store wiring. That is what keeps "reusable component library" a fact rather than an aspiration — and what would let the folder be lifted into its own package unchanged.

### State

Zustand, sliced by domain. Selector-level subscriptions mean a timer tick re-renders the countdown and nothing else — with Context, every consumer would re-render once a second.

Every slice is created with `skipHydration: true`. The server and the first client render both use defaults, so their HTML is identical by construction and a hydration mismatch is impossible rather than merely unobserved. Persisted values arrive on the second paint, which is why the skeletons in this app are structural rather than decorative.

### Data model

The session ledger is append-only, and **every statistic is derived from it** — nothing is stored pre-aggregated. The charts cannot disagree with the log, and there are no counters to drift out of sync.

```ts
interface SessionRecord {
  mode: TimerMode;
  plannedMs: number;
  actualMs: number;    // clamped to plannedMs — sleep cannot inflate it
  completed: boolean;  // false if skipped or reset early
  wasAway?: boolean;   // deadline passed while hidden or suspended
  dayKey: string;      // local calendar day, denormalised at write time
}
```

`dayKey` is denormalised deliberately: grouping by day stays O(n), and a later timezone change cannot silently reshuffle history that was already recorded.

### Persistence, and the road to accounts

```ts
interface StorageAdapter {
  getItem(key: StorageKey): Promise<string | null>;
  setItem(key: StorageKey, value: string): Promise<void>;
  // ...
}
```

Every method is async even though `localStorage` is synchronous. That is the point: a future Postgres-backed adapter has to be async, and if the interface were synchronous today, adding accounts would mean touching every call site. Paying the `await` now makes that migration a new file rather than a refactor.

Three more decisions point the same way: IDs are client-generated UUIDs (so server sync is a merge, not a re-key), every record carries `createdAt`/`updatedAt` (so last-write-wins has something to compare), and the app stays fully usable signed out (so auth becomes an enhancement, never a gate).

Everything read back from storage is re-validated with Zod. `localStorage` is user-writable and the JSON import is the least-trusted input the app takes; both go through the same parsers, and a single corrupt record is dropped rather than taking down the page.

---

## Accessibility

Targeting WCAG 2.2 AA, verified by axe-core on every route in both themes in CI.

The decisions worth explaining:

- **The countdown is `aria-hidden`.** A live-updating timer in a live region is announced every second and makes the app unusable. Screen reader users get milestone-only announcements — started, paused, completed — through one `polite` region, plus an on-demand exact reading. Nothing is ever `assertive`; a finished pomodoro is not an emergency.
- **The mode switcher is not tabs.** `role="tablist"` promises a matching `tabpanel`, and without one the `aria-controls` reference is invalid — a critical axe failure. It is not a `radiogroup` either: in that pattern arrow keys change selection, so exploring the control would abandon a running session. It is a group of toggle buttons requiring explicit activation.
- **Reordering is buttons, not drag.** Drag-and-drop is unreachable by keyboard and by most assistive tech (SC 2.5.7), so the button path is the primary one rather than a fallback.
- **Shortcuts can be turned off** and never fire inside a text field or while a dialog is open (SC 2.1.4). Every one has a visible control equivalent.
- **Row controls only hide on hover-capable devices.** A touch device has no hover state, so a hover-gated control there is simply invisible.

---

## Security

- **CSP** and a full header set (`HSTS`, `nosniff`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`, `COOP`) in `next.config.ts`. `upgrade-insecure-requests` and HSTS are emitted only on HTTPS origins — on plain-HTTP localhost, WebKit honours the upgrade strictly and breaks every asset.
- **XSS**: task text is the surface. React escapes by default and `react/no-danger` is an error, so raw HTML cannot be reintroduced. Input is length-capped and validated at the store boundary, not only in the form.
- **No secrets in `NEXT_PUBLIC_`** — it is inlined into the client bundle at build time and is world-readable. CI greps for any such variable whose name looks like a credential and fails the build.

---

## Development

```bash
npm install
npm run dev

npm run typecheck     # tsc --noEmit, strict, every flag on
npm run lint
npm run test          # Vitest — engine and stats
npm run test:e2e      # Playwright — Chromium + mobile WebKit, incl. axe
npm run build
```

Requires Node 22.11+.

### Testing

| Layer | Covers |
|---|---|
| Vitest | The engine (sleep, clock skew, long-break cadence, honest session accounting) and stats aggregation (streaks across DST, empty ledger, quantile bucketing) |
| Playwright | Full user flows using `page.clock` to fast-forward a 25-minute pomodoro in milliseconds against real browser timers |
| axe-core | Every route, both themes, in CI |

Four bugs were caught by these tests rather than by review: an unstable Zustand selector that looped renders forever, invalid `aria-controls` from misusing the tabs pattern, a 3.3:1 contrast token applied to 12px text, and `upgrade-insecure-requests` breaking every asset in WebKit.

Coverage thresholds are enforced on `lib/` and `store/` only. Chasing a global percentage would mean writing assertions about presentational markup, which passes CI without catching anything.

---

## Deployment

Vercel via GitHub Actions. See [DEPLOYMENT.md](DEPLOYMENT.md).

Deploys run from Actions rather than Vercel's Git integration for one reason: the native integration deploys on push regardless of whether the tests passed. Here, deployment is gated on CI.

---

## Roadmap

The beta is deliberately client-only. Next:

- Accounts and cross-device sync — the `StorageAdapter` seam exists for this
- Auth.js with database sessions, `httpOnly` cookies, per-request authorization in route handlers
- Task notes, tags, and search
- Weekly email summaries

## License

MIT
