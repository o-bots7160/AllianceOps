# Simulation Replay

AllianceOps includes a Simulation Replay feature that lets you "time-travel" through a past (or current) event match by match.

## How It Works

1. **Select an event** — Choose from preloaded presets or any event with TBA data
2. **Set the cursor** — Use the slider or step controls to set which match is "current"
3. **View state as-of N** — All dashboards show only data from matches 1..N

## Presets

### 2025 FIM District - Big Rapids (2025mibig)

- **Event Key:** `2025mibig`
- **Team:** 7160 (Ludington O-Bots)
- **Use case:** Step through the entire qual schedule as team 7160

## Seeding Simulation Data

To seed local Postgres with full event data:

```bash
# Ensure TBA_API_KEY is set in .env
pnpm seed:sim
```

Or for a specific event:

```bash
TBA_API_KEY=your_key tsx packages/shared/src/simulation/seed.ts 2025mibig
```

## Using Simulation Mode

1. Start the dev environment: `pnpm dev`
2. Navigate to the **Simulation** page
3. Select a preset or enter an event key
4. Use the cursor slider to step through matches
5. Switch to Briefing, Path, or Picklist pages — they'll reflect the cursor state

## Adding New Presets

Edit `packages/shared/src/simulation/presets/2025mibig.json` to add entries:

```json
{
  "id": "unique-id",
  "name": "Display Name",
  "eventKey": "tba_event_key",
  "year": 2025,
  "teamNumber": 7160,
  "description": "Description for this preset"
}
```
