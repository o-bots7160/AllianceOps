# ADR 034: Per-Match Scouting Entries

**Status**: Accepted
**Date**: 2026-04-23

## Context

ADR 033 established `ScoutingNote` as an aggregate-per-team record with game-specific fields captured as a JSON blob keyed by `ScoutingFieldDefinition.key`. It explicitly deferred per-match granularity:

> Per-match scouting entries: More granular but significantly more complex. Would require match selection UI, aggregation logic, and many more records. **Deferred as a future enhancement.**

In practice, scouts were being asked to mentally average counts (fuel scored per match, etc.) across many qualification and playoff matches, which is error-prone. We needed a way to let students enter raw counts for each match the target team plays and have the aggregate update automatically — without changing the database schema or giving up the adapter-driven, season-agnostic field model.

## Decision

### Adapter-driven per-match field type

Extend `ScoutingFieldDefinition` with:

- A new `type` variant `'per-match-number'` — a numeric value entered once per match. The stored value is a nested object keyed by TBA match key (e.g. `{ "2026misjo_qm12": 5 }`).
- An optional `readOnly?: boolean` flag — when true, the normal field input is rendered disabled.
- An optional `derivedFromKey?: string` — the key of another field this one is computed from.
- An optional `aggregation?: 'average'` — how to aggregate the source field (default `'average'`).

The 2026 REBUILT adapter uses this to turn `auto_fuel_observed` and `teleop_fuel_observed` into read-only derived fields (`derivedFromKey` pointing to new `auto_fuel_matches` / `teleop_fuel_matches` per-match fields). EPA cross-references (`epaKey`) stay on the aggregate fields so downstream code (TeamCard, picklist) is unchanged.

### Storage

Per-match values live inside the existing `ScoutingNote.data` JSON blob under the per-match field's key. No Prisma migration, no new endpoint, no change to the PUT contract — consistent with ADR 033's JSON-blob design.

### UI

A new `PerMatchTable` component renders all per-match fields for a target team in a single table: rows are every match (qual and playoff) that target team is scheduled in, sorted via `sortMatches`; columns are Match label plus one numeric input per per-match field. The scouting form groups these fields in a dedicated "Per-Match Observations" section instead of their individual category blocks (auto/teleop).

### Client-side aggregation

`useScoutingData.updatePerMatchValue(fieldKey, matchKey, value)` updates the nested map and, if any field's `derivedFromKey` matches `fieldKey`, recomputes its value as the average of the remaining numeric entries (blanks excluded, rounded to 2 decimals) and writes that to the aggregate key. When the per-match map is empty, the legacy aggregate value is preserved — the first per-match edit overwrites it.

## Alternatives Considered

- **Add a new Prisma table for per-match scouting rows**. Rejected: would require a migration for every season's per-match schema shift and would fork the read/write paths from the rest of the scouting UI. The JSON-blob approach scales to arbitrary per-match fields with zero schema churn.
- **Hardcode auton/teleop fuel in the UI**. Rejected: violates the GameDefinition adapter pattern (ADR 003). Other seasons could not reuse the mechanism without code changes.
- **Server-side aggregation** (compute the average on PUT). Rejected: adds a server-side dependency on game-definition semantics, and the UI still needs the live-updating average for feedback. Client-side aggregation keeps the API a dumb JSON store and matches ADR 033's design.
- **Only include qualification matches**. Rejected: playoff observations are equally useful for ranking and partner planning; the table filters by team-key membership so playoff rows simply appear as they're scheduled.

## Consequences

- Scouts enter raw counts; averages update live and are persisted alongside per-match data in the same PUT call.
- Legacy notes with only aggregate values continue to render — the per-match map is simply empty and the legacy value remains untouched until the first per-match edit.
- Any future season can opt in by declaring `type: 'per-match-number'` fields and marking an aggregate `readOnly` + `derivedFromKey`. No framework code changes needed.
- The aggregate's `epaKey` link is still the single cross-reference into EPA analytics, so TeamCard / picklist / briefing consumers are unaffected.
- Because aggregation is client-side, users on very old clients would not recompute averages; this is acceptable given the SWA auto-update model.

## Relationship to ADR 033

This ADR extends ADR 033 — it does not supersede it. The aggregate-per-team data model from ADR 033 is unchanged; this ADR only adds an optional per-match field type that lives inside the same `data` JSON blob.
