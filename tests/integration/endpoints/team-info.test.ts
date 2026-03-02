import { describe, it, expect } from 'vitest';
import { get } from '../helpers/api-client';
import { TEAM_7160_NUMBER, INVALID_TEAM_NUMBER } from '../helpers/test-data';

interface Envelope<T> {
  data: T;
  meta: { lastRefresh: string; stale: boolean; ttlClass: string };
}

interface TeamInfo {
  team_number: number;
  nickname: string;
  key: string;
}

describe('GET /api/team/{teamNumber}/info', () => {
  it('returns info for team 7160', async () => {
    const res = await get<Envelope<TeamInfo>>(`/api/team/${TEAM_7160_NUMBER}/info`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.team_number).toBe(TEAM_7160_NUMBER);
  });

  it('includes team nickname', async () => {
    const res = await get<Envelope<TeamInfo>>(`/api/team/${TEAM_7160_NUMBER}/info`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.nickname).toBe('string');
    expect(res.body.data.nickname.length).toBeGreaterThan(0);
  });

  it('meta has cache fields with STATIC ttl', async () => {
    const res = await get<Envelope<TeamInfo>>(`/api/team/${TEAM_7160_NUMBER}/info`);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta).toHaveProperty('lastRefresh');
    expect(res.body.meta.ttlClass).toBe('STATIC');
  });

  it('returns error or fallback for invalid team number', async () => {
    const res = await get(`/api/team/${INVALID_TEAM_NUMBER}/info`);
    expect([200, 400, 404, 502]).toContain(res.status);
  });
});
