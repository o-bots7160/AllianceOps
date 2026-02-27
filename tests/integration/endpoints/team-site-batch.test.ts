import { describe, it, expect } from 'vitest';
import { post, rawPost } from '../helpers/api-client';
import { TEAM_7160_NUMBER, TEAM_6328_NUMBER, YEAR } from '../helpers/test-data';

interface Envelope<T> {
  data: T;
  meta: { lastRefresh: string; stale: boolean; ttlClass: string };
}

describe('POST /api/teams/site-batch', () => {
  it('returns data for multiple teams', async () => {
    const res = await post<Envelope<Record<number, unknown>>>('/api/teams/site-batch', {
      teamNumbers: [TEAM_7160_NUMBER, TEAM_6328_NUMBER],
      year: YEAR,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('works with a single team', async () => {
    const res = await post<Envelope<Record<number, unknown>>>('/api/teams/site-batch', {
      teamNumbers: [TEAM_7160_NUMBER],
      year: YEAR,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('accepts exactly 10 teams', async () => {
    const teams = Array.from({ length: 10 }, (_, i) => TEAM_7160_NUMBER + i);
    const res = await post('/api/teams/site-batch', {
      teamNumbers: teams,
      year: YEAR,
    });
    expect(res.status).toBe(200);
  });

  it('rejects empty array', async () => {
    const res = await post('/api/teams/site-batch', {
      teamNumbers: [],
      year: YEAR,
    });
    expect(res.status).toBe(400);
  });

  it('rejects more than 10 teams', async () => {
    const teams = Array.from({ length: 11 }, (_, i) => TEAM_7160_NUMBER + i);
    const res = await post('/api/teams/site-batch', {
      teamNumbers: teams,
      year: YEAR,
    });
    expect(res.status).toBe(400);
  });

  it('rejects non-JSON body', async () => {
    const baseUrl = process.env.API_BASE_URL?.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/teams/site-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    });
    expect([400, 415]).toContain(response.status);
  });
});
