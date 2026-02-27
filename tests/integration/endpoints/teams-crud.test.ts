import { describe, it, expect, beforeAll } from 'vitest';
import { get, post, put, rawGet } from '../helpers/api-client';
import { PERSONAS } from '../helpers/auth';
import { loadSharedState } from '../helpers/load-state';
import { sharedState, TEAM_7160_NUMBER } from '../helpers/test-data';

describe('Team CRUD', () => {
  beforeAll(() => {
    loadSharedState();
  });

  describe('GET /api/teams/{teamId}', () => {
    it('returns team with members for team member', async () => {
      const res = await get<{ data: { id: string; teamNumber: number; members: unknown[] } }>(
        `/api/teams/${sharedState.team7160Id}`,
        PERSONAS.COACH_7160,
      );
      expect(res.status).toBe(200);
      expect(res.body.data.teamNumber).toBe(TEAM_7160_NUMBER);
      expect(Array.isArray(res.body.data.members)).toBe(true);
    });

    it('returns 403 for non-member', async () => {
      const res = await get(`/api/teams/${sharedState.team7160Id}`, PERSONAS.COACH_6328);
      expect(res.status).toBe(403);
    });

    it('returns 404 for nonexistent team', async () => {
      const res = await get('/api/teams/00000000-0000-0000-0000-000000000000', PERSONAS.COACH_7160);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/teams/{teamId}', () => {
    it('allows coach to update team name', async () => {
      const newName = `Test Team 7160 ${Date.now()}`;
      const res = await put(
        `/api/teams/${sharedState.team7160Id}`,
        { name: newName },
        PERSONAS.COACH_7160,
      );
      expect(res.status).toBe(200);
    });

    it('rejects update by student', async () => {
      const res = await put(
        `/api/teams/${sharedState.team7160Id}`,
        { name: 'Hacked Name' },
        PERSONAS.STUDENT_7160,
      );
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/teams/mine', () => {
    it('returns team memberships for authenticated user', async () => {
      const res = await get<{ data: unknown[] }>('/api/teams/mine', PERSONAS.COACH_7160);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/teams/lookup/{teamNumber}', () => {
    it('finds team by number', async () => {
      const res = await get<{ data: { id: string; teamNumber: number } }>(
        `/api/teams/lookup/${TEAM_7160_NUMBER}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.data.teamNumber).toBe(TEAM_7160_NUMBER);
    });
  });

  describe('POST /api/teams (duplicate)', () => {
    it('returns 409 for duplicate team number', async () => {
      const res = await post(
        '/api/teams',
        { teamNumber: TEAM_7160_NUMBER, name: 'Duplicate' },
        PERSONAS.UNAUTHED_USER,
      );
      expect(res.status).toBe(409);
    });

    it('returns 401 with no auth', async () => {
      const res = await rawGet('/api/teams/mine');
      expect(res.status).toBe(401);
    });
  });
});
