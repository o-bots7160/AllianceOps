import { describe, it, expect } from 'vitest';
import { get } from '../helpers/api-client';
import { YEAR, EVENT_KEY } from '../helpers/test-data';

interface EventItem {
  key: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface Envelope<T> {
  data: T;
  meta: { lastRefresh: string; stale: boolean; ttlClass: string };
}

describe('GET /api/events', () => {
  it('returns an array of events for a valid year', async () => {
    const res = await get<Envelope<EventItem[]>>(`/api/events?year=${YEAR}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('includes the expected event key', async () => {
    const res = await get<Envelope<EventItem[]>>(`/api/events?year=${YEAR}`);
    const keys = res.body.data.map((e) => e.key);
    expect(keys).toContain(EVENT_KEY);
  });

  it('events have required fields', async () => {
    const res = await get<Envelope<EventItem[]>>(`/api/events?year=${YEAR}`);
    const event = res.body.data[0];
    expect(event).toHaveProperty('key');
    expect(event).toHaveProperty('name');
    expect(event).toHaveProperty('start_date');
    expect(event).toHaveProperty('end_date');
  });

  it('returns 400 for missing year param', async () => {
    const res = await get('/api/events');
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-numeric year', async () => {
    const res = await get('/api/events?year=abc');
    expect(res.status).toBe(400);
  });

  it('returns empty array for very old year gracefully', async () => {
    const res = await get<Envelope<EventItem[]>>('/api/events?year=1800');
    // Should return 200 with empty data, or 400 — either is acceptable
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toHaveLength(0);
    }
  });
});
