import { describe, it, expect, beforeAll } from 'vitest';
import { post, get, put } from '../helpers/api-client';
import { PERSONAS } from '../helpers/auth';
import { loadSharedState } from '../helpers/load-state';
import { sharedState } from '../helpers/test-data';

describe('Team Join Flow', () => {
  beforeAll(() => {
    loadSharedState();
  });

  describe('POST /api/teams/{teamId}/join-request', () => {
    it('authenticated user can create a join request', async () => {
      const res = await post(
        `/api/teams/${sharedState.team6328Id}/join-request`,
        undefined,
        PERSONAS.UNAUTHED_USER,
      );
      // 200/201 = created, 409 = already requested/member
      expect([200, 201, 409]).toContain(res.status);
    });
  });

  describe('GET /api/teams/{teamId}/join-requests', () => {
    it('mentor can list pending join requests', async () => {
      // Coach of 6328 lists requests
      const res = await get<{ data: unknown[] }>(
        `/api/teams/${sharedState.team6328Id}/join-requests`,
        PERSONAS.COACH_6328,
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('student cannot list join requests', async () => {
      const res = await get(
        `/api/teams/${sharedState.team7160Id}/join-requests`,
        PERSONAS.STUDENT_7160,
      );
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/teams/{teamId}/join-requests/{requestId}', () => {
    it('approving a valid request works', async () => {
      // First create a join request if possible
      await post(
        `/api/teams/${sharedState.team6328Id}/join-request`,
        undefined,
        PERSONAS.UNAUTHED_USER,
      );

      // List requests to get the ID
      const list = await get<{ data: Array<{ id: string }> }>(
        `/api/teams/${sharedState.team6328Id}/join-requests`,
        PERSONAS.COACH_6328,
      );

      if (list.status === 200 && list.body.data.length > 0) {
        const requestId = list.body.data[0].id;
        const res = await put(
          `/api/teams/${sharedState.team6328Id}/join-requests/${requestId}`,
          { action: 'approve', role: 'STUDENT' },
          PERSONAS.COACH_6328,
        );
        expect([200, 409]).toContain(res.status);
      }
    });
  });

  describe('POST /api/teams/join/{code} (already a member)', () => {
    it('returns 409 when already a member', async () => {
      // Coach is already a member of team 7160
      const res = await post(
        `/api/teams/join/${sharedState.inviteCode7160}`,
        undefined,
        PERSONAS.COACH_7160,
      );
      expect(res.status).toBe(409);
    });

    it('returns 404 for invalid invite code', async () => {
      const res = await post('/api/teams/join/INVALIDCODE999', undefined, PERSONAS.UNAUTHED_USER);
      expect(res.status).toBe(404);
    });
  });
});
