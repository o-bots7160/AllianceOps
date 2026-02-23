# ADR 006: Secrets Management via Azure Key Vault

## Status
Accepted

## Context
AllianceOps requires several secrets at runtime: the TBA API key, the PostgreSQL connection string, and potentially future OAuth client secrets. These secrets must not appear in source code, Bicep parameter files, CI environment variables, or application settings in plain text.

Azure Functions supports referencing Key Vault secrets directly in app settings using the `@Microsoft.KeyVault()` syntax, which avoids the need to write custom secret-loading code.

## Decision
Use Azure Key Vault with RBAC-based access control for all production secrets:

- **Function App** has a system-assigned managed identity
- **Key Vault** grants the Function App's identity the "Key Vault Secrets User" role
- **App settings** reference secrets via `@Microsoft.KeyVault(VaultName=...;SecretName=...)`
- **Local development** uses `.env` (gitignored) loaded via dotenv, with `local.settings.json` for Functions-specific runtime config (CORS, etc.)
- **CI/CD** passes secrets to Bicep deployments via GitHub Actions secrets (`${{ secrets.TBA_API_KEY }}`)

Secrets stored in Key Vault:
- `TbaApiKey` — The Blue Alliance API key
- `DatabaseUrl` — PostgreSQL connection string

## Alternatives Considered
- **App settings with GitHub Secrets**: Simpler but secrets appear in plain text in Azure portal app settings. No audit trail.
- **Azure App Configuration**: Better for non-secret config values but doesn't replace Key Vault for actual secrets.
- **Environment variables in Bicep**: Would embed secrets in ARM deployment history. Not acceptable.

## Consequences
- All secrets have an audit trail via Key Vault access logs
- Secret rotation requires only a Key Vault update — no app redeployment needed
- Function App cold starts may add ~100ms for initial Key Vault resolution (cached afterward)
- Local development uses a separate mechanism (`.env` + dotenv) which must be kept in sync with Key Vault secret names
- Adding a new secret requires: (1) add to Key Vault Bicep module, (2) add `@Microsoft.KeyVault()` reference in Function App module, (3) add to `.env.example`
