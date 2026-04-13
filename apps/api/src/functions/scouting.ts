import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireTeamMember, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';
import {
  UpsertScoutingNoteSchema,
  parseBody,
  isValidationError,
  requiredParam,
  isParamError,
  requiredNumericParam,
  isNumericParamError,
} from '../lib/validation.js';
import { broadcastSignalR } from './signalr.js';

const NOTE_PREVIEW_LENGTH = 100;

// TBA event keys are formatted as {year}{event_code}, e.g. "2026mimil"
const EVENT_KEY_YEAR_PREFIX_LEN = 4;

app.http('getPastScoutingNote', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/scouting/{targetTeamNumber}/past',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const targetTeamNumber = requiredNumericParam(request, 'targetTeamNumber');
    if (isNumericParamError(targetTeamNumber)) return targetTeamNumber;

    const year = request.query.get('year');
    const excludeEvent = request.query.get('excludeEvent');
    if (!year || !/^\d{4}$/.test(year)) {
      return { status: 400, jsonBody: { error: 'year query parameter is required (4-digit)' } };
    }

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    try {
      // Find the most recently updated note for this target team from a
      // different event in the same year (event keys start with the year).
      const note = await prisma.scoutingNote.findFirst({
        where: {
          teamId,
          targetTeamNumber,
          eventKey: {
            startsWith: year.slice(0, EVENT_KEY_YEAR_PREFIX_LEN),
            ...(excludeEvent ? { not: excludeEvent } : {}),
          },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          eventKey: true,
          notes: true,
          data: true,
          updatedAt: true,
        },
      });

      if (!note) {
        return { status: 200, jsonBody: { data: null } };
      }

      return {
        status: 200,
        jsonBody: {
          data: {
            eventKey: note.eventKey,
            notes: note.notes,
            data: typeof note.data === 'object' && note.data !== null ? note.data : {},
            updatedAt: note.updatedAt.toISOString(),
          },
        },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'getPastScoutingNote',
        teamId,
        targetTeamNumber: String(targetTeamNumber),
      });
      return { status: 503, jsonBody: { error: 'Service temporarily unavailable' } };
    }
  },
});

app.http('listScoutingNotes', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/scouting',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const eventKey = requiredParam(request, 'eventKey');
    if (isParamError(eventKey)) return eventKey;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    try {
      const notes = await prisma.scoutingNote.findMany({
        where: { teamId, eventKey },
        select: {
          targetTeamNumber: true,
          notes: true,
          data: true,
          scoutingStatus: true,
        },
      });

      const summaries = notes.map((n) => ({
        targetTeamNumber: n.targetTeamNumber,
        hasScouting: true,
        notePreview:
          typeof n.notes === 'string' && n.notes.length > NOTE_PREVIEW_LENGTH
            ? n.notes.slice(0, NOTE_PREVIEW_LENGTH) + '…'
            : (n.notes ?? ''),
        data: typeof n.data === 'object' && n.data !== null ? n.data : {},
        scoutingStatus: n.scoutingStatus,
      }));

      return { status: 200, jsonBody: { data: summaries } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'listScoutingNotes',
        teamId,
        eventKey,
      });
      return { status: 503, jsonBody: { error: 'Service temporarily unavailable' } };
    }
  },
});

app.http('getScoutingNote', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/scouting/{targetTeamNumber}',
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
      const note = await prisma.scoutingNote.findUnique({
        where: {
          teamId_eventKey_targetTeamNumber: { teamId, eventKey, targetTeamNumber },
        },
        select: {
          notes: true,
          data: true,
          scoutingStatus: true,
          updatedAt: true,
          updatedBy: true,
        },
      });

      if (!note) {
        return { status: 200, jsonBody: { data: null } };
      }

      let updatedByName: string | undefined;
      if (note.updatedBy) {
        const updater = await prisma.user.findUnique({
          where: { id: note.updatedBy },
          select: { displayName: true },
        });
        updatedByName = updater?.displayName ?? undefined;
      }

      return {
        status: 200,
        jsonBody: {
          data: {
            notes: note.notes,
            data: typeof note.data === 'object' && note.data !== null ? note.data : {},
            scoutingStatus: note.scoutingStatus,
            updatedAt: note.updatedAt.toISOString(),
            updatedByName,
          },
        },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'getScoutingNote',
        teamId,
        eventKey,
        targetTeamNumber: String(targetTeamNumber),
      });
      return { status: 503, jsonBody: { error: 'Service temporarily unavailable' } };
    }
  },
});

app.http('upsertScoutingNote', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/scouting/{targetTeamNumber}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const eventKey = requiredParam(request, 'eventKey');
    if (isParamError(eventKey)) return eventKey;
    const targetTeamNumber = requiredNumericParam(request, 'targetTeamNumber');
    if (isNumericParamError(targetTeamNumber)) return targetTeamNumber;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, UpsertScoutingNoteSchema);
    if (isValidationError(body)) return body;

    try {
      const jsonData = body.data as Prisma.InputJsonValue;
      const scoutingStatus = body.scoutingStatus ?? 'not_scouted';
      const note = await prisma.scoutingNote.upsert({
        where: {
          teamId_eventKey_targetTeamNumber: { teamId, eventKey, targetTeamNumber },
        },
        create: {
          teamId,
          eventKey,
          targetTeamNumber,
          notes: body.notes,
          data: jsonData,
          scoutingStatus,
          createdBy: auth.user.id,
          updatedBy: auth.user.id,
        },
        update: {
          notes: body.notes,
          data: jsonData,
          scoutingStatus,
          updatedBy: auth.user.id,
        },
        select: {
          notes: true,
          data: true,
          scoutingStatus: true,
          updatedAt: true,
        },
      });

      void broadcastSignalR([
        {
          target: 'scouting-updated',
          arguments: [
            {
              type: 'scouting-updated',
              eventKey,
              targetTeamNumber,
              userId: auth.user.id,
              updatedBy: auth.user.displayName ?? auth.user.id,
              updatedAt: note.updatedAt.toISOString(),
            },
          ],
        },
      ]);

      return {
        status: 200,
        jsonBody: {
          data: {
            notes: note.notes,
            data: typeof note.data === 'object' && note.data !== null ? note.data : {},
            scoutingStatus: note.scoutingStatus,
            updatedAt: note.updatedAt.toISOString(),
            updatedByName: auth.user.displayName ?? undefined,
          },
        },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'upsertScoutingNote',
        teamId,
        eventKey,
        targetTeamNumber: String(targetTeamNumber),
      });
      return {
        status: 503,
        jsonBody: { error: 'Failed to save scouting note. Please try again.' },
      };
    }
  },
});
