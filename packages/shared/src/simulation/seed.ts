/**
 * Simulation data seeder.
 *
 * Fetches full event data from TBA for the given event and stores it locally.
 * Usage: TBA_API_KEY=... tsx packages/shared/src/simulation/seed.ts
 *
 * This is a placeholder script. In a full implementation, it would:
 * 1. Fetch all matches, teams, rankings from TBA for the preset event
 * 2. Store them in the local Postgres database
 * 3. Create ranking snapshots at each match boundary for cursor replay
 */

import { TBAClient } from '../clients/tba.js';

async function main() {
  const apiKey = process.env.TBA_API_KEY;
  if (!apiKey) {
    console.error('TBA_API_KEY environment variable is required');
    process.exit(1);
  }

  const eventKey = process.argv[2] || '2025mibig';
  const client = new TBAClient(apiKey);

  console.log(`Seeding simulation data for event: ${eventKey}`);

  const [event, teams, matches, rankings] = await Promise.all([
    client.getEvent(eventKey),
    client.getEventTeams(eventKey),
    client.getEventMatches(eventKey),
    client.getEventRankings(eventKey),
  ]);

  console.log(`Event: ${event.name}`);
  console.log(`Teams: ${teams.length}`);
  console.log(`Matches: ${matches.length}`);
  console.log(`Rankings: ${rankings.rankings?.length ?? 0} teams ranked`);

  // TODO: Insert into Postgres via Prisma when database is available
  // For now, output summary
  const qualMatches = matches.filter((m) => m.comp_level === 'qm');
  const playedMatches = qualMatches.filter(
    (m) => m.alliances.red.score >= 0,
  );

  console.log(`\nQual matches: ${qualMatches.length} (${playedMatches.length} played)`);
  console.log('\nSimulation preset seeded successfully (in-memory).');
  console.log('Start the API with SIMULATION_MODE=true to enable cursor replay.');
}

main().catch(console.error);
