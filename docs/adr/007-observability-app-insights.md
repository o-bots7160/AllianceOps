# ADR 007: Observability with Application Insights

## Status
Accepted

## Context
AllianceOps is a serverless application (Azure Functions consumption plan) serving real-time data at FRC events. Diagnosing issues during a competition — when there's no time to SSH into a server — requires centralized logging, metrics, and alerting. Azure Application Insights integrates natively with Azure Functions and provides end-to-end distributed tracing.

## Decision
Use Azure Application Insights backed by a Log Analytics workspace for all production observability:

### Infrastructure
- **Application Insights** resource with `web` application type
- **Log Analytics workspace** with 30-day retention and PerGB2018 pricing (5 GB/month free)
- **Availability test** pinging `GET /api/health` every 5 minutes from 2 regions

### SDK Integration
- The `applicationinsights` npm package is initialized in the API entry point (`src/index.ts`)
- Telemetry is a no-op when `APPLICATIONINSIGHTS_CONNECTION_STRING` is not set (local dev)
- Auto-collection enabled for: requests, performance, exceptions, dependencies

### Custom Telemetry
- `trackCacheMetric(hit, endpoint)` — cache hit/miss ratio per endpoint
- `trackUpstreamError(source, endpoint, statusCode)` — TBA/Statbotics API failures
- `trackApiLatency(endpoint, durationMs)` — response time per endpoint

### Sampling
- Request sampling is enabled in `host.json` to reduce ingestion costs
- Request events are excluded from sampling (always captured)

## Alternatives Considered
- **OpenTelemetry + Grafana**: More portable but requires self-hosted infrastructure. Overkill for a team dashboard.
- **Console logging only**: No centralized view, no alerting, logs lost on Function App recycle.
- **Azure Monitor only (no SDK)**: Provides basic metrics but no custom telemetry or distributed tracing.

## Consequences
- Production issues can be diagnosed via Azure Portal without accessing the runtime
- Custom metrics enable dashboards for cache efficiency and upstream API health
- Cost is effectively $0 under the 5 GB/month free tier for this workload
- The availability test URL is currently a placeholder and must be updated after initial deployment
- Developers should use the telemetry helpers (`trackCacheMetric`, etc.) instead of `console.log` in production code paths
