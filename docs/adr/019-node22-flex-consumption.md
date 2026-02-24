# ADR-019: Upgrade to Node.js 22 and Flex Consumption

## Status

Accepted

## Context

Azure Functions issued two deprecation warnings for the AllianceOps API:

1. **Node.js 20 LTS reaches EOL on 2026-04-30** and will no longer be supported by the Azure Functions runtime.
2. **Linux Consumption (Y1/Dynamic) reaches EOL on 2028-09-30** and will no longer be supported.

The production environment already used Flex Consumption (FC1), but the dev environment still used the legacy Consumption plan (Y1). The Bicep module carried conditional logic to support both plan types.

## Decision

### Node.js 22

Upgrade the entire stack from Node.js 20 to Node.js 22 LTS:

- Dev Container base image and Node.js feature version
- GitHub Actions CI and deploy workflows
- esbuild target
- Azure Functions `linuxFxVersion`, `WEBSITE_NODE_DEFAULT_VERSION`, and Flex Consumption `runtime.version`

### Flex Consumption everywhere

Migrate the dev environment from Y1 (Consumption) to FC1 (Flex Consumption), matching production. With both environments on the same plan, remove:

- The `planSku` parameter from `main.bicep` and both parameter files
- The `isFlexConsumption` conditional variable and all branching logic in `functionApp.bicep`
- The legacy Consumption storage connection string (`AzureWebJobsStorage` with account key)
- Conditional guards on the deployment blob container and Storage Blob Data Owner role assignment

The Bicep module now unconditionally provisions Flex Consumption resources with managed-identity-based storage access.

## Alternatives Considered

1. **Upgrade Node.js only, keep Y1 for dev** — Would defer the Consumption EOL issue and leave unnecessary conditional Bicep complexity. Both warnings should be addressed together.
2. **Keep the `planSku` parameter for future flexibility** — The Y1 plan is being deprecated; retaining dead code adds maintenance burden with no benefit.

## Consequences

- **Positive**: Eliminates the Node.js 20 EOL risk well before the April 2026 deadline.
- **Positive**: Both environments now match in hosting plan, reducing configuration drift and simplifying the Bicep module (~30 lines removed).
- **Positive**: Managed identity storage access in both environments (no more storage account keys in app settings for dev).
- **Negative**: Flex Consumption is still in GA but newer than Consumption; any FC1-specific Azure issues will affect both environments. This is acceptable since production was already on FC1.
- **Negative**: Dev container rebuild required for existing developers to pick up Node.js 22.
