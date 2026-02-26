# ADR-026: Azure Operations Dashboard

**Status:** Accepted

**Date:** 2026-02-26

## Context

AllianceOps runs two Azure environments (dev and prod) across three resource groups (`rg-aops-dev`, `rg-aops-prod`, `rg-aops-global`). Monitoring operational health requires navigating to individual resources across multiple resource groups in the Azure Portal, which is time-consuming and makes it difficult to compare environments side-by-side.

The team needs a single-pane-of-glass view that shows key metrics for both environments, enabling quick triage of issues and operational awareness without manually drilling into each resource.

## Decision

Deploy a shared Azure Portal Dashboard (`Microsoft.Portal/dashboards`) via a standalone Bicep file (`infra/dashboard.bicep`) into the `rg-aops-global` resource group. The dashboard is deployed via a manual-dispatch GitHub Actions workflow (`deploy-dashboard.yml`), following the same pattern as `register-apex.yml`.

### Dashboard Structure

The dashboard uses a two-column layout (Dev left, Prod right) with six tile groups:

1. **Resource Groups** — Portal links to all three resource groups
2. **Application Insights** — Server requests, failed requests, response time (per env)
3. **Function App** — Execution count, execution duration, HTTP 5xx errors (per env)
4. **PostgreSQL** — CPU %, memory %, active connections, storage % (per env)
5. **Static Web App** — Request count, data out (per env)
6. **Budget & Cost** — Budget limits with links to Cost Analysis (per env)

### Key Design Choices

- **Deterministic resource IDs**: Resource IDs are constructed in Bicep using the established naming convention (`{abbrev}-aops-{env}`) and a subscription ID parameter, eliminating the need for cross-deployment references or outputs.
- **Global resource group**: Deployed to `rg-aops-global` (alongside DNS resources) since the dashboard spans both environments and doesn't belong to either one.
- **Manual workflow**: Dashboard changes are infrequent, so a `workflow_dispatch` trigger avoids unnecessary deployments on every push.

## Alternatives Considered

1. **Portal-only (no IaC)**: Create the dashboard manually in Azure Portal. Rejected because it's not version-controlled, not reproducible, and could be accidentally deleted.

2. **ARM JSON template**: Use raw ARM template instead of Bicep. Rejected because the rest of the infra uses Bicep, and Bicep provides better readability for the large tile definition array.

3. **Grafana / external monitoring**: Deploy Azure Managed Grafana for dashboarding. Rejected as overkill for the current scale — adds cost and operational overhead. The Azure Portal dashboard is free and sufficient.

4. **Per-environment dashboards**: Deploy separate dashboards in each environment's resource group. Rejected because the primary value is cross-environment comparison in a single view.

5. **Embed in main.bicep**: Add the dashboard module to the existing `main.bicep` deployment. Rejected because `main.bicep` deploys per-environment but the dashboard spans both environments.

## Consequences

### Positive

- Single operational view for both environments — reduces time to detect and compare issues
- Version-controlled and reproducible — dashboard definition lives in the repo
- Follows established IaC patterns (Bicep modules, `.bicepparam` parameter files, OIDC auth)
- No additional cost — Azure Portal dashboards are free
- CI validates the Bicep template on every PR

### Negative

- Dashboard must be manually redeployed if resource naming conventions change
- Azure Portal dashboard tiles have limited customization compared to Grafana
- Large Bicep file due to verbose tile definitions (inherent to the `Microsoft.Portal/dashboards` resource type)
- Metric tile configuration uses magic numbers for aggregation types (Azure Portal convention)
