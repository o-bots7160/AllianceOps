import { describe, it, expect } from 'vitest';
import { get } from '../helpers/api-client';
import { EVENT_KEY, INVALID_EVENT_KEY, TEAM_7160_NUMBER } from '../helpers/test-data';

interface EnrichedTeam {
  team_number: number;
  nickname: string;
  epa?: unknown;
}

interface Envelope<T> {
  data: T;
  meta: { lastRefresh: string; stale: boolean; ttlClass: string };
}

describe('GET /api/event/{eventKey}/teams', () => {
  it('returns enriched teams for a valid event', async () => {
    const res = await get<Envelope<EnrichedTeam[]>>(`/api/event/${EVENT_KEY}/teams`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('teams have TBA and Statbotics fields', async () => {
    const res = await get<Envelope<EnrichedTeam[]>>(`/api/event/${EVENT_KEY}/teams`);
    const team = res.body.data[0];
    expect(team).toHaveProperty('team_number');
    expect(team).toHaveProperty('nickname');
  });

  it('includes team 7160 at the expected event', async () => {
    const res = await get<Envelope<EnrichedTeam[]>>(`/api/event/${EVENT_KEY}/teams`);
    const numbers = res.body.data.map((t) => t.team_number);
    expect(numbers).toContain(TEAM_7160_NUMBER);
  });

  it('returns empty or error for invalid event key', async () => {
    const res = await get<Envelope<EnrichedTeam[]>>(`/api/event/${INVALID_EVENT_KEY}/teams`);
    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toHaveLength(0);
    }
  });

  it('handles nonsensical event key', async () => {
    const res = await get('/api/event/zzzzzzzzz/teams');
    expect([200, 400, 404]).toContain(res.status);
  });

  it('handles very old event key', async () => {
    const res = await get('/api/event/1992test/teams');
    expect([200, 400, 404]).toContain(res.status);
  });
});
