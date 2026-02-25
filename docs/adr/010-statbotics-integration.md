# ADR 010: Statbotics API Integration via Enriched Endpoints

## Status
Accepted

## Context
AllianceOps strategy engines (briefing, path, picklist) require EPA (Expected Points Added) data from Statbotics to produce meaningful analysis — win conditions, difficulty ratings, and composite team rankings. The `StatboticsClient` and types existed in `packages/shared` but were not wired to any API endpoint. The web app pages referenced EPA fields that the API did not provide.

The question was whether to create separate Statbotics-specific endpoints or merge the data into existing TBA endpoints.

## Decision
Merge Statbotics data into the existing `/event/{eventKey}/teams` and `/event/{eventKey}/matches` endpoints using new `EnrichedTeam` and `EnrichedMatch` response types.

### How It Works
- **Teams endpoint**: Fetches TBA teams and Statbotics event teams in parallel (`Promise.all`), merges by team number. Returns `EnrichedTeam[]` which extends `TBATeam` with `epa`, `eventRecord`, and `winrate` fields.
- **Matches endpoint**: Fetches TBA matches and Statbotics event matches in parallel, merges predictions by match key. Returns `EnrichedMatch[]` which extends `TBAMatch` with a `prediction` field.
- **Graceful degradation**: If Statbotics is unavailable, the `.catch(() => [])` returns empty arrays and enriched fields are `null`. Pages handle null EPA gracefully.
- **Caching**: Both upstream calls share the same cache entry. TBA and Statbotics data refresh together at the endpoint's TTL class (`SEMI_STATIC` for teams, `LIVE` for matches).

### Statbotics v3 API Normalization
The Statbotics v3 API returns a different shape than our internal types:
- **EPA**: v3 returns `epa.total_points.mean` and `epa.breakdown.{auto,teleop,endgame}_points` — the `StatboticsClient` normalizes these into a flat `StatboticsEPA { total, auto, teleop, endgame, unitless }`.
- **Record**: v3 nests records under `record.qual` and `record.total` — the client extracts qual-level `{ wins, losses, ties }`.
- **Match key**: v3 uses `key` instead of `match` — the client maps this during deserialization.

This normalization lives in `packages/shared/src/clients/statbotics.ts`. If the Statbotics API changes shape again, only this file needs updating.

### Merge Logic
Extracted into `apps/api/src/lib/merge.ts` with pure functions `mergeTeams()` and `mergeMatches()` for testability.

## Alternatives Considered
- **Separate `/event/{eventKey}/epa` endpoint**: Would require the web app to make two parallel requests and merge client-side. More complex for consumers, and the data is always needed together.
- **Server-side strategy engine execution**: Run briefing/path/picklist engines on the server and return computed results. Deferred — would add complexity and reduce client flexibility for custom weights.
- **Statbotics data in a dedicated database table**: Over-engineered for the current use case. Statbotics data is ephemeral and cached in-memory with appropriate TTLs.

## Consequences
- Web app pages receive enriched data in a single request — no additional API calls needed
- All three strategy engines can now receive the EPA data they require
- If Statbotics goes down or is slow, the API still returns TBA data with null EPA fields — no user-facing errors
- The `EnrichedTeam` and `EnrichedMatch` types are the new API contract — consumers should handle nullable enrichment fields
