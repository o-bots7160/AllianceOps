import { describe, it, expect } from 'vitest';
import { get } from '../helpers/api-client';
import {
  TEAM_7160_NUMBER,
  TEAM_6328_NUMBER,
  YEAR,
  EVENT_KEY,
  INVALID_TEAM_NUMBER,
} from '../helpers/test-data';

interface TeamEvent {
  key: string;
  name: string;
  start_date: string;
}

interface Envelope<T> {
  data: T;
  meta: { lastRefresh: string; stale: boolean; ttlClass: string };
}

describe('GET /api/team/{teamNumber}/events', () => {
  it('returns events for team 7160 including expected event', async () => {
    const res = await get<Envelope<TeamEvent[]>>(
      `/api/team/${TEAM_7160_NUMBER}/events?year=${YEAR}`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const keys = res.body.data.map((e) => e.key);
    expect(keys).toContain(EVENT_KEY);
  });

  it('events have required fields', async () => {
    const res = await get<Envelope<TeamEvent[]>>(
      `/api/team/${TEAM_7160_NUMBER}/events?year=${YEAR}`,
    );
    if (res.body.data.length > 0) {
      const event = res.body.data[0];
      expect(event).toHaveProperty('key');
      expect(event).toHaveProperty('name');
      expect(event).toHaveProperty('start_date');
    }
  });

  it('returns events for team 6328', async () => {
    const res = await get<Envelope<TeamEvent[]>>(
      `/api/team/${TEAM_6328_NUMBER}/events?year=${YEAR}`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns empty or error for invalid team number', async () => {
    const res = await get<Envelope<TeamEvent[]>>(
      `/api/team/${INVALID_TEAM_NUMBER}/events?year=${YEAR}`,
    );
    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toHaveLength(0);
    }
  });

  it('returns 400 for missing year', async () => {
    const res = await get(`/api/team/${TEAM_7160_NUMBER}/events`);
    expect(res.status).toBe(400);
  });

  it('returns empty for team with no events in year', async () => {
    const res = await get<Envelope<TeamEvent[]>>(`/api/team/${TEAM_7160_NUMBER}/events?year=1990`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toHaveLength(0);
    }
  });
});
