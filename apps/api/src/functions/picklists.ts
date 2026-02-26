import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireTeamMember, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';
import {
  UpsertPicklistSchema,
  parseBody,
  isValidationError,
  requiredParam,
  isParamError,
} from '../lib/validation.js';

const DEFAULT_PICKLIST_NAME = 'default';

app.http('getPicklist', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/picklist',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const eventKey = requiredParam(request, 'eventKey');
    if (isParamError(eventKey)) return eventKey;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    try {
      const picklist = await prisma.picklist.findUnique({
        where: {
          teamId_eventKey_name: { teamId, eventKey, name: DEFAULT_PICKLIST_NAME },
        },
        include: {
          entries: {
            select: {
              teamNumber: true,
              rank: true,
              tags: true,
              notes: true,
              excluded: true,
            },
            orderBy: { rank: 'asc' },
          },
        },
      });

      return {
        status: 200,
        jsonBody: {
          data: picklist ? { entries: picklist.entries, updatedAt: picklist.updatedAt } : null,
        },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'getPicklist',
        teamId,
        eventKey,
      });
      return { status: 503, jsonBody: { error: 'Service temporarily unavailable' } };
    }
  },
});

app.http('upsertPicklist', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/picklist',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const eventKey = requiredParam(request, 'eventKey');
    if (isParamError(eventKey)) return eventKey;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, UpsertPicklistSchema);
    if (isValidationError(body)) return body;

    try {
      const picklist = await prisma.picklist.upsert({
        where: {
          teamId_eventKey_name: { teamId, eventKey, name: DEFAULT_PICKLIST_NAME },
        },
        create: {
          teamId,
          eventKey,
          name: DEFAULT_PICKLIST_NAME,
          createdBy: auth.user.id,
          entries: {
            create: body.entries.map((e) => ({
              teamNumber: e.teamNumber,
              rank: e.rank,
              tags: e.tags,
              notes: e.notes || null,
              excluded: e.excluded,
            })),
          },
        },
        update: {
          entries: {
            deleteMany: {},
            create: body.entries.map((e) => ({
              teamNumber: e.teamNumber,
              rank: e.rank,
              tags: e.tags,
              notes: e.notes || null,
              excluded: e.excluded,
            })),
          },
        },
        include: {
          entries: {
            select: {
              teamNumber: true,
              rank: true,
              tags: true,
              notes: true,
              excluded: true,
            },
            orderBy: { rank: 'asc' },
          },
        },
      });

      return {
        status: 200,
        jsonBody: {
          data: { entries: picklist.entries, updatedAt: picklist.updatedAt },
        },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'upsertPicklist',
        teamId,
        eventKey,
      });
      return { status: 503, jsonBody: { error: 'Failed to save picklist. Please try again.' } };
    }
  },
});
