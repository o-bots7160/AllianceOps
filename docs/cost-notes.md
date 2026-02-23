# AllianceOps — Azure Cost Notes

## Overview

AllianceOps is designed to minimize Azure costs using free/consumption tiers where possible. This document outlines the expected costs per environment.

## Resource Costs by Tier

### Dev Environment

| Resource                      | SKU              | Estimated Monthly Cost         |
| ----------------------------- | ---------------- | ------------------------------ |
| Azure Static Web Apps         | Free             | $0                             |
| Azure Functions               | Consumption (Y1) | ~$0 (1M free executions/month) |
| Azure Database for PostgreSQL | Burstable B1ms   | ~$13/month                     |
| Azure Key Vault               | Standard         | ~$0.03/10K operations          |
| Application Insights          | Pay-as-you-go    | ~$0 (5 GB free/month)          |
| Log Analytics Workspace       | PerGB2018        | ~$0 (5 GB free/month)          |
| Storage Account (Functions)   | Standard LRS     | ~$0.02/month                   |

**Estimated dev total: ~$13-15/month** (dominated by PostgreSQL)

### Prod Environment

Same as dev for MVP. If traffic grows:

- PostgreSQL can scale up to General Purpose tier (~$50-100/month)
- SWA Standard tier ($9/month) for custom domains + auth customization
- Functions remain on Consumption unless sustained high load warrants Premium

### Cost Optimization Tips

1. **Stop dev PostgreSQL when not in use** — Flexible Server supports stop/start; stopped servers cost ~$0 for compute (storage still billed)
2. **Application Insights sampling** — Enabled by default in `host.json` to reduce ingestion volume
3. **Key Vault operations** — Minimal cost; secrets are read once at app startup and cached
4. **Functions cold start** — Consumption plan has cold starts (~1-2s); acceptable for this workload
5. **SWA bandwidth** — Free tier includes 100 GB/month; more than sufficient for a team dashboard

## Budget Alert Recommendation

Set an Azure budget alert at $20/month for dev and $50/month for prod to catch unexpected cost spikes.

```bash
# Example: Create a budget via Azure CLI
az consumption budget create \
  --budget-name allianceops-dev-budget \
  --amount 20 \
  --time-grain Monthly \
  --category Cost \
  --resource-group rg-allianceops-dev
```
