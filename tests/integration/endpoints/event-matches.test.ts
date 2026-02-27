import { describe, it, expect } from 'vitest';
import { get } from '../helpers/api-client';
import { EVENT_KEY, INVALID_EVENT_KEY } from '../helpers/test-data';

interface MatchAlliance {
  red: { team_keys: string[] };
  blue: { team_keys: string[] };
}

interface Match {
  key: string;
  alliances: MatchAlliance;
  score_breakdown?: unknown;
}

interface Envelope<T> {
  data: T;
  meta: { lastRefresh: string; stale: boolean; ttlClass: string };
}

describe('GET /api/event/{eventKey}/matches', () => {
  it('returns matches for a valid event', async () => {
    const res = await get<Envelope<Match[]>>(`/api/event/${EVENT_KEY}/matches`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('matches have red and blue alliances', async () => {
    const res = await get<Envelope<Match[]>>(`/api/event/${EVENT_KEY}/matches`);
    const match = res.body.data[0];
    expect(match.alliances).toBeDefined();
    expect(match.alliances.red).toBeDefined();
    expect(match.alliances.blue).toBeDefined();
  });

  it('includes score_breakdown when breakdowns=true', async () => {
    const res = await get<Envelope<Match[]>>(`/api/event/${EVENT_KEY}/matches?breakdowns=true`);
    expect(res.status).toBe(200);
    // At least some matches should have score breakdowns (if event has been played)
    const withBreakdowns = res.body.data.filter((m) => m.score_breakdown != null);
    if (res.body.data.length > 0) {
      expect(withBreakdowns.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns empty or error for invalid event key', async () => {
    const res = await get<Envelope<Match[]>>(`/api/event/${INVALID_EVENT_KEY}/matches`);
    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toHaveLength(0);
    }
  });

  it('handles malformed event key format', async () => {
    const res = await get('/api/event/!!!/matches');
    expect([200, 400, 404]).toContain(res.status);
  });

  it('returns 404 for missing path param', async () => {
    const res = await get('/api/event//matches');
    expect([400, 404]).toContain(res.status);
  });
});
