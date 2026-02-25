# ADR 021: Batch API Endpoint and Client-Side Request Deduplication

**Status:** Accepted

## Context

The frontend made excessive API calls in two key areas:

1. **Simulation EPA fetching (N+1 problem):** When simulation mode was activated, `useSimulationEpa` fired individual `GET /api/team/{N}/site?year={Y}` requests for _every team at the event_ (30–60 teams), even though only 6 teams (the current match) were displayed on the Briefing page, and only 3 on the Planner page. This created 30–60 simultaneous upstream Statbotics API calls per simulation activation.

2. **Duplicate concurrent requests:** The `useApi` hook had no request deduplication. Multiple components requesting the same path (e.g., `GlobalControls` and `EventPage` both fetching `team/{N}/events?year={Y}`) each fired independent HTTP requests. Navigating between pages re-fetched the same data every time.

3. **No abort on unmount:** `useApi` did not cancel in-flight requests when the component unmounted or the path changed, potentially causing state updates on unmounted components.

These patterns risked hitting upstream API rate limits (especially TBA and Statbotics) during live competitions.

## Decision

### 1. Batch endpoint: `POST /api/teams/site-batch`

A new API endpoint accepts `{ teamNumbers: number[], year: number }` and returns site data for multiple teams in a single response. Internally it calls the existing `cached()` function per team (reusing the same `team-site:{num}:{year}` cache keys as the individual endpoint), so individual and batch requests share server-side cache entries.

- **POST method** chosen because the team number list doesn't map cleanly to query parameters
- **10-team cap** prevents abuse; 6 teams per match is the expected use case
- **Graceful degradation**: individual team failures return `[]` rather than failing the entire batch

### 2. Scoped simulation fetching

`useSimulationEpa` now accepts a `relevantTeamNumbers` parameter. Callers pass only the team numbers from the current match (typically 6). The hook uses the batch endpoint instead of N individual requests. The full `baseMap` is still built from all event teams for EPA lookups — only the _site data fetch_ is scoped.

### 3. In-flight request deduplication (dedup-only, no client TTL cache)

`useApi` now deduplicates concurrent requests: if two components request the same path simultaneously, only one `fetch()` fires and both await the same promise. Once settled, the entry is removed — subsequent requests always go to the server.

**No time-based client cache** was added. The server-side `cached()` function (ADR-004) handles data freshness with appropriate TTLs (`LIVE` 60s, `SEMI_STATIC` 5min, `STATIC` 1hr). This avoids any client-side staleness risk during live competitions where match data changes every ~7 minutes.

### 4. AbortController cleanup

Each `useApi` hook instance creates an `AbortController`. When the component unmounts or the path changes, the controller aborts, preventing state updates on unmounted components. The abort signal is per-component-instance (not on the shared promise) so one component unmounting doesn't cancel another component's pending data.

## Alternatives Considered

- **Client-side TTL cache (30s):** Would further reduce requests on back-navigation but adds staleness risk during live events. Rejected in favor of dedup-only to keep competition data as fresh as possible.
- **SWR / React Query:** Full-featured data-fetching libraries with built-in caching, dedup, and revalidation. Would solve all issues comprehensively but adds a significant dependency. Could be revisited if data-fetching requirements grow more complex.
- **Scope to match teams only (no batch endpoint):** Would reduce calls from ~40 to 6 individual GETs. The batch endpoint further reduces to 1 request and is more efficient for the server to process.

## Consequences

- **Positive:** Simulation activation drops from 30–60 API calls to 1. Duplicate concurrent requests eliminated. Stale state updates on unmount eliminated.
- **Positive:** Server-side cache is shared between individual and batch endpoints (same cache keys), so a team fetched individually is also warm for batch requests and vice versa.
- **Positive:** No client-side staleness — every navigation/mount gets fresh data from the server (which applies its own TTLs).
- **Negative:** Back-navigation still triggers a server request (no client cache). This is acceptable because the server cache makes these requests fast.
- **Negative:** The batch endpoint is a new surface area to maintain, though it's minimal (delegates to existing `cached()` + `StatboticsClient`).
