import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the clients and cache modules before importing the function
vi.mock('../../lib/clients.js', () => ({
  getStatboticsClient: vi.fn(() => ({
    getTeamSite: vi.fn((team: number, _year: number) =>
      Promise.resolve([
        {
          eventKey: '2025test',
          epa: { total: 30, auto: 10, teleop: 15, endgame: 5 },
          startEpa: 25,
          preElimEpa: 28,
          record: { wins: 5, losses: 2, ties: 0 },
        },
      ]),
    ),
  })),
}));

vi.mock('../../cache/index.js', () => ({
  cached: vi.fn(async (_key: string, _ttl: string, fetcher: () => Promise<unknown>) => {
    const data = await fetcher();
    return {
      data,
      meta: { lastRefresh: new Date().toISOString(), stale: false, ttlClass: 'SEMI_STATIC' },
    };
  }),
}));

// Mock Azure Functions app.http so importing the file doesn't fail
vi.mock('@azure/functions', () => ({
  app: {
    http: vi.fn(),
  },
}));

import { app } from '@azure/functions';
import '../../functions/team-site-batch.js';

type HandlerFn = (req: unknown, ctx: unknown) => Promise<{ status: number; jsonBody: unknown }>;

// Extract handler once at import time (before clearAllMocks wipes call records)
const calls = vi.mocked(app.http).mock.calls;
const batchCall = calls.find(([name]) => name === 'getTeamSiteBatch');
if (!batchCall) throw new Error('getTeamSiteBatch not registered');
const handler = batchCall[1].handler as HandlerFn;

function makeRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    params: {},
    query: new URLSearchParams(),
  };
}

const mockContext = {};

describe('getTeamSiteBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = {
      json: () => Promise.reject(new Error('bad json')),
      params: {},
      query: new URLSearchParams(),
    };
    const res = await handler(req, mockContext);
    expect(res.status).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns 400 when teamNumbers is empty', async () => {
    const res = await handler(makeRequest({ teamNumbers: [], year: 2025 }), mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when year is missing', async () => {
    const res = await handler(makeRequest({ teamNumbers: [100] }), mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 10 teams are requested', async () => {
    const teams = Array.from({ length: 11 }, (_, i) => 100 + i);
    const res = await handler(makeRequest({ teamNumbers: teams, year: 2025 }), mockContext);
    expect(res.status).toBe(400);
    const body = res.jsonBody as { error: string };
    expect(body.error).toBe('Validation failed');
  });

  it('returns site data for valid batch request', async () => {
    const res = await handler(
      makeRequest({ teamNumbers: [100, 200, 300], year: 2025 }),
      mockContext,
    );
    expect(res.status).toBe(200);
    const body = res.jsonBody as { data: Record<number, unknown[]>; meta: unknown };
    expect(Object.keys(body.data)).toHaveLength(3);
    expect(body.data[100]).toHaveLength(1);
    expect(body.data[200]).toHaveLength(1);
    expect(body.data[300]).toHaveLength(1);
  });

  it('returns exactly the teams requested (no more, no less)', async () => {
    const res = await handler(makeRequest({ teamNumbers: [7160], year: 2025 }), mockContext);
    expect(res.status).toBe(200);
    const body = res.jsonBody as { data: Record<string, unknown[]> };
    expect(Object.keys(body.data)).toEqual(['7160']);
  });

  it('accepts up to 10 teams', async () => {
    const teams = Array.from({ length: 10 }, (_, i) => 100 + i);
    const res = await handler(makeRequest({ teamNumbers: teams, year: 2025 }), mockContext);
    expect(res.status).toBe(200);
    const body = res.jsonBody as { data: Record<string, unknown[]> };
    expect(Object.keys(body.data)).toHaveLength(10);
  });
});
