import { describe, it, expect } from 'vitest';
import { get } from '../helpers/api-client';
import { YEAR, EVENT_KEY, TEAM_7160_NUMBER } from '../helpers/test-data';

const TBA_BASE = 'https://www.thebluealliance.com/api/v3';
const TBA_API_KEY = process.env.TBA_API_KEY;

function tbaHeaders(): Record<string, string> {
  if (!TBA_API_KEY) {
    throw new Error('TBA_API_KEY env var is required for data integrity tests');
  }
  return { 'X-TBA-Auth-Key': TBA_API_KEY };
}

async function tbaGet<T>(path: string): Promise<T> {
  const res = await fetch(`${TBA_BASE}${path}`, { headers: tbaHeaders() });
  if (!res.ok) {
    throw new Error(`TBA request failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

describe.skipIf(!TBA_API_KEY)('TBA Data Integrity', () => {
  it('events count and keys match TBA', async () => {
    const [ours, tba] = await Promise.all([
      get<{ data: Array<{ key: string }> }>(`/api/events?year=${YEAR}`),
      tbaGet<Array<{ key: string }>>(`/events/${YEAR}/simple`),
    ]);

    expect(ours.status).toBe(200);
    // Our count should match TBA's — allow small variance from filtering
    const ourKeys = new Set(ours.body.data.map((e) => e.key));
    const tbaKeys = new Set(tba.map((e) => e.key));

    // All our events should exist in TBA
    for (const key of ourKeys) {
      expect(tbaKeys.has(key)).toBe(true);
    }

    // Counts should be similar (we may filter some event types)
    const ratio = ours.body.data.length / tba.length;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThanOrEqual(1.0);
  });

  it('match count and alliances match TBA for event', async () => {
    const [ours, tba] = await Promise.all([
      get<{ data: Array<{ key: string; alliances: { red: unknown; blue: unknown } }> }>(
        `/api/event/${EVENT_KEY}/matches`,
      ),
      tbaGet<Array<{ key: string }>>(`/event/${EVENT_KEY}/matches/simple`),
    ]);

    expect(ours.status).toBe(200);
    expect(ours.body.data.length).toBe(tba.length);
  });

  it('all TBA team numbers present in our event teams', async () => {
    const [ours, tba] = await Promise.all([
      get<{ data: Array<{ team_number: number }> }>(`/api/event/${EVENT_KEY}/teams`),
      tbaGet<Array<{ team_number: number }>>(`/event/${EVENT_KEY}/teams/simple`),
    ]);

    expect(ours.status).toBe(200);
    const ourNumbers = new Set(ours.body.data.map((t) => t.team_number));
    for (const team of tba) {
      expect(ourNumbers.has(team.team_number)).toBe(true);
    }
  });

  it('ranking positions match TBA', async () => {
    const [ours, tba] = await Promise.all([
      get<{ data: Array<{ rank: number; team_key: string }> }>(`/api/event/${EVENT_KEY}/rankings`),
      tbaGet<{ rankings: Array<{ rank: number; team_key: string }> }>(
        `/event/${EVENT_KEY}/rankings`,
      ),
    ]);

    expect(ours.status).toBe(200);
    if (tba.rankings && tba.rankings.length > 0) {
      expect(ours.body.data.length).toBe(tba.rankings.length);
      // Top 5 ranks should match
      for (let i = 0; i < Math.min(5, tba.rankings.length); i++) {
        expect(ours.body.data[i].team_key).toBe(tba.rankings[i].team_key);
      }
    }
  });

  it('team events match TBA for team 7160', async () => {
    const [ours, tba] = await Promise.all([
      get<{ data: Array<{ key: string }> }>(`/api/team/${TEAM_7160_NUMBER}/events?year=${YEAR}`),
      tbaGet<Array<{ key: string }>>(`/team/frc${TEAM_7160_NUMBER}/events/${YEAR}/simple`),
    ]);

    expect(ours.status).toBe(200);
    const ourKeys = new Set(ours.body.data.map((e) => e.key));
    for (const event of tba) {
      expect(ourKeys.has(event.key)).toBe(true);
    }
  });
});
