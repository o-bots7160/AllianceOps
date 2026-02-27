# ADR-028: Function App Cold Start Optimization

## Status

Accepted

## Context

The production Azure Function App (Flex Consumption, FC1) experiences noticeable cold start latency when the first request arrives after a period of inactivity. On Flex Consumption, a cold start involves:

1. Allocating a new instance
2. Downloading the deployment package from blob storage
3. Starting the Node.js 22 runtime
4. Loading `@azure/functions`, Prisma client (with native query engine), and Application Insights
5. Establishing the first database connection

This can add 3–8 seconds of latency to the first request. For an FRC match-ops dashboard used intermittently during competition events, this creates a poor first-load experience — especially when coaches need data quickly between matches.

Flex Consumption supports **always-ready instances** that keep a configurable number of pre-warmed instances available, eliminating cold starts entirely for those instances.

## Decision

### Always-Ready Instances

Add an `alwaysReadyCount` parameter to `functionApp.bicep` and `main.bicep`:

- **Production**: Set to `1` — one HTTP trigger instance stays warm at all times
- **Dev/Test**: Default `0` — no always-ready instances (cost optimization)

The always-ready configuration targets the `http` trigger type, which covers all API endpoints.

### HTTP Concurrency

Add a `httpConcurrency` parameter (default `16`) controlling `triggers.http.perInstanceConcurrency`. This tells the Flex Consumption runtime how many concurrent HTTP requests a single instance can handle before scaling out. Node.js is single-threaded but async, so it handles concurrent I/O-bound requests well. The default of `16` balances throughput against memory pressure from concurrent Prisma queries.

### What We Did Not Change

- **Instance memory (2048 MB)**: Kept at current level. While 512 MB may suffice for most requests, Prisma's native query engine and Application Insights instrumentation benefit from headroom. Right-sizing memory is a separate optimization that should be driven by production metrics.
- **Maximum instance count (100)**: Already appropriate for burst traffic during FRC events.

## Alternatives Considered

1. **Reduce bundle size to speed up cold starts** — The API already uses esbuild bundling with tree-shaking. The main cold start cost comes from Prisma's native binary and App Insights, which can't be eliminated. Always-ready instances solve the problem directly rather than shaving milliseconds off an inherently slow process.

2. **Move to a dedicated App Service Plan (B1/P1v3)** — Would eliminate cold starts entirely but costs ~$13–$55/month continuously vs. Flex Consumption's always-ready cost (~$5–$8/month for one 2048 MB instance). Flex Consumption with always-ready is more cost-effective for intermittent workloads.

3. **Use a health-check ping to keep instances warm** — Fragile (depends on external scheduler), doesn't guarantee warmth during scaling, and Azure's native always-ready is purpose-built for this.

4. **Set always-ready to 2+ instances** — Given the traffic pattern (single FRC team, event-driven usage), one always-ready instance handles the baseline load. Flex Consumption auto-scales beyond this for burst traffic; those additional instances will cold-start but the first response is instant.

## Consequences

- **Positive**: First request to the API after idle period is served immediately (no cold start).
- **Positive**: Configurable per environment — dev stays free of always-ready costs.
- **Positive**: HTTP concurrency setting improves throughput under load by allowing Node.js to serve multiple concurrent async requests per instance.
- **Negative**: Always-ready instances incur continuous cost (~$5–$8/month for one 2048 MB instance on Flex Consumption). Acceptable for a production dashboard used during FRC season.
- **Negative**: The always-ready instance still needs to cold-start once after deployment or platform restart, but Azure keeps it warm thereafter.
