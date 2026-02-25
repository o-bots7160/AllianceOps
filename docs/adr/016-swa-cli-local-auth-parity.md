# ADR 016: SWA CLI for Local Auth Parity

## Status

Accepted

## Context

The local development environment bypasses authentication entirely via `DevAuthProvider`, which auto-authenticates all API requests as a hardcoded editor user. Production uses Azure Static Web Apps (SWA) with EasyAuth, which:

- Provides `/.auth/login/{provider}` endpoints for Google/GitHub OAuth
- Proxies `/api/*` requests to the linked Function App
- Injects `x-ms-client-principal-*` headers into proxied API requests
- Manages session cookies and logout

This mismatch makes it impossible to diagnose authentication issues locally. The web app talks directly to the Azure Functions dev server on port 7071, no `/.auth/` endpoints exist, and the `DevAuthProvider` returns a fake user for every request regardless of headers.

## Decision

Use the **Azure SWA CLI** (`@azure/static-web-apps-cli`) as an opt-in reverse proxy for local development via `pnpm dev:swa`. The SWA CLI is Microsoft's official tool for emulating the SWA runtime locally.

### Two Dev Modes

| Aspect | `pnpm dev` (fast) | `pnpm dev:swa` (auth) |
|--------|-------------------|----------------------|
| Web URL | http://localhost:3000 | http://localhost:4280 |
| API URL | http://localhost:7071/api | http://localhost:4280/api |
| Auth | DevAuthProvider (auto) | SWA CLI mock auth |
| `/.auth/` | Not available | Mock login/logout/me |
| Headers | None | `x-ms-client-principal-*` injected |
| Use case | Feature dev, UI work | Auth debugging, integration testing |

### Implementation

- `dev:swa` script uses `concurrently` to run Turborepo dev + SWA CLI proxy in parallel
- Environment variables control mode:
  - `NEXT_PUBLIC_API_URL=/api` — web app uses relative URLs (goes through SWA proxy)
  - `NEXT_PUBLIC_AUTH_MODE=swa` — web app enforces auth (no dev bypass)
  - `AUTH_MODE=swa` — API uses `SWAAuthProvider` instead of `DevAuthProvider`
- `SWAAuthProvider` hardened to also decode the `x-ms-client-principal` base64 blob header as a fallback (SWA CLI may use this format instead of individual headers)

## Alternatives Considered

### Next.js Rewrites + Custom /.auth/ Route Handlers

Use Next.js `rewrites` to proxy `/api/*` to the Functions server, and create Next.js route handlers for `/.auth/` endpoints that simulate SWA auth behavior.

**Rejected because:** Requires maintaining custom auth emulation code, is less faithful to production behavior, and the `/.auth/` route handlers only work in dev mode (static export in production has no API routes).

### Custom Express Proxy

A standalone Express server that sits in front of both the web app and API, implementing SWA-like auth behavior.

**Rejected because:** More code to maintain, another process to manage, and reimplements what SWA CLI already provides as a purpose-built tool.

## Consequences

### Positive

- Auth flows can be tested and debugged locally with the same architecture as production
- `/.auth/login/google` and `/.auth/login/github` URLs work locally (mock login form)
- API receives the same `x-ms-client-principal-*` headers as in production
- Existing fast dev mode (`pnpm dev`) preserved for routine development
- Uses official Microsoft tooling — maintained and updated alongside SWA

### Negative

- Additional devDependencies (`@azure/static-web-apps-cli`, `concurrently`)
- Developers must know to use `pnpm dev:swa` when debugging auth issues
- SWA CLI mock auth uses a form-based login, not real OAuth — cannot test the actual Google/GitHub OAuth flow
- Port 4280 added to devcontainer port forwarding
