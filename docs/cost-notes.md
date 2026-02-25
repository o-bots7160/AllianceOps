# AllianceOps — Azure Cost Notes

## Overview

AllianceOps is designed to minimize Azure costs using free/consumption tiers where possible. This document outlines the expected costs per environment.

## Resource Naming Convention

All resources use the `{abbreviation}-aops-{env}` pattern per Microsoft Cloud Adoption Framework:

| Resource | Dev | Prod |
|---|---|---|
| Resource Group | `rg-aops-dev` | `rg-aops-prod` |
| Static Web App | `stapp-aops-dev` | `stapp-aops-prod` |
| Function App | `func-aops-dev` | `func-aops-prod` |
| App Service Plan | `asp-aops-dev` | `asp-aops-prod` |
| Storage Account | `staopsdev` | `staopsprod` |
| PostgreSQL | `psql-aops-dev` | `psql-aops-prod` |
| Key Vault | `kv-aops-dev` | `kv-aops-prod` |
| App Insights | `appi-aops-dev` | `appi-aops-prod` |
| Log Analytics | `log-aops-dev` | `log-aops-prod` |
| Budget | `budget-aops-dev` | `budget-aops-prod` |

## Resource Costs by Tier

### Dev Environment

| Resource | SKU | Estimated Monthly Cost |
| --- | --- | --- |
| Azure Static Web Apps | Standard | $9/month |
| Azure Functions | Consumption (Y1) | ~$0 (1M free executions/month) |
| Azure Database for PostgreSQL | Burstable B1ms | ~$13/month |
| Azure Key Vault | Standard | ~$0.03/10K operations |
| Application Insights | Pay-as-you-go | ~$0 (5 GB free/month) |
| Log Analytics Workspace | PerGB2018 | ~$0 (5 GB free/month) |
| Storage Account (Functions) | Standard LRS | ~$0.02/month |

**Estimated dev total: ~$22-24/month** (dominated by PostgreSQL + SWA Standard)

### Prod Environment

| Resource | SKU | Estimated Monthly Cost |
| --- | --- | --- |
| Azure Static Web Apps | Standard | $9/month |
| Azure Functions | Flex Consumption (FC1) | ~$0-5 (pay-per-execution, no cold starts) |
| Azure Database for PostgreSQL | Burstable B1ms | ~$13/month |
| Azure Key Vault | Standard | ~$0.03/10K operations |
| Application Insights | Pay-as-you-go | ~$0 (5 GB free/month) |
| Log Analytics Workspace | PerGB2018 | ~$0 (5 GB free/month) |
| Storage Account (Functions) | Standard LRS | ~$0.02/month |

**Estimated prod total: ~$22-27/month**

If traffic grows:

- PostgreSQL can scale up to General Purpose tier (~$50-100/month)
- Functions Flex Consumption scales automatically with no cold starts

### Cost Optimization Tips

1. **Stop dev PostgreSQL when not in use** — Flexible Server supports stop/start; stopped servers cost ~$0 for compute (storage still billed)
2. **Application Insights sampling** — Enabled by default in `host.json` to reduce ingestion volume
3. **Key Vault operations** — Minimal cost; secrets are read once at app startup and cached
4. **Flex Consumption (prod)** — No idle cost; scales to zero when not in use. No cold starts like traditional Consumption plan
5. **SWA bandwidth** — Standard tier includes 100 GB/month; more than sufficient for a team dashboard

## Budget Alerts

Budget alerts are configured in the Bicep infrastructure and fire at 80%, 90%, and 100% of actual monthly spend:

- **Dev**: $20/month budget
- **Prod**: $50/month budget

Alerts are sent to the email addresses configured via the `budgetContactEmails` parameter during deployment.
