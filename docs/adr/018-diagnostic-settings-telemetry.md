# ADR-018: Diagnostic Settings and Enhanced Telemetry

## Status

Accepted

## Context

AllianceOps already has Application Insights and a Log Analytics workspace (ADR-007), but the infrastructure lacked diagnostic settings on key Azure resources. Without diagnostic settings, platform-level logs and metrics from the Function App, Storage Account, Key Vault, and PostgreSQL were not being collected — limiting visibility into operational health, security auditing, and performance troubleshooting.

For an FRC match-ops dashboard that relies on live data from external APIs, comprehensive telemetry is essential for diagnosing upstream failures, slow queries, and auth issues during competition events.

## Decision

Add Azure Diagnostic Settings to all major infrastructure resources, routing logs and metrics to the existing Log Analytics workspace. Additionally, enable PostgreSQL server parameters for enhanced query and connection logging.

### Resources with diagnostic settings

| Resource | Log categories | Metrics |
|---|---|---|
| **Function App** | FunctionAppLogs, AppServiceHTTPLogs, AppServiceConsoleLogs, AppServiceAppLogs | AllMetrics |
| **Storage Account (blob)** | StorageRead, StorageWrite, StorageDelete | Transaction |
| **Key Vault** | AuditEvent, AzurePolicyEvaluationDetails | AllMetrics |
| **PostgreSQL** | PostgreSQLLogs, PostgreSQLFlexSessions, PostgreSQLFlexQueryStoreRuntime, PostgreSQLFlexQueryStoreWaitStats | AllMetrics |

### PostgreSQL server parameters enabled

- `log_connections`: on
- `log_disconnections`: on
- `log_checkpoints`: on
- `log_min_duration_statement`: 1000ms (log slow queries > 1s)

### Log Analytics workspace enhancements

- Daily ingestion cap set to 1 GB to control costs on the PerGB2018 tier

### Implementation pattern

- Each module accepts an optional `logAnalyticsWorkspaceId` parameter
- Diagnostic settings are conditionally deployed (`if (!empty(logAnalyticsWorkspaceId))`)
- The Log Analytics workspace ID flows from the `appInsights` module output through `main.bicep` to all modules

## Alternatives Considered

1. **Separate diagnostic module** — A single module that creates all diagnostic settings by accepting resource IDs. Rejected because it creates tight coupling between modules and requires exposing every resource ID through outputs.

2. **Azure Monitor Action Groups + Alerts** — Adding alert rules for specific metrics. Deferred to a future ADR — diagnostic settings must come first as the foundation for alerting.

3. **Third-party monitoring (Datadog, Grafana Cloud)** — Adds cost and complexity. Azure-native telemetry through Log Analytics + App Insights is sufficient and aligns with the existing infrastructure.

## Consequences

- **Positive**: Full operational visibility across all Azure resources; Key Vault audit trail for security compliance; slow query detection in PostgreSQL; blob storage access auditing
- **Positive**: All telemetry centralised in one Log Analytics workspace for unified querying via KQL
- **Positive**: Daily cap (1 GB) prevents unexpected Log Analytics costs
- **Negative**: Marginal increase in Azure costs from log ingestion (mitigated by daily cap)
- **Negative**: PostgreSQL slow query logging (>1s) may generate noise during initial migrations or seed operations
- **Future**: This provides the foundation for Azure Monitor alert rules (ADR TBD)
