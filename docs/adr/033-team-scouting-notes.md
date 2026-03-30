# ADR 033: Team Scouting Notes

**Status**: Accepted
**Date**: 2026-03-30

## Context

AllianceOps uses TBA and Statbotics data for quantitative team analysis, but the team needed a way to capture **qualitative observations** from match scouting — things like robot behavior, climb reliability, and fuel acquisition patterns that don't show up in EPA numbers. Previously, the team used a Google Forms workflow which was disconnected from the rest of the application.

We needed a system that:

- Integrates scouting observations directly into the existing team analysis workflow (TeamCard, picklist)
- Supports game-specific scouting fields that change each season (consistent with the GameDefinition adapter pattern)
- Shares scouting data in real-time among team members (consistent with planner and picklist)
- Keeps scouting data private to each team

## Decision

### Data Model

- **One scouting record per analyzed team per event** (aggregate, not per-match). The `ScoutingNote` Prisma model stores team-scoped observations with:
  - `teamId` + `eventKey` + `targetTeamNumber` as unique key
  - `notes` (freeform text)
  - `data` (JSON object keyed by `ScoutingFieldDefinition.key`)
- Tags are managed separately via `PicklistEntry.tags` — the scouting UI reads/writes them through the picklist tags API.
- JSON `data` column allows game-specific fields without schema migrations each season.

### Adapter-Driven Form Fields

- Added `ScoutingFieldDefinition` type and optional `scoutingFields` array to the `GameDefinition` interface.
- Each field has a `key`, `label`, `type` ('number' | 'boolean' | 'select' | 'multi-select' | 'text'), `category` ('auto' | 'teleop' | 'endgame'), and optional `epaKey` for cross-referencing with EPA breakdown values.
- The 2026 REBUILT adapter defines scouting fields aligned to its EPA metrics: auto fuel, teleop fuel, neutral zone driving, fuel source, climb level, etc.
- The scouting form component renders fields dynamically from the adapter, grouped by category.

### API Endpoints

Three team-scoped endpoints following the existing patterns:

- `GET /teams/{teamId}/event/{eventKey}/scouting` — list summaries
- `GET /teams/{teamId}/event/{eventKey}/scouting/{targetTeamNumber}` — full note
- `PUT /teams/{teamId}/event/{eventKey}/scouting/{targetTeamNumber}` — upsert with SignalR broadcast

### Navigation & UI

- New `/scouting/` route added to the main navigation bar (between Picklist and Sim).
- Team list view (table) showing all event teams with scouting status badges.
- Per-team view with side-by-side layout: TeamCard (left) + scouting form (right), stacking on mobile.
- Deep linking via `?team=NNNN` URL parameter.
- TeamCard gains a collapsible "Scouting Notes" section showing tags, notes preview, and a link to the full analysis.

### Real-Time Sync

- Same pattern as picklist and planner: SignalR `scouting-updated` messages, autosave with 2s debounce, 30s polling fallback.

## Alternatives Considered

1. **Per-match scouting entries**: More granular but significantly more complex. Would require match selection UI, aggregation logic, and many more records. Deferred as a future enhancement.
2. **Separate schema columns per field**: Would require migrations each season. JSON `data` column provides flexibility at the cost of type safety (mitigated by adapter-defined field definitions).
3. **Embedding scouting form in the TeamCard modal**: Too cramped for the form; dedicated page provides better UX.

## Consequences

- **Positive**: Scouting observations are now integrated with EPA data, making alliance selection more informed. Tags from scouting appear in the picklist team card.
- **Positive**: Adapter-driven fields ensure the system works for any future FRC season without schema changes.
- **Positive**: Real-time sync keeps all team members seeing the latest scouting data.
- **Trade-off**: Per-team aggregate model loses per-match granularity. Can be extended later if needed.
- **Migration**: Adds `ScoutingNote` table with foreign key to `Team`.
