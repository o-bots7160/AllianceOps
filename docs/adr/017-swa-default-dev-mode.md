# ADR 017: SWA CLI as Default Dev Mode

**Status:** Accepted — Supersedes ADR 016

## Context

ADR 016 introduced a dual dev-mode setup: `pnpm dev` (fast, `DevAuthProvider`, no auth) and `pnpm dev:swa` (SWA CLI proxy on port 4280 with mock `/.auth/` endpoints). This created several problems:

1. **Auth bypass masked real bugs** — `DevAuthProvider` always returned a hardcoded user, so auth-related issues (missing headers, unauthenticated redirects, sign-out flows) were invisible during normal development.
2. **Inconsistent provider redirects** — `auth-guard.tsx` redirected to `/.auth/login/google`, `app-header.tsx` linked to `/.auth/login/aad`, and `page.tsx` offered Google + GitHub. Developers testing in non-SWA mode never noticed.
3. **Two code paths** — Every auth-sensitive component had `if (IS_DEV && !IS_SWA_AUTH)` branches that diverged from production behavior, increasing maintenance burden and reducing confidence in the dev experience.
4. **Confusion** — Contributors had to know when to use `pnpm dev:swa` vs `pnpm dev`, and most defaulted to the simpler (but less faithful) mode.

## Decision

Make SWA CLI the **only** dev mode:

- **`pnpm dev`** now starts SWA CLI on port 4280, proxying Next.js (3000) and Azure Functions (7071). This is the same command that was previously `pnpm dev:swa`.
- **`pnpm dev:swa`** is removed.
- **`DevAuthProvider`** is deleted entirely — `SWAAuthProvider` is the default provider in both dev and production.
- **`IS_SWA_AUTH`** flag and all `if (IS_DEV && !IS_SWA_AUTH)` bypass branches are removed from the web app.
- **Auth-guard** redirects to `/` (landing page with provider picker) instead of directly to a single provider.
- **Landing page** presents branded sign-in buttons for Google, Microsoft, and GitHub.
- **Sign-out** uses `/.auth/logout?post_logout_redirect_uri=/` to ensure session invalidation.

## Alternatives Considered

1. **Keep `pnpm dev:fast` as an escape hatch** — Rejected. Maintaining two modes perpetuates the inconsistency problem. The SWA CLI adds ~2s to startup, which is an acceptable trade-off for auth parity.
2. **Remove `DevAuthProvider` but keep it for tests** — Rejected. No existing tests use `DevAuthProvider`. Tests that need a fake user can mock the `AuthProvider` interface directly.

## Consequences

### Positive

- Single dev mode eliminates confusion and ensures all development happens with production-like auth
- Auth bugs (missing headers, redirect loops, provider mismatches) are caught during development
- Fewer code paths and no bypass branches — simpler, more maintainable components
- Sign-in flow is consistent across landing page, auth guard, and app header

### Negative

- Dev startup is slightly slower due to SWA CLI proxy initialization
- Developers must sign in via the mock auth form during local development (minor friction)
- Port 4280 is the access point, not 3000 — developers must use the correct URL

### Migration

- `pnpm dev:swa` users: no change needed, `pnpm dev` now does the same thing
- `pnpm dev` (old) users: access the app at `http://localhost:4280` instead of `http://localhost:3000`; sign in via the mock auth form on first visit
