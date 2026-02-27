import { describe, it, expect, beforeAll } from 'vitest';
import { get, put, rawGet } from '../helpers/api-client';
import { PERSONAS } from '../helpers/auth';
import { loadSharedState } from '../helpers/load-state';
import { sharedState, EVENT_KEY } from '../helpers/test-data';

describe('Picklist CRUD', () => {
  beforeAll(() => {
    loadSharedState();
  });

  describe('PUT /api/teams/{teamId}/event/{eventKey}/picklist', () => {
    it('creates a picklist with entries', async () => {
      const res = await put(
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/picklist`,
        {
          entries: [
            {
              teamNumber: 7160,
              rank: 1,
              tags: ['strong-auto'],
              notes: 'Our team',
              excluded: false,
            },
            {
              teamNumber: 6328,
              rank: 2,
              tags: ['good-endgame'],
              notes: 'Alliance partner',
              excluded: false,
            },
          ],
        },
        PERSONAS.COACH_7160,
      );
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('GET /api/teams/{teamId}/event/{eventKey}/picklist', () => {
    it('retrieves picklist with entries', async () => {
      const res = await get<{
        data: { entries: Array<{ teamNumber: number; rank: number }> } | null;
      }>(`/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/picklist`, PERSONAS.COACH_7160);
      expect(res.status).toBe(200);
      if (res.body.data) {
        expect(Array.isArray(res.body.data.entries)).toBe(true);
      }
    });
  });

  describe('PUT (update entries)', () => {
    it('updates entries with reordered ranks and new notes', async () => {
      const res = await put(
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/picklist`,
        {
          entries: [
            {
              teamNumber: 6328,
              rank: 1,
              tags: ['good-endgame', 'reliable'],
              notes: 'Top pick now',
              excluded: false,
            },
            {
              teamNumber: 7160,
              rank: 2,
              tags: ['strong-auto'],
              notes: 'Moved down',
              excluded: false,
            },
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
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/picklist`,
        PERSONAS.COACH_6328,
      );
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid body', async () => {
      const res = await put(
        `/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/picklist`,
        { notEntries: true },
        PERSONAS.COACH_7160,
      );
      expect(res.status).toBe(400);
    });

    it('returns 401 with no auth', async () => {
      const res = await rawGet(`/api/teams/${sharedState.team7160Id}/event/${EVENT_KEY}/picklist`);
      expect(res.status).toBe(401);
    });
  });
});
