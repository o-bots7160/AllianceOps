# ADR-012: Game-Agnostic Duty Planner with EPA Breakdown

## Status

Accepted

## Context

The Duty Planner page was hardcoded with 2025 Reefscape-specific duty slots, game metrics, and template logic. This made it impossible to use for other FRC seasons without modifying the page component. Additionally, the Statbotics EPA breakdown data (game-specific component metrics like coral levels, speaker notes, fuel counts) was being discarded during normalization, limiting the planner's ability to make data-driven role assignments.

## Decision

1. **Extended `StatboticsEPA`** with an optional `breakdown?: Record<string, number>` field to carry the full game-specific EPA breakdown from Statbotics through to the frontend.

2. **Added `epaRankKeys?: string[]`** to `DutySlotDefinition` so each duty slot declares which EPA breakdown keys determine the best team for that role. This enables the generic template engine to auto-assign teams without season-specific logic.

3. **Made the Duty Planner fully game-agnostic** by sourcing all duty slots, templates, and game-specific metrics from `getAdapter(year)` at runtime. The planner renders whatever the active adapter defines.

4. **Added 2024 Crescendo and 2026 REBUILT adapters** alongside the existing 2025 Reefscape adapter to validate the pattern across seasons with different game mechanics (notes/speaker/amp vs coral/algae vs fuel/hub/tower).

5. **Configured Next.js webpack** with `extensionAlias` to resolve `.js` imports to `.ts` source files, enabling direct imports from the shared package source via the tsconfig path alias.

## Alternatives Considered

- **API endpoint for adapter data**: Serving game definitions from the API would avoid the webpack resolution issue but adds unnecessary network overhead for static configuration data.
- **Inline adapter data in the web app**: Would work but duplicates type definitions across packages, violating the monorepo shared-package pattern.
- **Hardcoded per-season planner pages**: Would require a new page component each year and violate the adapter pattern established in ADR-003.

## Consequences

- **Positive**: Adding a new FRC season requires only a new adapter file with duty slots, templates, metrics, and score breakdown mapping — the planner UI works automatically.
- **Positive**: Template auto-assignment uses real EPA breakdown data (e.g., coral L4 EPA, speaker notes EPA) to place teams in the roles they're statistically best at.
- **Positive**: Team strength cards show game-specific metrics alongside standard EPA bars, giving drive coaches actionable data for role assignment.
- **Negative**: The 2026 REBUILT adapter uses best-guess TBA field names since the season has just started. These will need updating once real TBA match data is available.
- **Negative**: The `extensionAlias` webpack config is a workaround for TypeScript ESM + Next.js source resolution. If Next.js improves ESM support, this can be removed.
