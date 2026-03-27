# ADR-032: Dev Environment Cost Optimization

## Status

Accepted

## Context

Both the dev and prod Azure environments run on a single MSDN Enterprise subscription with $150/month in credits. Combined estimated spend was approaching $100–110/month, leaving limited headroom for spikes or new resources. The dev environment runs 24/7 but is only actively used a few times a week around deployments — local development via Dev Container handles day-to-day work.

The largest dev cost drivers are:

- **PostgreSQL Flexible Server (B1ms):** ~$12–25/month running continuously
- **Static Web App (Standard):** ~$9.50/month (required for `dev.allianceops.io` custom domain)
- **Log Analytics ingestion:** Diagnostic settings from all resources (Storage, Key Vault, SignalR, PostgreSQL) contribute to PerGB2018 costs
- **Application Insights:** Full telemetry capture with no request sampling

## Decision

### 1. PostgreSQL Auto-Stop/Start

A new GitHub Actions workflow (`postgres-manage.yml`) stops the dev PostgreSQL server nightly at 4:00 AM UTC via cron schedule. The deploy workflow (`deploy.yml`) automatically starts the server before running Prisma migrations, so no manual intervention is needed for deployments. A manual dispatch option allows starting or stopping any environment on demand.

### 2. Reduced Diagnostic Settings for Dev

A new `diagnosticLevel` parameter (`'full'` | `'essential'`) controls diagnostic verbosity per environment:

- **`essential` (dev/test):** Only Application Insights and Function App logs are forwarded to Log Analytics. Storage blob logs, Key Vault audit logs, SignalR logs, and PostgreSQL verbose logging parameters (`log_connections`, `log_disconnections`, `log_checkpoints`, `log_min_duration_statement`) are skipped.
- **`full` (prod):** All diagnostic settings remain — no change to production behavior.

### 3. Log Analytics Tuning for Dev

The Log Analytics workspace configuration is now parameterized:

- **Dev/test:** 7-day retention, 0.5 GB daily ingestion cap
- **Prod:** 30-day retention, 1 GB daily ingestion cap (unchanged)

### 4. Application Insights Sampling for Dev

A new `appInsightsSamplingPercentage` parameter controls telemetry sampling via the Function App's `APPLICATIONINSIGHTS_SAMPLING_PERCENTAGE` app setting:

- **Dev/test:** 50% sampling (half of telemetry is discarded before ingestion)
- **Prod:** 100% sampling (all telemetry captured, unchanged)

## Alternatives Considered

- **Downgrade SWA to Free tier:** Would save ~$9.50/month but removes custom domain support (`dev.allianceops.io`). Rejected — custom domain is needed for consistent auth callback URLs and team access.
- **Downgrade PostgreSQL SKU:** B1ms is already the cheapest Flexible Server Burstable tier. No cheaper option exists.
- **Azure Automation for Postgres stop/start:** More complex to set up and requires an additional Azure resource. GitHub Actions is simpler and already part of the CI/CD pipeline.
- **Disable Application Insights entirely for dev:** Would save ~$3/month but eliminates the primary debugging tool for deployed code. Rejected — sampling achieves cost reduction while retaining observability.

## Consequences

### Positive

- Estimated dev cost reduction of $10–25/month, providing more budget headroom
- No change to production behavior or observability
- Deploy workflow handles Postgres auto-start transparently — developers don't need to remember to start the server
- All changes are parameterized in Bicep, making it easy to adjust per environment

### Negative

- Dev deployments may take 1–2 minutes longer when PostgreSQL needs to be started from a stopped state
- Reduced dev diagnostics mean some issues (e.g., Key Vault access patterns, storage operations) are only observable in production
- 50% sampling means some dev telemetry is lost — debugging intermittent issues may require temporarily increasing the sampling rate
- The nightly stop schedule may interfere if someone is doing late-night dev work (mitigated by the manual start dispatch)
