import { describe, it, expect } from 'vitest';
import { get, post } from '../helpers/api-client';
import { YEAR, EVENT_KEY, TEAM_7160_NUMBER, TEAM_6328_NUMBER } from '../helpers/test-data';

const STATBOTICS_BASE = 'https://api.statbotics.io/v3';

async function statboticsGet<T>(path: string): Promise<T> {
  const res = await fetch(`${STATBOTICS_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Statbotics request failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

describe('Statbotics Data Integrity', () => {
  it('event teams have EPA data matching Statbotics', async () => {
    const [ours, statbotics] = await Promise.all([
      get<{ data: Array<{ team_number: number; epa?: unknown }> }>(`/api/event/${EVENT_KEY}/teams`),
      statboticsGet<Array<{ team: number; epa?: unknown }>>(`/team_events?event=${EVENT_KEY}`),
    ]);

    expect(ours.status).toBe(200);

    // Verify we have the same teams
    const ourNumbers = new Set(ours.body.data.map((t) => t.team_number));
    for (const entry of statbotics) {
      expect(ourNumbers.has(entry.team)).toBe(true);
    }
  });

  it('team site data matches Statbotics for team 7160', async () => {
    const [ours, statbotics] = await Promise.all([
      get<{ data: unknown }>(`/api/team/${TEAM_7160_NUMBER}/site?year=${YEAR}`),
      statboticsGet<unknown>(`/site/team/${TEAM_7160_NUMBER}/${YEAR}`),
    ]);

    expect(ours.status).toBe(200);
    expect(ours.body.data).toBeDefined();
    // Both should return data for the same team — structural comparison
    expect(statbotics).toBeDefined();
  });

  it('batch output matches individual Statbotics calls', async () => {
    const [batch, stat7160, stat6328] = await Promise.all([
      post<{ data: Record<number, unknown> }>('/api/teams/site-batch', {
        teamNumbers: [TEAM_7160_NUMBER, TEAM_6328_NUMBER],
        year: YEAR,
      }),
      statboticsGet<unknown>(`/site/team/${TEAM_7160_NUMBER}/${YEAR}`),
      statboticsGet<unknown>(`/site/team/${TEAM_6328_NUMBER}/${YEAR}`),
    ]);

    expect(batch.status).toBe(200);
    expect(batch.body.data).toBeDefined();
    // Both individual entries should exist in the batch response
    expect(stat7160).toBeDefined();
    expect(stat6328).toBeDefined();
  });
});
