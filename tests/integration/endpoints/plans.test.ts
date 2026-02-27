import { describe, it, expect, beforeAll } from 'vitest';
import { get, put, rawGet } from '../helpers/api-client';
import { PERSONAS } from '../helpers/auth';
import { loadSharedState } from '../helpers/load-state';
import { sharedState, EVENT_KEY } from '../helpers/test-data';

const MATCH_KEY = `${EVENT_KEY}_qm1`;

describe('Match Plans CRUD', () => {
  beforeAll(() => {
    loadSharedState();
  });

  describe('PUT /api/teams/{teamId}/event/{eventKey}/match/{matchKey}/plan', () => {
    it('creates a new plan', async () => {
      const res = await put(
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/match/${MATCH_KEY}/plan`,
        {
          duties: [{ slotKey: 'slot1', teamNumber: 7160, notes: 'Test duty' }],
        },
        PERSONAS.COACH_7160,
      );
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('GET /api/teams/{teamId}/event/{eventKey}/match/{matchKey}/plan', () => {
    it('retrieves the plan with duties', async () => {
      const res = await get<{ data: { duties: unknown[]; teamId: string } | null }>(
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/match/${MATCH_KEY}/plan`,
        PERSONAS.COACH_7160,
      );
      expect(res.status).toBe(200);
      if (res.body.data) {
        expect(res.body.data.duties).toBeDefined();
      }
    });
  });

  describe('PUT (update existing plan)', () => {
    it('updates plan with modified duties', async () => {
      const res = await put(
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/match/${MATCH_KEY}/plan`,
        {
          duties: [
            { slotKey: 'slot1', teamNumber: 7160, notes: 'Updated duty' },
            { slotKey: 'slot2', teamNumber: 7160, notes: 'New duty' },
          ],
        },
        PERSONAS.COACH_7160,
      );
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('Access control', () => {
    it('returns 403 for non-member', async () => {
      const res = await get(
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/match/${MATCH_KEY}/plan`,
        PERSONAS.COACH_6328,
      );
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid body', async () => {
      const res = await put(
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/match/${MATCH_KEY}/plan`,
        { invalid: 'body' },
        PERSONAS.COACH_7160,
      );
      expect(res.status).toBe(400);
    });

    it('returns 401 with no auth', async () => {
      const res = await rawGet(
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/match/${MATCH_KEY}/plan`,
      );
      expect(res.status).toBe(401);
    });
  });
});
