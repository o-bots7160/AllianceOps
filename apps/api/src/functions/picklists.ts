import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireTeamMember, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';
import {
  UpsertPicklistSchema,
  UpdateTeamTagsSchema,
  parseBody,
  isValidationError,
  requiredParam,
  isParamError,
  requiredNumericParam,
  isNumericParamError,
} from '../lib/validation.js';
import { broadcastSignalR } from './signalr.js';

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
  extraOutputs: [],
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
              excluded: true,
            },
            orderBy: { rank: 'asc' },
          },
        },
      });

      // Fire-and-forget — broadcast never blocks the save response
      void broadcastSignalR([
        {
          target: 'picklist-updated',
          arguments: [
            {
              type: 'picklist-updated',
              eventKey,
              userId: auth.user.id,
              updatedBy: auth.user.displayName ?? auth.user.id,
              updatedAt: picklist.updatedAt.toISOString(),
            },
          ],
        },
      ]);

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

// ─── Per-Team Tags ───────────────────────────────────────

app.http('getTeamTags', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/picklist/team/{targetTeamNumber}/tags',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const eventKey = requiredParam(request, 'eventKey');
    if (isParamError(eventKey)) return eventKey;
    const targetTeamNumber = requiredNumericParam(request, 'targetTeamNumber');
    if (isNumericParamError(targetTeamNumber)) return targetTeamNumber;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    try {
      const picklist = await prisma.picklist.findUnique({
        where: {
          teamId_eventKey_name: { teamId, eventKey, name: DEFAULT_PICKLIST_NAME },
        },
        include: {
          entries: {
            where: { teamNumber: targetTeamNumber },
            select: { tags: true },
          },
        },
      });

      const entry = picklist?.entries[0];
      const tags = entry ? (Array.isArray(entry.tags) ? entry.tags : []) : [];

      // Collect all tags across all entries for the dropdown
      const allEntries = picklist
        ? await prisma.picklistEntry.findMany({
            where: { picklistId: picklist.id },
            select: { tags: true },
          })
        : [];
      const allTags = new Set<string>();
      for (const e of allEntries) {
        const t = Array.isArray(e.tags) ? e.tags : [];
        for (const tag of t) {
          if (typeof tag === 'string') allTags.add(tag);
        }
      }

      return {
        status: 200,
        jsonBody: {
          data: {
            tags: tags as string[],
            allTags: Array.from(allTags).sort(),
          },
        },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'getTeamTags',
        teamId,
        eventKey,
        targetTeamNumber: String(targetTeamNumber),
      });
      return { status: 503, jsonBody: { error: 'Service temporarily unavailable' } };
    }
  },
});

app.http('updateTeamTags', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/picklist/team/{targetTeamNumber}/tags',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const eventKey = requiredParam(request, 'eventKey');
    if (isParamError(eventKey)) return eventKey;
    const targetTeamNumber = requiredNumericParam(request, 'targetTeamNumber');
    if (isNumericParamError(targetTeamNumber)) return targetTeamNumber;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, UpdateTeamTagsSchema);
    if (isValidationError(body)) return body;

    try {
      // Ensure the picklist exists (create if needed)
      const picklist = await prisma.picklist.upsert({
        where: {
          teamId_eventKey_name: { teamId, eventKey, name: DEFAULT_PICKLIST_NAME },
        },
        create: {
          teamId,
          eventKey,
          name: DEFAULT_PICKLIST_NAME,
          createdBy: auth.user.id,
        },
        update: {},
      });

      // Determine the next rank (max + 1) so a tag-only entry doesn't sort to the top
      const maxEntry = await prisma.picklistEntry.findFirst({
        where: { picklistId: picklist.id },
        orderBy: { rank: 'desc' },
        select: { rank: true },
      });
      const nextRank = (maxEntry?.rank ?? 0) + 1;

      // Upsert the single entry's tags
      await prisma.picklistEntry.upsert({
        where: {
          picklistId_teamNumber: { picklistId: picklist.id, teamNumber: targetTeamNumber },
        },
        create: {
          picklistId: picklist.id,
          teamNumber: targetTeamNumber,
          rank: nextRank,
          tags: body.tags,
          excluded: false,
        },
        update: {
          tags: body.tags,
        },
      });

      // Broadcast so picklist page picks up the change
      void broadcastSignalR([
        {
          target: 'picklist-updated',
          arguments: [
            {
              type: 'picklist-updated',
              eventKey,
              userId: auth.user.id,
              updatedBy: auth.user.displayName ?? auth.user.id,
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      ]);

      return {
        status: 200,
        jsonBody: { data: { tags: body.tags } },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'updateTeamTags',
        teamId,
        eventKey,
        targetTeamNumber: String(targetTeamNumber),
      });
      return { status: 503, jsonBody: { error: 'Failed to save tags. Please try again.' } };
    }
  },
});
