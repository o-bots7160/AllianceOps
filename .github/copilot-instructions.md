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
pnpm dev:swa      # Same as dev + SWA CLI proxy (4280) with auth
pnpm build        # Production build all packages
pnpm lint         # ESLint across all packages
pnpm typecheck    # tsc --noEmit across all packages
pnpm test         # Vitest across all packages
pnpm db:dev       # Create a new Prisma migration (local dev)
pnpm db:migrate   # Apply pending Prisma migrations (CI/deploy)
pnpm db:reset     # Reset DB + re-apply all migrations
pnpm db:generate  # Regenerate Prisma client
pnpm db:studio    # Open Prisma Studio
pnpm seed:sim     # Seed local DB with simulation data
```

### Dev Modes

- **`pnpm dev`** — Fast mode. Web on 3000, API on 7071, auth bypassed via `DevAuthProvider`. Use for general feature development and UI work.
- **`pnpm dev:swa`** — Auth mode. SWA CLI proxy on port 4280 fronts both web and API. Provides mock `/.auth/` endpoints and injects `x-ms-client-principal` headers into API requests. Access the app at `http://localhost:4280`. Use when debugging auth flows or testing the production-like auth experience.

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
- Keep route structure flat: `/event`, `/briefing`, `/path`, `/planner`, `/picklist`, `/simulation`, `/team`
- Navigation links use Next.js `<Link>` components (not `<a>` tags) via the `NavLinks` component — do not use plain `<a>` for internal navigation

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
- **Team-scoped endpoints** use the pattern `/api/teams/{teamId}/...` and require team membership
- Use the auth helpers from `src/lib/auth.ts`: `requireUser()`, `requireTeamMember()`, `requireTeamRole()`

### Auth & Team Access Control

- Auth middleware lives at `apps/api/src/lib/auth.ts`
- `resolveUser(request)`: Resolves auth user from headers, upserts User record in DB
- `requireUser(request)`: Returns `AuthUser` or a 401 response — use `isAuthError()` to check
- `requireTeamMember(request, teamId)`: Returns `{ user, role }` or 401/403
- `requireTeamRole(request, teamId, minRole)`: Requires COACH, MENTOR, or STUDENT (hierarchical)
- Auth provider is selected in `src/index.ts`: `DevAuthProvider` (dev) or `SWAAuthProvider` (production)
- Team roles: **COACH** (owner) > **MENTOR** (admin) > **STUDENT** (member)

### Environment Variables

- `TBA_API_KEY`: Required. Loaded from docker-compose env (via `.env`) or Key Vault in production
- `DATABASE_URL`: PostgreSQL connection string
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Optional. Enables telemetry when set
- `local.settings.json` is for Azure Functions runtime config (CORS, etc.) — secrets should be in `.env`

### Database (Prisma)

- Schema lives at `apps/api/prisma/schema.prisma`
- The Prisma client singleton is at `apps/api/src/lib/prisma.ts` — import from there, do not create new instances
- **PostgreSQL is the local dev standard** — all persistent data uses Prisma/Postgres, never in-memory stores
- **Migration-per-feature**: every feature or PR that changes the database schema must include a new migration
  - Create migrations locally: `pnpm db:dev --name <description>` (runs `prisma migrate dev`)
  - CI/deploy applies migrations: `pnpm db:migrate` (runs `prisma migrate deploy`)
  - Never edit or delete migration files after they've been committed
- The Dev Container's `postCreateCommand` runs `pnpm db:generate && pnpm db:migrate` — tables are ready on container creation
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

### Pipeline Reproducibility

- **Prefer pipeline-derived values over stored secrets** — any credential or token that can be fetched at deploy time (e.g., SWA deployment tokens via `az staticwebapp secrets list`, database URLs from Key Vault) should be fetched in the pipeline rather than stored as a GitHub secret
- **Only store secrets that cannot be derived** — OIDC credentials (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`), passwords (`POSTGRES_ADMIN_PASSWORD`), and API keys (`TBA_API_KEY`)
- **Goal: full reproducibility** — a complete redeployment to a new environment or subscription should work by setting only the minimal required secrets, with everything else provisioned or fetched by the pipeline itself

## Auth

- Pluggable `AuthProvider` interface in `packages/shared/src/auth/`
- `DevAuthProvider`: Always returns editor user (local development only)
- `SWAAuthProvider`: Reads Azure SWA EasyAuth headers (production)
- Roles: `viewer` (read-only) and `editor` (read-write) at the app level
- Google and GitHub SSO configured in `staticwebapp.config.json`

### User & Team Model

- **User**: Created automatically on first authenticated API call; ID comes from SSO (or `dev-user` in dev)
- **Team**: Represents an FRC team; unique by team number. Created by a user who becomes the Coach.
- **TeamMember**: Links users to teams with roles — COACH, MENTOR, or STUDENT
- **Multi-team**: Users can belong to multiple teams (e.g., mentors helping multiple FRC teams)
- **Invite codes**: Generated by Coach/Mentor; new users join as Student automatically
- **Join requests**: Users can request to join by team number; Coach/Mentor approves or rejects
- **Team-scoped data**: MatchPlan, Picklist, etc. have a `teamId` FK — endpoints require membership
- Web app auto-populates team number from active team membership; manual override available

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
  - 010: Statbotics API Integration via Enriched Endpoints
  - 011: Simulation Play-by-Play with React Context
  - 012: Game-Agnostic Duty Planner
  - 013: Global Event Setup Context
  - 014: Production-Ready Azure Infrastructure
  - 015: User & Team Management
  - 016: SWA CLI for Local Auth Parity

## Anti-Patterns to Avoid

- **No hardcoded season-specific logic in UI or core** — always use GameDefinition adapters
- **No `any` types** — use `unknown` with type narrowing
- **No in-memory storage for persistent data** — use Prisma/Postgres
- **No raw SQL** — use Prisma Client
- **No custom CSS when Tailwind classes suffice**
- **No default exports** (except Next.js pages)
- **No secrets in source code, parameter files, or CI logs**
- **No skipping migrations** — every schema change gets a migration
- **No skipping tests** — new logic must have test coverage
- **No `console.log` in production code** — use Application Insights telemetry in the API and remove debug logs before committing
