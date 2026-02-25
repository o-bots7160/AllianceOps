# ADR-023: Reusable Deploy Workflow with Deployment Naming and Cleanup

**Status:** Accepted

## Context

The `deploy-dev.yml` and `deploy-prod.yml` workflows duplicated ~250 lines of identical logic — build, infrastructure deployment, database migrations, function app packaging, and SWA deployment. The only differences were resource name suffixes (`-dev` vs `-prod`), the Bicep parameter file, and a prod-only apex domain registration step.

Additionally, `az deployment group create` commands did not specify `--name`, causing Azure to auto-generate deployment names from the template filename (always `main`). This made deployment history in the Azure Portal difficult to distinguish and impossible to correlate with specific CI runs or commits.

Old deployments accumulated indefinitely in each resource group with no cleanup mechanism.

## Decision

### Reusable workflow

Extract the shared build and deploy logic into a single reusable workflow (`.github/workflows/deploy.yml`) using `workflow_call`. The dev and prod trigger files become thin callers (~20 lines each) that pass environment-specific inputs:

| Input           | Type    | Purpose                                          |
| --------------- | ------- | ------------------------------------------------ |
| `environment`   | string  | GitHub environment name (`dev` / `production`)   |
| `env-suffix`    | string  | Resource name suffix (`dev` / `prod`)            |
| `register-apex` | boolean | Whether to run the apex domain registration step |

Secrets flow via `secrets: inherit`.

### Deployment naming

All `az deployment group create` commands now include `--name`:

- **Infrastructure deployments**: `aop-{run_number}-{sha7}` (e.g., `aop-42-abc1234`)
- **DNS deployments**: `dns-{env}-aop-{run_number}-{sha7}` (e.g., `dns-dev-aop-42-abc1234`)

The DNS prefix includes the environment to avoid name collisions in the shared `rg-aops-global` resource group.

### Deployment cleanup

A final `Cleanup Old Deployments` step (with `if: always()`) prunes each resource group to the latest 10 deployments using `az deployment group delete --no-wait`.

## Alternatives Considered

1. **Composite action**: Would reduce some duplication but cannot define multi-job workflows, making the build → deploy dependency awkward.
2. **Template repository / external action**: Over-engineered for a two-environment setup within the same repo.
3. **Keep separate files**: Rejected — the duplication was a maintenance burden and source of drift.
4. **Timestamp-based deployment names**: Less traceable than run number + commit SHA.

## Consequences

- **Single source of truth**: All deployment logic lives in `deploy.yml`. Changes propagate to both environments automatically.
- **Traceability**: Every deployment in Azure Portal maps directly to a GitHub Actions run and commit.
- **Clean history**: Resource groups stay manageable with at most 10 deployment records each.
- **Concurrency still per-environment**: `cancel-in-progress` is controlled by each caller workflow, not the reusable workflow.
- **CI workflow unchanged**: The `ci.yml` what-if step is ephemeral and doesn't benefit from these changes.
