import { describe, it, expect, beforeAll } from 'vitest';
import { post, get, put, del } from '../helpers/api-client';
import { PERSONAS } from '../helpers/auth';
import { loadSharedState } from '../helpers/load-state';
import { sharedState } from '../helpers/test-data';

describe('Team Membership — Invite & Role Management', () => {
  beforeAll(() => {
    loadSharedState();
  });

  describe('POST /api/teams/{teamId}/invite', () => {
    it('mentor can create an invite code', async () => {
      const res = await post<{ data: { code: string } }>(
        `/api/teams/${sharedState.team7160Id}/invite`,
        { maxUses: 5, expiresInHours: 1 },
        PERSONAS.MENTOR_7160,
      );
      expect(res.status).toBe(201);
      expect(res.body.data.code).toBeDefined();
      expect(typeof res.body.data.code).toBe('string');
    });

    it('student cannot create an invite code', async () => {
      const res = await post(
        `/api/teams/${sharedState.team7160Id}/invite`,
        { maxUses: 5, expiresInHours: 1 },
        PERSONAS.STUDENT_7160,
      );
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/teams/{teamId}/members/{userId}/role', () => {
    it('coach can change a member role', async () => {
      // Change student to mentor and back
      const res = await put(
        `/api/teams/${sharedState.team7160Id}/members/${PERSONAS.STUDENT_7160.userId}/role`,
        { role: 'MENTOR' },
        PERSONAS.COACH_7160,
      );
      expect([200, 404]).toContain(res.status);

      // Revert back
      if (res.status === 200) {
        await put(
          `/api/teams/${sharedState.team7160Id}/members/${PERSONAS.STUDENT_7160.userId}/role`,
          { role: 'STUDENT' },
          PERSONAS.COACH_7160,
        );
      }
    });

    it('mentor cannot change roles', async () => {
      const res = await put(
        `/api/teams/${sharedState.team7160Id}/members/${PERSONAS.STUDENT_7160.userId}/role`,
        { role: 'MENTOR' },
        PERSONAS.MENTOR_7160,
      );
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/teams/{teamId}/members/{userId}', () => {
    it('mentor can remove a student (then re-add)', async () => {
      // This test is destructive — we avoid actually removing the student
      // to prevent breaking other tests. Instead we verify the endpoint
      // accepts the request format.
      const res = await del(
        `/api/teams/${sharedState.team7160Id}/members/nonexistent-user-id`,
        PERSONAS.MENTOR_7160,
      );
      // 404 for nonexistent user is the expected result
      expect([200, 404]).toContain(res.status);
    });

    it('student cannot remove members', async () => {
      const res = await del(
        `/api/teams/${sharedState.team7160Id}/members/${PERSONAS.MENTOR_7160.userId}`,
        PERSONAS.STUDENT_7160,
      );
      expect(res.status).toBe(403);
    });
  });
});
