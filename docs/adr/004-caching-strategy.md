# ADR 004: In-Memory TTL Caching Strategy

## Status
Accepted

## Context
AllianceOps proxies TBA and Statbotics APIs through Azure Functions. At an FRC event, many users may refresh dashboards simultaneously. Upstream APIs have rate limits and variable latency. We need a caching layer that:
- Reduces upstream API calls
- Provides fast responses during live match play
- Degrades gracefully when upstream APIs are unavailable

## Decision
Use an in-memory `Map`-based TTL cache within the Azure Functions process with three tiers:

| Tier | TTL | Use Case |
|------|-----|----------|
| `STATIC` | 1 hour | Event list, team list, schedule |
| `SEMI_STATIC` | 5 minutes | Rankings, team ratings |
| `LIVE` | 60 seconds | Match results during active play |

Each cached response includes `lastRefresh` (ISO timestamp) and `stale` (boolean) metadata. On upstream failure, the cache returns stale data with `stale: true` rather than erroring.

## Alternatives Considered
- **Azure Redis Cache**: More robust but adds cost and infrastructure complexity. Overkill for MVP with a single Functions instance.
- **Azure Table Storage**: Persistent but higher latency for hot-path reads.
- **No caching**: Would hit rate limits quickly and degrade user experience.

## Consequences
- Cache is per-process and lost on cold start (acceptable for Functions consumption plan)
- No cache invalidation API (TTL-based expiry only)
- If scaled to multiple Functions instances, each maintains its own cache (no consistency guarantee, but acceptable for read-only proxy data)
- Simple to replace with Redis or external cache later without changing the API contract
