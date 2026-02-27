import { describe, it, expect } from 'vitest';
import { get } from '../helpers/api-client';
import { EVENT_KEY, INVALID_EVENT_KEY } from '../helpers/test-data';

interface Ranking {
  rank: number;
  team_key: string;
}

interface Envelope<T> {
  data: T;
  meta: { lastRefresh: string; stale: boolean; ttlClass: string };
}

describe('GET /api/event/{eventKey}/rankings', () => {
  it('returns rankings for a valid event', async () => {
    const res = await get<Envelope<Ranking[]>>(`/api/event/${EVENT_KEY}/rankings`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('rankings have rank and team_key', async () => {
    const res = await get<Envelope<Ranking[]>>(`/api/event/${EVENT_KEY}/rankings`);
    if (res.body.data.length > 0) {
      const ranking = res.body.data[0];
      expect(ranking).toHaveProperty('rank');
      expect(ranking).toHaveProperty('team_key');
    }
  });

  it('rankings are correctly ordered', async () => {
    const res = await get<Envelope<Ranking[]>>(`/api/event/${EVENT_KEY}/rankings`);
    if (res.body.data.length > 1) {
      const ranks = res.body.data.map((r) => r.rank);
      for (let i = 1; i < ranks.length; i++) {
        expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
      }
    }
  });

  it('returns empty or error for invalid event key', async () => {
    const res = await get<Envelope<Ranking[]>>(`/api/event/${INVALID_EVENT_KEY}/rankings`);
    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toHaveLength(0);
    }
  });

  it('handles event with no rankings', async () => {
    const res = await get<Envelope<Ranking[]>>('/api/event/2025zzfake/rankings');
    expect([200, 400, 404]).toContain(res.status);
  });

  it('returns 404 for missing path param', async () => {
    const res = await get('/api/event//rankings');
    expect([400, 404]).toContain(res.status);
  });
});
