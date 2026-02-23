# AllianceOps — Copilot Instructions

## Project Overview

AllianceOps is an FRC match-ops and alliance strategy dashboard for Team 7160 (Ludington O-Bots). It pulls live data from The Blue Alliance (TBA) and Statbotics APIs — no manual scouting required. The system is season-agnostic via GameDefinition adapters, deploys to Azure, and supports full local development via Dev Container.

## Architecture

- **Monorepo**: pnpm workspaces + Turborepo
- **`apps/web`**: Next.js (static export for production) + Tailwind CSS + TypeScript
- **`apps/api`**: Azure Functions v4 (Node.js, programming model v4, TypeScript)
- **`packages/shared`**: Shared types, API clients, GameDefinition adapters, strategy engines
- **`infra/`**: Azure Bicep IaC (main + modules + parameters)
- **`docs/`**: Architecture docs + ADRs

## Development Environment

### Dev Container (required workflow)

All development happens inside the Dev Container. Do not assume macOS/Windows host tools.

- Docker Compose provides: PostgreSQL 16, Azurite (Azure Storage emulator)
- The devcontainer runs as the `node` user (non-root); use `sudo` for global installs
- `pnpm dev` starts all three packages (web, api, shared) in watch mode via Turborepo
- Azure Functions Core Tools are installed globally via npm in the postCreateCommand
- Environment variables flow from `.env` (root, gitignored) → docker-compose → container
- The API also loads `.env` via dotenv as a fallback

### Key Commands

```bash
pnpm dev          # Start web (3000) + API (7071) + shared (watch)
pnpm build        # Production build all packages
pnpm lint         # ESLint across all packages
pnpm typecheck    # tsc --noEmit across all packages
pnpm test         # Vitest across all packages
pnpm db:migrate   # Apply pending Prisma migrations
pnpm db:reset     # Reset DB + re-apply all migrations
pnpm db:generate  # Regenerate Prisma client
pnpm db:studio    # Open Prisma Studio
pnpm seed:sim     # Seed local DB with simulation data
```

### Build Order

The shared package must build before api and web can typecheck. Turborepo handles this automatically via the pipeline defined in `turbo.json`. When editing shared types or adapters, the `tsup --watch` in dev mode handles incremental rebuilds.

## Coding Standards

### TypeScript

- **Strict mode is mandatory** (`"strict": true` in tsconfig.base.json)
- Target ES2022 with ESNext modules and bundler module resolution
- No `any` types — use `unknown` and narrow with type guards. The ESLint rule `@typescript-eslint/no-explicit-any` is set to `warn`; treat warnings as errors in new code
- Prefix unused parameters with `_` (enforced by ESLint)
- Use proper TypeScript interfaces and types for all API contracts, not inline object shapes
- Export types from `packages/shared` — do not duplicate type definitions across packages

### Formatting & Linting

- **Prettier**: semicolons, single quotes, trailing commas, 100 char width, 2-space indent
- **ESLint**: typescript-eslint recommended rules
- Format on save is configured in the Dev Container VS Code settings
- Run `pnpm lint` and `pnpm typecheck` before committing — CI will reject PRs that fail these

### Code Style

- Prefer named exports over default exports (except Next.js pages which require default)
- Use `const` by default; use `let` only when reassignment is necessary
- Avoid classes unless the pattern genuinely benefits from them (e.g., API clients with state)
- Comment only to explain "why", not "what" — the code should be self-documenting
- No commented-out code in commits

## Next.js (apps/web)

### Static Export

- Production builds use `output: 'export'` for Azure Static Web Apps (no SSR, no API routes)
- Dev mode (`next dev`) runs normally without static export
- This is controlled conditionally in `next.config.ts` — do not change this pattern
- All pages must work as static client-side-rendered pages with `'use client'`
- Data fetching happens client-side via the `useApi` hook, never via `getServerSideProps` or server components

### Component Patterns

- Use React hooks for state and side effects
- Shared state (year, event, team) is managed via `useEventSetup` with localStorage persistence
- API calls go through `useApi` which handles loading states, error handling, and cache metadata
- Use Tailwind CSS utility classes — do not write custom CSS unless absolutely necessary
- Support dark mode via Tailwind's `dark:` variants

### Routing

- App Router (not Pages Router)
- Keep route structure flat: `/event`, `/briefing`, `/path`, `/planner`, `/picklist`, `/simulation`
- Navigation is in the root layout (`app/layout.tsx`)

## Azure Functions (apps/api)

### Programming Model v4

- Use the v4 programming model (`@azure/functions` v4+) — not the legacy v3 model
- Register functions using `app.http()`, not `module.exports`
- All functions are imported via the single entry point `src/index.ts`
- When adding a new function, create the file in `src/functions/` and add an import to `src/index.ts`

### API Design

- All endpoints return the envelope format: `{ data, meta: { lastRefresh, stale, ttlClass } }`
- Use the `cached()` wrapper from `src/cache/index.ts` for all upstream API calls
- Cache TTL tiers: `STATIC` (1hr), `SEMI_STATIC` (5min), `LIVE` (60s)
- Return stale cached data on upstream failures — never throw unhandled errors to the client
- Route parameters use `{paramName}` syntax in the route string

### Environment Variables

- `TBA_API_KEY`: Required. Loaded from docker-compose env (via `.env`) or Key Vault in production
- `DATABASE_URL`: PostgreSQL connection string
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Optional. Enables telemetry when set
- `local.settings.json` is for Azure Functions runtime config (CORS, etc.) — secrets should be in `.env`

### Database (Prisma)

- Schema lives at `apps/api/prisma/schema.prisma`
- Always create migrations for schema changes: `cd apps/api && npx prisma migrate dev --name <description>`
- Never edit migration files after they've been committed
- Use Prisma Client for all database access — no raw SQL unless absolutely necessary
- Generate the client after schema changes: `pnpm db:generate`

## Shared Package (packages/shared)

### Exports

- Built with tsup, outputs ESM (`.mjs` + `.d.mts`)
- All public API is exported from `src/index.ts` (barrel file)
- Package.json exports must use `.mjs`/`.d.mts` extensions to match tsup output
- When adding new modules, update both `src/index.ts` and `package.json` exports

### GameDefinition Adapters

- **This is a critical architectural pattern** — do not bypass it
- Each FRC season gets its own adapter file: `src/adapters/{year}-{game-name}.ts`
- Adapters implement the `GameDefinition` interface and register via `registerAdapter()`
- Adapters map TBA `score_breakdown` fields into generic buckets: `auto_points`, `teleop_points`, `endgame_points`, `penalty_points`, `misc_points`
- Adapters define game-specific metrics, duty slot labels, and strategy templates
- **UI and core logic must never reference season-specific field names directly** — always go through the adapter
- The adapter registry (`getAdapter(year)`) selects the correct adapter at runtime

### API Clients

- `TBAClient`: Wraps TBA v3 API with typed responses and auth headers
- `StatboticsClient`: Wraps Statbotics v3 API with typed responses
- Both use the global `fetch` API (no axios/node-fetch) — keep it that way
- Private fetch methods are named `request()` (not `fetch()`) to avoid shadowing the global

### Strategy Engines

- `briefing.ts`: Deterministic rules-based match briefing (win conditions + risks)
- `path.ts`: Qual schedule difficulty analysis
- `picklist.ts`: Multi-signal team ranking with configurable weights
- These are pure functions with no side effects — keep them testable

## Infrastructure (Bicep)

### Module Structure

- `infra/main.bicep` orchestrates all modules
- Modules: `staticWebApp.bicep`, `functionApp.bicep`, `postgres.bicep`, `keyVault.bicep`, `appInsights.bicep`
- Parameters in `infra/parameters/{dev,prod}.parameters.json`
- Validate with `az bicep build --file infra/main.bicep` before committing

### Secrets Management

- All secrets in Azure Key Vault, referenced by Function App via `@Microsoft.KeyVault()` syntax
- Function App uses system-assigned managed identity for Key Vault access
- Never put secrets in Bicep parameter files, app settings, or CI env vars

## CI/CD (GitHub Actions)

### PR Checks (`ci.yml`)

- install → lint → typecheck → test → bicep build → bicep what-if (if OIDC configured)
- PRs that fail any check must not be merged

### Deployments

- **dev branch** → deploys to dev environment automatically
- **main branch** → deploys to prod with manual approval gate (`environment: production`)
- Both use Azure OIDC federated credentials (no stored secrets for Azure auth)
- Infrastructure deployment (Bicep) runs before app deployment

## Auth

- Pluggable `AuthProvider` interface in `packages/shared/src/auth/`
- `DevAuthProvider`: Always returns editor user (local development only)
- `SWAAuthProvider`: Reads Azure SWA EasyAuth headers (production)
- Roles: `viewer` (read-only) and `editor` (read-write)
- Google and GitHub SSO configured in `staticwebapp.config.json`

## Git Workflow

- `main` branch is protected — no direct pushes
- `dev` branch is the integration branch — push here for dev deployment
- Feature branches branch from `dev` and merge back via PR
- Commit messages should be descriptive with a summary line and body explaining why
- Always include the co-authored-by trailer for AI-assisted commits:
  ```
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```

## Testing

- Test framework: Vitest
- Tests live alongside source files or in `__tests__/` directories
- Strategy engines, adapters, and utility functions must have unit tests
- API functions should have integration tests that verify request/response contracts
- Run `pnpm test` before committing

## ADRs (Architecture Decision Records)

- Stored in `docs/adr/` with sequential numbering: `NNN-short-title.md`
- **Create an ADR for any of the following:**
  - Adding, replacing, or removing a dependency or framework
  - Changing data models, API contracts, or database schema design
  - Modifying the build, deploy, or CI/CD pipeline
  - Introducing a new architectural pattern or changing an existing one
  - Choosing between multiple viable approaches for a significant feature
  - Changing authentication, authorization, or security patterns
  - Adding or modifying infrastructure resources
- ADR format must include: **Status**, **Context**, **Decision**, **Alternatives Considered**, and **Consequences**
- ADRs are immutable once accepted — create a new ADR with status "Supersedes ADR-NNN" to replace an old one
- When making changes that warrant an ADR, create the ADR in the **same commit or PR** as the code change
- Review existing ADRs before proposing changes — if a decision contradicts an existing ADR, the new ADR must explicitly reference and supersede it
- Current ADRs:
  - 001: Monorepo + pnpm
  - 002: Static Next.js
  - 003: Game Definition Adapters
  - 004: Caching Strategy
  - 005: Pluggable Auth Abstraction
  - 006: Secrets Management via Key Vault
  - 007: Observability with Application Insights
  - 008: Dev Container as Primary Development Environment
  - 009: CI/CD with GitHub Actions and Azure OIDC

## Anti-Patterns to Avoid

- **No hardcoded season-specific logic in UI or core** — always use GameDefinition adapters
- **No `any` types** — use `unknown` with type narrowing
- **No in-memory storage for persistent data** — use Prisma/Postgres (the current plans endpoint uses an in-memory Map and needs to be migrated)
- **No raw SQL** — use Prisma Client
- **No custom CSS when Tailwind classes suffice**
- **No default exports** (except Next.js pages)
- **No secrets in source code, parameter files, or CI logs**
- **No skipping migrations** — every schema change gets a migration
- **No skipping tests** — new logic must have test coverage
- **No `console.log` in production code** — use Application Insights telemetry in the API and remove debug logs before committing
