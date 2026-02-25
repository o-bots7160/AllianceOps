import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireTeamMember, isAuthError } from '../lib/auth.js';

const DEFAULT_PICKLIST_NAME = 'default';

app.http('getPicklist', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/picklist',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const eventKey = request.params.eventKey!;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

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

    if (picklist && picklist.teamId && picklist.teamId !== teamId) {
      return { status: 403, jsonBody: { error: 'Picklist belongs to a different team' } };
    }

    return {
      status: 200,
      jsonBody: {
        data: picklist ? { entries: picklist.entries, updatedAt: picklist.updatedAt } : null,
      },
    };
  },
});

app.http('upsertPicklist', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/picklist',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const eventKey = request.params.eventKey!;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as {
      entries: Array<{
        teamNumber: number;
        rank: number;
        tags: string[];
        notes: string;
        excluded: boolean;
      }>;
    };

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
  },
});
