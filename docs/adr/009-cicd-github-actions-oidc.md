# ADR 009: CI/CD with GitHub Actions and Azure OIDC

## Status
Accepted

## Context
AllianceOps needs automated checks on pull requests and automated deployments to dev and production Azure environments. The deployment pipeline must authenticate to Azure to deploy infrastructure (Bicep) and application code (Static Web Apps + Functions). Storing long-lived Azure credentials as GitHub secrets is a security risk.

## Decision
Use GitHub Actions with Azure OIDC (OpenID Connect) federated credentials for secure, secretless Azure authentication:

### PR Checks (`ci.yml`)
Runs on all PRs to `main` and `dev`:
1. `pnpm install --frozen-lockfile`
2. `pnpm lint` — ESLint across all packages
3. `pnpm typecheck` — TypeScript strict checking
4. `pnpm test` — Vitest across all packages
5. `az bicep build --file infra/main.bicep` — validates Bicep syntax
6. `az deployment group what-if` — previews infrastructure changes (conditional on OIDC being configured)

### Dev Deployment (`deploy-dev.yml`)
Triggered on push to `dev` branch:
1. Build all packages
2. Azure Login via OIDC
3. Deploy infrastructure (Bicep) to `rg-allianceops-dev`
4. Deploy Static Web App
5. Uses `environment: dev` for GitHub environment protection

### Production Deployment (`deploy-prod.yml`)
Triggered on push to `main` branch:
1. Build all packages
2. Azure Login via OIDC
3. Deploy infrastructure (Bicep) to `rg-allianceops-prod`
4. Deploy Static Web App
5. Uses `environment: production` with **manual approval gate**
6. `cancel-in-progress: false` to prevent accidental deployment cancellation

### Azure OIDC Configuration
- GitHub Actions requests a short-lived token from Azure AD using federated credentials
- No long-lived secrets stored in GitHub — only `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` (stored as repository variables, not secrets)
- Requires an Azure AD app registration with federated credential trust for the GitHub repository

### Secrets Handling
- `POSTGRES_ADMIN_PASSWORD` and `TBA_API_KEY` are GitHub Actions secrets passed to Bicep deployments
- `AZURE_SWA_TOKEN_DEV` and `AZURE_SWA_TOKEN_PROD` are deployment tokens for Static Web Apps
- All secrets flow into Key Vault during infrastructure deployment — never into app settings directly

## Alternatives Considered
- **Azure DevOps Pipelines**: Tighter Azure integration but team already uses GitHub. Adding another CI system adds complexity.
- **Stored service principal secrets**: Simpler to configure but long-lived credentials are a security risk and must be manually rotated.
- **Manual deployments**: Not acceptable for a team that needs reliable, repeatable deployments during competition season.

## Consequences
- Azure authentication is secretless — no credential rotation required
- Infrastructure and application deploy together, ensuring consistency
- Production deployments require manual approval, preventing accidental releases
- OIDC setup requires one-time Azure AD configuration (app registration + federated credential)
- The `what-if` step in CI provides deployment preview but is conditional on OIDC being configured (skipped if `AZURE_CLIENT_ID` is not set)
- Bicep parameter files (`dev.parameters.json`, `prod.parameters.json`) contain only non-secret values
