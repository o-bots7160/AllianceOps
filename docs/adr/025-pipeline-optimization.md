# ADR-025: Pipeline Optimization — Caching, Conditional Infra, and Parallel Deploy

**Status:** Accepted

## Context

Deploy pipelines consistently took 7–15 minutes, with the primary bottlenecks being:

1. **Bicep infrastructure deployment (~1–5 min)** ran on every deploy, even when no `infra/` files changed. ARM evaluates all resources regardless, making this the single largest time sink.
2. **No build caching** — Turborepo local cache wasn't persisted across CI runs, and Next.js incremental build cache (`.next/cache`) was excluded from outputs. Every run rebuilt from scratch.
3. **Cold npm install for Function App packaging (~30–60s)** — The deploy job ran `npm install --omit=dev` and `npx --yes prisma@^6 generate` fresh every time.
4. **Apex domain registration (prod only, up to 5 min)** — A one-time DNS validation task ran on every prod deploy, with a polling loop of up to 30 × 10s.
5. **Sequential app deployments (~60–90s)** — Function App zip deploy and SWA deploy ran sequentially despite being independent operations.
6. **Two-job overhead (~60s)** — The deploy job provisioned a new runner, re-checked out the repo, and re-downloaded artifacts.

## Decision

### 1. Turborepo cache via GitHub Actions

Add `actions/cache@v4` for the `.turbo/` directory in both the deploy `build` job and the CI `check` job. The cache key is `turbo-{os}-{sha}` with a fallback restore key of `turbo-{os}-`, enabling incremental cache hits when only some packages change.

### 2. Next.js incremental build cache

Add `actions/cache@v4` for `apps/web/.next/cache` in the deploy `build` job. The key includes a hash of all `.ts`/`.tsx` source files. This allows Next.js's SWC/webpack caching to persist, reducing static export time from ~60–90s to ~15–30s on subsequent runs.

### 3. Prisma engine caching

Add `actions/cache@v4` for `node_modules/.prisma` and `node_modules/@prisma/engines` in both CI and deploy workflows. Keyed on the schema file and lockfile hash, this avoids re-downloading the Prisma query engine binary (~40MB) on every run.

### 4. Conditional Bicep infrastructure deploy

Use `git diff --name-only HEAD~1 -- infra/` early in the deploy job to detect infrastructure changes. Wrap the "Ensure Resource Group", "Deploy Infrastructure", "Ensure DNS Resource Group", and "Deploy DNS Records" steps with `if: steps.infra-check.outputs.changed == 'true'`. On code-only deploys, this saves 1–5 minutes.

The checkout step uses `fetch-depth: 2` to ensure the parent commit is available for comparison.

### 5. Extract apex domain to on-demand workflow

Move the "Register Apex Domain" and "Set www as Default Domain" steps from `deploy.yml` into a new `register-apex.yml` workflow triggered by `workflow_dispatch` only. Remove the `register_apex` input from the reusable deploy workflow and the callers.

This is a one-time setup operation. Once the apex domain is validated with Azure SWA, it remains valid indefinitely unless DNS configuration changes.

### 6. Cache Function App npm dependencies

Add `actions/cache@v4` for `/tmp/api-deploy/node_modules` keyed on `apps/api/package.json`. The `npm install --omit=dev` step is conditionally skipped on cache hits. This saves ~30–60s on most deploys where API dependencies haven't changed.

### 7. Parallel Function App + SWA deployment

Replace the sequential "Deploy Function App" → "Get SWA Token" → "Deploy SWA" steps with a single step that runs both deployments as background processes (`&`) and `wait`s for both. This saves 30–60s by overlapping the two independent operations.

Uses `@azure/static-web-apps-cli` via `npx` for the SWA deploy instead of the `Azure/static-web-apps-deploy` action, since shell backgrounding requires both operations to be CLI commands.

### 8. Sparse checkout in deploy job

The deploy job uses sparse checkout to fetch only `infra/`, `apps/api/prisma/`, `apps/api/host.json`, and `apps/api/package.json` — the files actually needed for infrastructure deployment, database migrations, and Function App packaging. Build artifacts come from the build job via `actions/download-artifact`.

## Alternatives Considered

1. **Merge build + deploy into a single job**: Would eliminate ~60s of runner cold start and artifact transfer. Rejected — the two-job architecture preserves build artifact availability for debugging and potential re-deploy without rebuilding.
2. **Vercel remote cache for Turborepo**: Fastest option with content-addressable caching. Rejected — adds an external account dependency (Vercel). The GitHub Actions cache approach is self-contained.
3. **Split deploy into 3+ parallel jobs**: Infrastructure, API deploy, and SWA deploy as separate jobs. Rejected — each job incurs ~20s of runner cold start, and the Azure login would need to happen in each job. Shell backgrounding achieves similar parallelism without the overhead.
4. **Self-hosted runners**: Would eliminate cold start entirely. Rejected — adds infrastructure maintenance burden for a small team.
5. **Keep apex domain in deploy workflow with early-exit**: The existing check for "Ready" status makes repeat runs fast (~15–30s). Rejected — even the fast path adds unnecessary CLI calls and complexity to every prod deploy for a task that only runs once.

## Consequences

- **Faster deploys**: Expected reduction from ~10 min to ~4–6 min (dev) and ~15 min to ~5–7 min (prod) for code-only changes.
- **Cache management**: Five new cache entries per workflow run (Turbo, Next.js, Prisma, Function App deps). GitHub Actions provides 10GB of cache storage per repo with automatic eviction of least-recently-used entries.
- **Conditional infra risk**: If `git diff HEAD~1` misses an infra change (e.g., squash merge that combines multiple commits), the Bicep deploy will be skipped. The infra can always be deployed by pushing a commit that touches any file in `infra/`. A manual workflow dispatch could be added as a safety valve in the future.
- **Apex domain is manual**: After initial setup, the `register-apex.yml` workflow must be run manually from the GitHub Actions UI if DNS configuration changes. This is intentional — it's a rare operation.
- **SWA deploy uses CLI instead of action**: The `Azure/static-web-apps-deploy@v1` action is replaced with `@azure/static-web-apps-cli` via `npx` to enable shell backgrounding. The CLI provides the same functionality but with slightly different output formatting.
