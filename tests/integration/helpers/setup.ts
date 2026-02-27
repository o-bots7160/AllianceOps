/**
 * Global setup — runs once before all integration tests.
 *
 * 1. Health check with retry (FA cold start on Flex Consumption)
 * 2. Bootstrap test teams (7160 + 6328)
 * 3. Bootstrap team members (mentor, student) for role-based tests
 */

import { PERSONAS } from './auth';
import { get, post } from './api-client';
import { TEAM_7160_NUMBER, TEAM_6328_NUMBER, sharedState } from './test-data';

const MAX_HEALTH_RETRIES = 30;
const HEALTH_RETRY_DELAY_MS = 2000;

async function waitForHealthy(): Promise<void> {
  let connectionRefusedCount = 0;
  for (let i = 0; i < MAX_HEALTH_RETRIES; i++) {
    try {
      const res = await get('/api/health');
      if (res.status === 200) {
        console.log(`Health check passed on attempt ${i + 1}`);
        return;
      }
    } catch (err: unknown) {
      // If the server is refusing connections, fail fast after a few tries
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ECONNREFUSED')) {
        connectionRefusedCount++;
        if (connectionRefusedCount >= 3) {
          throw new Error(
            `API server is not running at ${process.env.API_BASE_URL}. ` +
              'Start it with "pnpm dev" in another terminal before running integration tests.',
          );
        }
      }
    }
    if (i < MAX_HEALTH_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, HEALTH_RETRY_DELAY_MS));
    }
  }
  throw new Error(
    `Function App not healthy after ${(MAX_HEALTH_RETRIES * HEALTH_RETRY_DELAY_MS) / 1000}s`,
  );
}

async function bootstrapTeam(
  teamNumber: number,
  coachPersona: (typeof PERSONAS)[keyof typeof PERSONAS],
): Promise<string> {
  // Check if team already exists
  const lookup = await get<{ data: { id: string } | null }>(`/api/teams/lookup/${teamNumber}`);
  if (lookup.status === 200 && lookup.body?.data) {
    console.log(`Team ${teamNumber} already exists (id: ${lookup.body.data.id})`);
    return lookup.body.data.id;
  }

  // Create team as coach
  const create = await post<{ data: { id: string } }>(
    '/api/teams',
    { teamNumber, name: `Test Team ${teamNumber}` },
    coachPersona,
  );

  if (create.status !== 201 && create.status !== 200) {
    throw new Error(
      `Failed to create team ${teamNumber}: ${create.status} ${JSON.stringify(create.body)}`,
    );
  }

  console.log(`Created team ${teamNumber} (id: ${create.body.data.id})`);
  return create.body.data.id;
}

async function bootstrapMembers(teamId: string): Promise<string> {
  // Coach creates an invite code
  const invite = await post<{ data: { code: string } }>(
    `/api/teams/${teamId}/invite`,
    { maxUses: 10, expiresInHours: 1 },
    PERSONAS.COACH_7160,
  );

  if (invite.status !== 200 && invite.status !== 201) {
    throw new Error(
      `Failed to create invite code: ${invite.status} ${JSON.stringify(invite.body)}`,
    );
  }

  const code = invite.body.data.code;
  console.log(`Created invite code for team 7160: ${code}`);

  // Mentor joins
  const mentorJoin = await post(`/api/teams/join/${code}`, undefined, PERSONAS.MENTOR_7160);
  if (mentorJoin.status !== 200 && mentorJoin.status !== 201) {
    // May already be a member from a previous run — not fatal
    console.warn(`Mentor join returned ${mentorJoin.status} (may already be a member)`);
  }

  // Student joins
  const studentJoin = await post(`/api/teams/join/${code}`, undefined, PERSONAS.STUDENT_7160);
  if (studentJoin.status !== 200 && studentJoin.status !== 201) {
    console.warn(`Student join returned ${studentJoin.status} (may already be a member)`);
  }

  return code;
}

export async function setup(): Promise<void> {
  console.log('=== Global Setup: Integration Tests ===');

  await waitForHealthy();

  // Bootstrap teams
  sharedState.team7160Id = await bootstrapTeam(TEAM_7160_NUMBER, PERSONAS.COACH_7160);
  sharedState.team6328Id = await bootstrapTeam(TEAM_6328_NUMBER, PERSONAS.COACH_6328);

  // Bootstrap members for team 7160
  sharedState.inviteCode7160 = await bootstrapMembers(sharedState.team7160Id);

  // Write shared state to a temp file so test workers can read it
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const stateDir = join(import.meta.dirname, '..', '.test-state');
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'shared-state.json'), JSON.stringify(sharedState));

  console.log('=== Global Setup Complete ===');
}

export async function teardown(): Promise<void> {
  console.log('=== Global Teardown: Integration Tests ===');
  // Cleanup is minimal — the entire rg-aops-test resource group gets destroyed after the run.
  // We only clean up temp state files.
  const { rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const stateDir = join(import.meta.dirname, '..', '.test-state');
  rmSync(stateDir, { recursive: true, force: true });
  console.log('=== Global Teardown Complete ===');
}
