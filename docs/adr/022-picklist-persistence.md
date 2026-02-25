# ADR-022: Picklist Persistence

## Status

Accepted

## Context

The picklist page ranks all teams at an event by EPA-derived scores and allows users to annotate teams with tags, notes, and exclusions. Previously, all annotations were client-side only — lost on page refresh and not shareable between team members. During alliance selection at events, the picklist is critical shared intelligence that the entire drive team needs access to in real-time.

## Decision

Persist picklist annotations to PostgreSQL via team-scoped API endpoints. The existing `Picklist` and `PicklistEntry` Prisma models (created in the init migration) are used, with a new unique constraint on `(teamId, eventKey, name)` to enable upsert lookups.

### API Endpoints

- `GET /api/teams/{teamId}/event/{eventKey}/picklist` — Load the team's saved picklist for an event
- `PUT /api/teams/{teamId}/event/{eventKey}/picklist` — Upsert all picklist entries (delete+recreate pattern, matching `MatchPlan`)

Both endpoints require team membership via `requireTeamMember()`.

### Data Model

Each team has one "default" picklist per event. The `Picklist` row stores metadata; `PicklistEntry` rows store per-team annotations (rank, tags as JSON, notes, excluded flag). EPA scores are always computed client-side from live data — only the user-edited fields are persisted.

### Frontend Behavior

- On page load, EPA-based rankings are generated from the teams API, then saved annotations are merged on top
- A "Save Picklist" button persists the current state; non-team-members see a disabled "Join Team to Save" button
- The page polls the API every 30 seconds to pick up changes from teammates (polling pauses while there are unsaved local changes)
- Status indicators show "Unsaved changes", "Saving...", and "Last saved" timestamps

## Alternatives Considered

1. **localStorage only** — Simple but not shareable; data lost if browser cache is cleared. This was the prior state.
2. **Auto-save on every change** — Considered, but debounce complexity and conflict resolution with multiple editors made explicit save more predictable.
3. **WebSocket real-time sync** — Overkill for the use case; polling every 30s is sufficient for a small team editing during alliance selection.

## Consequences

- Team members can now share picklist annotations in real-time during events
- The delete+recreate upsert pattern is simple but means the full entry set is sent on every save
- Polling respects the dirty flag to avoid overwriting unsaved local changes
- Non-team-members can still view the EPA rankings and export CSV, but cannot edit or save
