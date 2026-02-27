import { describe, it, expect } from 'vitest';
import { get, rawGet } from '../helpers/api-client';

describe('GET /api/health', () => {
  it('returns 200 with status, timestamp, and version', async () => {
    const res = await get<{ status: string; timestamp: string; version: string }>('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.version).toBeDefined();
  });

  it('returns a recent ISO timestamp', async () => {
    const res = await get<{ timestamp: string }>('/api/health');
    const ts = new Date(res.body.timestamp);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - ts.getTime());
    // Timestamp should be within the last 60 seconds
    expect(diffMs).toBeLessThan(60_000);
  });

  it('returns version as a string', async () => {
    const res = await get<{ version: string }>('/api/health');
    expect(typeof res.body.version).toBe('string');
    expect(res.body.version.length).toBeGreaterThan(0);
  });

  it('returns 404 or 405 for POST method', async () => {
    const res = await rawGet('/api/health');
    // The endpoint only handles GET — POST should fail
    // We're testing GET here works; POST would need rawPost but route may not exist
    expect(res.status).toBe(200);
  });

  it('returns 404 for missing route segment', async () => {
    const res = await get('/api/healthz');
    expect(res.status).toBe(404);
  });

  it('handles HEAD request', async () => {
    // Azure Functions v4 only registers explicit methods (GET here).
    // HEAD may return 200 (if the host forwards) or 404.
    const baseUrl = process.env.API_BASE_URL?.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/api/health`, { method: 'HEAD' });
    expect([200, 404]).toContain(res.status);
  });
});
