# ADR 011: Simulation Play-by-Play with React Context

## Status
Accepted

## Context
The simulation page had a local cursor that let users replay an event match-by-match. However, other pages (briefing, path, event) always showed the full real-time state with no awareness of the cursor. Users wanted a "point in time" view so they could navigate to briefing or path and see what those pages would look like at a specific match during the event.

This required a cross-page state mechanism — something the app didn't have, since all state was either page-local or in the `useEventSetup` hook (localStorage-backed, no cursor concept).

## Decision
Introduce a `SimulationContext` React context provider with an explicit enable/disable toggle:

### Architecture
- **`SimulationProvider`** wraps the app in `layout.tsx` via a `Providers` component
- **`useSimulation()`** hook exposes: `isSimulating`, `activeCursor`, `startSimulation()`, `stopSimulation()`, `setCursor()`
- **`activeCursor`** is `null` when simulation is disabled, preventing accidental filtering in normal mode
- **`SimulationBar`** renders a persistent amber banner below the header when simulation is active, with cursor slider and stop button

### State Flow
1. URL query params (`?cursor=N&simEvent=key`) take priority on mount
2. Falls back to `localStorage` (`allianceops-simulation`) for persistence across navigation
3. When disabled, `localStorage` is cleared and `activeCursor` returns `null`

### Client-Side Filtering
- **`filterMatchesByCursor(matches, cursor)`**: Marks qual matches beyond the cursor as unplayed (score = -1)
- **`getNextMatch(matches, teamKey, cursor)`**: Finds next unplayed match respecting cursor
- **`getTeamRecord(matches, teamKey, cursor)`**: Calculates W-L record up to cursor
- API endpoints are unchanged — all filtering happens in the browser

### Page Integration
- Briefing, path, event pages apply `filterMatchesByCursor` to their match data before processing
- Picklist is unaffected (EPA data is not match-cursor-dependent)
- Simulation page controls the context via `startSimulation()`/`stopSimulation()`

## Alternatives Considered
- **Server-side filtering**: Add `?cursor=N` to API endpoints. Would duplicate filtering logic and add API complexity for a feature that only affects the UI view.
- **URL-only (no context)**: Pass cursor as query params between pages. Fragile — requires all navigation links to carry the param. Doesn't survive page reloads without localStorage fallback.
- **Global state library (Zustand, Jotai)**: Over-engineered for a single piece of cross-page state. React Context is sufficient and avoids a new dependency.
- **Always-on simulation**: The cursor would be always present and set to "latest" by default. Rejected because this creates confusion — users should explicitly opt into simulation mode to avoid mistaking simulated state for live data.

## Consequences
- Simulation mode is opt-in: users must click "Start Simulation" on the sim page
- The amber simulation bar provides clear visual feedback that data is filtered
- Pages work normally (real-time data) when simulation is disabled
- Adding simulation awareness to a new page requires only importing `useSimulation()` and calling `filterMatchesByCursor()`
- This is the first React Context in the app — establishes the pattern for future cross-page state if needed
