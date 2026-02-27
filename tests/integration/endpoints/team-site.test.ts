import { describe, it, expect } from 'vitest';
import { get } from '../helpers/api-client';
import { TEAM_7160_NUMBER, YEAR, INVALID_TEAM_NUMBER } from '../helpers/test-data';

interface Envelope<T> {
  data: T;
  meta: { lastRefresh: string; stale: boolean; ttlClass: string };
}

describe('GET /api/team/{teamNumber}/site', () => {
  it('returns site data for team 7160', async () => {
    const res = await get<Envelope<unknown>>(`/api/team/${TEAM_7160_NUMBER}/site?year=${YEAR}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('data has expected structure', async () => {
    const res = await get<Envelope<Record<string, unknown>>>(
      `/api/team/${TEAM_7160_NUMBER}/site?year=${YEAR}`,
    );
    expect(res.status).toBe(200);
    expect(typeof res.body.data).toBe('object');
  });

  it('meta has cache fields', async () => {
    const res = await get<Envelope<unknown>>(`/api/team/${TEAM_7160_NUMBER}/site?year=${YEAR}`);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta).toHaveProperty('lastRefresh');
    expect(res.body.meta).toHaveProperty('ttlClass');
  });

  it('returns empty or error for invalid team number', async () => {
    const res = await get(`/api/team/${INVALID_TEAM_NUMBER}/site?year=${YEAR}`);
    expect([200, 400, 404]).toContain(res.status);
  });

  it('handles far-future year', async () => {
    const res = await get(`/api/team/${TEAM_7160_NUMBER}/site?year=2099`);
    expect([200, 400, 404]).toContain(res.status);
  });

  it('returns 400 for missing year', async () => {
    const res = await get(`/api/team/${TEAM_7160_NUMBER}/site`);
    expect(res.status).toBe(400);
  });
});
