# Deployment

Vercel, deployed from GitHub Actions. CI must pass before anything ships.

## One-time setup

### 1. Create the Vercel project

```bash
npm i -g vercel
vercel link
```

This writes `.vercel/project.json` containing `orgId` and `projectId`. The directory is gitignored — the ids are not secret, but they belong in repository secrets rather than in the tree.

### 2. Create an access token

Vercel dashboard → **Settings → Tokens** → create a token **scoped to this project**, not to your whole account. Copy it; it is shown once.

### 3. Add the repository secrets

GitHub → **Settings → Secrets and variables → Actions**:

| Secret | Where it comes from |
|---|---|
| `VERCEL_TOKEN` | The token from step 2 |
| `VERCEL_ORG_ID` | `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` |

### 4. Add the environment variables

These go in **Vercel** (Project → Settings → Environment Variables), not in GitHub secrets — they are build-time values, and a GA measurement ID is public by design.

| Variable | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Production only |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.vercel.app` | All |

> **Never** prefix a credential with `NEXT_PUBLIC_`. Anything with that prefix is inlined into the JavaScript bundle at build time and is readable by every visitor, including on preview deployments. CI fails the build if it finds one whose name looks like a secret.

Set the GA ID on production only, so preview deploys do not pollute your analytics with your own testing.

### 5. Turn off Vercel's Git integration

Already handled by `vercel.json`:

```json
{ "git": { "deploymentEnabled": { "main": false } } }
```

Without this, every push deploys twice — once from Vercel's own integration (which does not wait for tests) and once from Actions.

### 6. Protect `main`

GitHub → **Settings → Branches** → add a rule for `main` requiring the `verify` and `e2e` checks to pass before merge.

## What runs when

| Event | Workflow | Result |
|---|---|---|
| Pull request | `ci.yml` → `deploy.yml` | Typecheck, lint, unit, E2E + axe, then a preview URL commented on the PR |
| Push to `main` | `ci.yml` → `deploy.yml` | Same checks, then production |

## Google Analytics

1. Create a GA4 property at [analytics.google.com](https://analytics.google.com).
2. Admin → Data Streams → Web → add your domain. Copy the **Measurement ID** (`G-` prefix).
3. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel (production only).

The tag does not load until a visitor accepts the consent banner, and Consent Mode v2 defaults are queued as denied before it. An E2E test asserts that no request reaches Google before acceptance — if you change the consent flow, that test is what tells you whether it is still compliant.

Note that GA is measurement, not revenue. It tells you what people do; monetization would need something on top of it.

## Verifying a deploy

```bash
curl -sI https://your-domain.vercel.app | grep -i content-security-policy
```

Then in a fresh browser profile, with DevTools → Network open:

- No request to `googletagmanager.com` before clicking Accept
- One appears after
- Lighthouse: performance ≥ 95, accessibility 100

## Rollback

Vercel dashboard → Deployments → find the last good one → **Promote to Production**. Instant, and it does not require a revert commit.
