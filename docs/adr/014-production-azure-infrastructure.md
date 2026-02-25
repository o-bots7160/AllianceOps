# ADR 014: Production-Ready Azure Infrastructure

## Status
Accepted (supersedes deployment details in ADR 006, ADR 007, ADR 009)

## Context
The initial Bicep infrastructure was scaffolded but incomplete — resource names were inconsistent (`allianceops` prefix vs Microsoft conventions), the Static Web App lacked a linked backend, PostgreSQL used password-only authentication, there were no budget alerts, and the CI/CD pipelines did not deploy the Function App code. The infrastructure needed to be production-ready for both dev and prod environments deployed to a single Azure subscription.

## Decision
Fully implement the Azure infrastructure with the following changes:

### Naming Convention
All resources follow Microsoft Cloud Adoption Framework abbreviated naming with the `aops` prefix:

| Resource | Abbreviation | Pattern |
|---|---|---|
| Resource Group | `rg` | `rg-aops-{env}` |
| Static Web App | `stapp` | `stapp-aops-{env}` |
| Function App | `func` | `func-aops-{env}` |
| App Service Plan | `asp` | `asp-aops-{env}` |
| Storage Account | `st` | `staops{env}` (no hyphens) |
| PostgreSQL Flexible Server | `psql` | `psql-aops-{env}` |
| Key Vault | `kv` | `kv-aops-{env}` |
| Application Insights | `appi` | `appi-aops-{env}` |
| Log Analytics Workspace | `log` | `log-aops-{env}` |
| Budget | `budget` | `budget-aops-{env}` |

### Environment-Specific Function App Plans
- **Dev**: Consumption plan (Y1) — zero cost at low volumes, acceptable cold starts for development
- **Prod**: Flex Consumption plan (FC1) — no cold starts, scales to zero, managed identity for storage access with RBAC (Storage Blob Data Owner), blob container for package deployment

### Static Web App Linked Backend
The SWA is linked to the Function App via `Microsoft.Web/staticSites/linkedBackends`, enabling automatic API proxying without manual CORS configuration. Both environments use Standard SKU for custom domain and auth provider support.

### PostgreSQL Entra ID Authentication
Microsoft Entra ID authentication is enabled alongside password authentication via the `authConfig` block. This allows future migration to passwordless managed identity connections. Entra ID admin assignment is a post-deployment CLI step.

### Key Vault Secrets Expansion
Key Vault now stores three secrets (previously two):
- `TbaApiKey` — The Blue Alliance API key
- `DatabaseUrl` — PostgreSQL connection string
- `PostgresAdminPassword` — PostgreSQL admin password (moved from plain Bicep parameter)

### Budget Alerts
Monthly budget alerts (via `Microsoft.Consumption/budgets`) fire at 80%, 90%, and 100% of actual spend:
- Dev: $20/month
- Prod: $50/month

### Observability Simplification
Removed the placeholder availability test from Application Insights (the URL was a non-functional placeholder). Application Insights and Log Analytics retain proper `appi-`/`log-` naming.

### CI/CD Updates
- Azure OIDC values (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`) moved from repository variables (`vars.*`) to repository secrets (`secrets.*`)
- Resource group references updated to `rg-aops-{env}`
- Function App code deployment added via `az functionapp deployment source config-zip` in both dev and prod workflows
- Deploy jobs install production API dependencies before zipping for deployment

## Alternatives Considered
- **Terraform instead of Bicep**: More portable but the team is Azure-only and Bicep has first-class ARM support with no state file management
- **Single SKU for both environments**: Simpler but Flex Consumption's zero cold-start is valuable in prod during time-sensitive competition use
- **Entra ID-only PostgreSQL auth**: Would eliminate password management entirely but requires additional Prisma configuration and testing; keeping both auth methods provides a migration path
- **Action Groups for budget alerts**: Would enable SMS/webhook notifications but email is sufficient for this team size

## Consequences
- All Azure resources follow a predictable, discoverable naming convention
- Prod Function App has no cold starts and uses managed identity for storage (no connection string secrets)
- SWA-to-Functions API proxying works automatically via linked backend
- Budget alerts provide cost governance without manual monitoring
- PostgreSQL is ready for future passwordless auth migration
- Function App code is now fully deployed via CI/CD (previously only SWA was deployed)
- The availability test must be re-added manually once the Function App URL is known post-deployment
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` must be configured as GitHub repository secrets (not variables)
