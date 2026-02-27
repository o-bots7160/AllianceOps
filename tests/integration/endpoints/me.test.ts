import { describe, it, expect, beforeAll } from 'vitest';
import { get, rawGet } from '../helpers/api-client';
import { PERSONAS, forgeAuthHeader } from '../helpers/auth';
import { loadSharedState } from '../helpers/load-state';

describe('GET /api/me', () => {
  beforeAll(() => {
    loadSharedState();
  });

  it('returns user profile for authenticated user', async () => {
    const res = await get<{ data: { id: string; email: string; displayName: string } }>(
      '/api/me',
      PERSONAS.COACH_7160,
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
  });

  it('includes team memberships for coach', async () => {
    const res = await get<{
      data: { id: string; teams: Array<{ role: string; teamNumber: number }> };
    }>('/api/me', PERSONAS.COACH_7160);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.teams)).toBe(true);
    const team7160 = res.body.data.teams.find((t) => t.teamNumber === 7160);
    expect(team7160).toBeDefined();
    expect(team7160?.role).toBe('COACH');
  });

  it('returns user profile with email/displayName', async () => {
    const res = await get<{ data: { email: string; displayName: string } }>(
      '/api/me',
      PERSONAS.COACH_7160,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBeDefined();
  });

  it('returns 401 for no auth header', async () => {
    const res = await rawGet('/api/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for malformed x-ms-client-principal', async () => {
    const res = await rawGet('/api/me', {
      'x-ms-client-principal': 'not-valid-base64!!!',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for anonymous identity provider', async () => {
    const headers = forgeAuthHeader({
      userId: 'anonymous',
      userDetails: 'anonymous',
      identityProvider: 'anonymous',
    });
    const res = await rawGet('/api/me', headers);
    expect(res.status).toBe(401);
  });
});
