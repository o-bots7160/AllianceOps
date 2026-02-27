# ADR-027: Ephemeral Test Environment

**Status:** Accepted
**Date:** 2026-02-27

## Context

AllianceOps needs reliable automated testing against a production-like environment after each dev deployment to catch regressions before they propagate to production. The existing unit tests (`pnpm test`) cover individual modules but do not validate:

- End-to-end API behavior with real infrastructure (Postgres, Key Vault, Flex Consumption)
- Data integrity between our API responses and upstream TBA/Statbotics sources
- Performance characteristics under load
- Auth flow correctness with forged `x-ms-client-principal` headers against a deployed Function App

Testing against the dev environment is problematic because it shares state with real usage, and any test data pollution would affect the team's actual workflow. A permanent test environment would incur ongoing cost (~$30-50/month) and risk infrastructure drift from the dev/prod environments.

## Decision

After every successful dev deployment, a `post-deploy-tests.yml` workflow spins up an ephemeral Azure environment (`rg-aops-test`) configured like production:

### Workflow Architecture

1. **Build extraction**: The `build` job is extracted from `deploy.yml` into a reusable `build.yml` template. Both `deploy-dev.yml` and `deploy-prod.yml` call `build.yml` → `deploy.yml` in sequence. This allows the test workflow to reuse the exact same build artifacts from the triggering dev deployment.

2. **Ephemeral infrastructure**: `rg-aops-test` is created with production-like Bicep parameters (Standard SWA, B2s Postgres, no custom domains). The entire resource group is deleted after tests complete, regardless of test outcome.

3. **Artifact reuse**: The test workflow downloads `api-build` and `web-build` artifacts directly from the triggering dev workflow run, ensuring test results reflect the exact code that was just deployed.

4. **Auth testing**: All 22+ API endpoints use `authLevel: 'anonymous'` in Azure Functions. Auth is enforced by the `SWAAuthProvider` reading `x-ms-client-principal` headers. Tests forge these headers with stable test personas (COACH, MENTOR, STUDENT) to exercise the full auth and RBAC path.

5. **Test suites**:
   - **Integration tests** (Vitest): 14 test files with ≥84 test cases covering all endpoints, RBAC, validation, and error paths
   - **Data integrity tests**: Compare API output against direct TBA and Statbotics API calls
   - **Load tests** (k6): Smoke (1 VU/30s) and load (20 VUs/3min) profiles with p95/p99 thresholds

6. **OIDC**: Reuses the existing Azure App Registration with a new federated credential for `environment:test`.

7. **Failure reporting**: Test failures automatically create a GitHub issue with JUnit XML analysis and links to the workflow run.

### Workflow Visibility

| Workflow                | Trigger         | Actions Page |
| ----------------------- | --------------- | ------------ |
| `build.yml`             | `workflow_call` | Hidden       |
| `deploy.yml`            | `workflow_call` | Hidden       |
| `post-deploy-tests.yml` | `workflow_run`  | **Visible**  |

## Alternatives Considered

### 1. Test against the dev environment

Rejected. Shared state between real usage and automated tests would cause data pollution. Test teams and plans would appear in the dev dashboard.

### 2. Permanent test environment

Rejected. Ongoing cost of ~$30-50/month for infrastructure that's only needed during ~15-20 minute test runs. Also risks infrastructure drift if Bicep changes are deployed to dev/prod but the test environment isn't updated in lockstep.

### 3. Local-only testing (Docker Compose)

Rejected. Cannot replicate Azure-specific infrastructure behavior (Flex Consumption cold starts, Key Vault secret resolution, SWA auth headers). Cannot run meaningful load tests against local containers.

### 4. Rebuild artifacts in the test workflow

Rejected. Wasteful (adds ~5 minutes build time), and the artifacts may not match the exact dev build if there are nondeterministic build steps.

## Consequences

### Positive

- **Clean slate**: Every test run starts with fresh infrastructure — no accumulated state or data pollution
- **Production fidelity**: Same Bicep modules, same SKUs, same auth path as production
- **Cost efficient**: Infrastructure exists only during the ~15-20 minute test window; estimated cost < $1 per run
- **Artifact parity**: Tests validate the exact build artifacts deployed to dev
- **Automated failure tracking**: GitHub issues created on failure with structured details

### Negative

- **~10 minute provisioning overhead**: Postgres Flex Server provisioning is the bottleneck
- **Azure OIDC credential management**: Requires maintaining the `github-allianceops-test` federated credential
- **Resource group deletion latency**: `az group delete --no-wait` means resources may persist briefly after workflow completion
- **TBA API key dependency**: Data integrity tests require the `TBA_API_KEY` secret; tests are skipped if unavailable
