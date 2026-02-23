# ADR-013: Global Event Setup Context and Unified Page Layout

## Status

Accepted

## Context

The dashboard had several UX issues:

1. **Disconnected state**: Team, year, and event selection controls were duplicated on the Event page and not shared with other pages. Each component using `useEventSetup()` maintained independent `useState` instances, so changing a value in one place didn't update another.

2. **No loading feedback**: When switching events or teams, most pages (briefing, path, planner, picklist) silently waited for data with no visual indication, making it appear unresponsive.

3. **Inconsistent page headers**: Each page had its own heading layout alongside a separate collapsible "About this page" InfoBox, creating visual inconsistency and taking extra vertical space.

## Decision

### Shared EventSetup via React Context

Convert `useEventSetup` from a standalone hook with `useState` + `localStorage` to a React Context (`EventSetupProvider`) added to the root `Providers` wrapper. All consumers now share a single state instance. The provider initializes with server-safe defaults and hydrates from `localStorage` in a `useEffect` to avoid SSR hydration mismatches.

### Global Header Controls

Add a `GlobalControls` component in the header bar between the logo and navigation. It provides compact, searchable `Combobox` dropdowns for team number, year, and event — scoped to the team's registered events via the `team/{teamNumber}/events` API endpoint.

### Loading Indicators

Add a shared `LoadingSpinner` component and use it on all data-fetching pages (briefing, path, planner, picklist, simulation, event) so users see immediate feedback when selections change and data is loading.

### Unified InfoBox with Page Heading

Merge the page heading (`<h2>`) into the `InfoBox` component. The heading text replaces the old "About this page" label, and an info icon (ℹ) on the right toggles the help content. Clicking either the heading or the icon expands/collapses the panel. A `headingExtra` prop supports auxiliary elements (alliance badges, action buttons) inline with the heading.

## Alternatives Considered

- **URL-based state (query params or path segments)**: Would enable shareable URLs but adds complexity for a tool primarily used by a single team at an event. localStorage persistence is simpler and sufficient.
- **Zustand or other state management library**: Considered but React Context is sufficient for this use case — the state is small, updates are infrequent, and there are no performance concerns.
- **Keeping separate page-level controls**: Would allow per-page overrides but creates confusion about which selection is "active" and requires users to re-enter the same values on every page.

## Consequences

- All pages reactively update when team/year/event changes in the header — no page navigation required.
- Event page is simplified to an event browser with "My Events" / "All Events" toggle, no longer the mandatory starting point.
- SSR hydration is safe: defaults render on server, localStorage values load on client mount.
- The `headingExtra` prop on InfoBox keeps page-specific elements (alliance color badges, export buttons) without breaking the unified layout.
- Future pages automatically get consistent heading + info toggle behavior by using `<InfoBox heading="...">`.
