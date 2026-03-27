import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireUser, requireTeamMember, requireTeamRole, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  parseBody,
  isValidationError,
  requiredParam,
  isParamError,
} from '../lib/validation.js';

app.http('createTeam', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, CreateTeamSchema);
    if (isValidationError(body)) return body;

    try {
      const existing = await prisma.team.findUnique({ where: { teamNumber: body.teamNumber } });
      if (existing) {
        return {
          status: 409,
          jsonBody: {
            error: `Team ${body.teamNumber} already exists. Use a join code or request to join.`,
          },
        };
      }

      const team = await prisma.team.create({
        data: {
          teamNumber: body.teamNumber,
          name: body.name,
          members: {
            create: { userId: auth.id, role: 'COACH' },
          },
        },
        include: { members: { include: { user: true } } },
      });

      return { status: 201, jsonBody: { data: team } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'createTeam',
      });
      return { status: 503, jsonBody: { error: 'Failed to create team. Please try again.' } };
    }
  },
});

app.http('getMyTeams', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/mine',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;

    try {
      const memberships = await prisma.teamMember.findMany({
        where: { userId: auth.id },
        include: { team: true },
        orderBy: { joinedAt: 'asc' },
      });

      return {
        status: 200,
        jsonBody: {
          data: memberships.map((m) => ({
            teamId: m.team.id,
            teamNumber: m.team.teamNumber,
            name: m.team.name,
            role: m.role,
            joinedAt: m.joinedAt,
          })),
        },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'getMyTeams',
      });
      return { status: 503, jsonBody: { error: 'Service temporarily unavailable' } };
    }
  },
});

app.http('getTeam', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            include: { user: { select: { id: true, displayName: true, email: true } } },
            orderBy: { joinedAt: 'asc' },
          },
        },
      });

      return { status: 200, jsonBody: { data: team } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'getTeam',
        teamId,
      });
      return { status: 503, jsonBody: { error: 'Service temporarily unavailable' } };
    }
  },
});

app.http('updateTeam', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const auth = await requireTeamRole(request, teamId, 'COACH');
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, UpdateTeamSchema);
    if (isValidationError(body)) return body;

    try {
      const team = await prisma.team.update({
        where: { id: teamId },
        data: { ...(body.name && { name: body.name }) },
      });

      return { status: 200, jsonBody: { data: team } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'updateTeam',
        teamId,
      });
      return { status: 503, jsonBody: { error: 'Failed to update team. Please try again.' } };
    }
  },
});

app.http('findTeamByNumber', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/lookup/{teamNumber}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const rawTeamNumber = requiredParam(request, 'teamNumber');
    if (isParamError(rawTeamNumber)) return rawTeamNumber;
    const teamNumber = parseInt(rawTeamNumber, 10);
    if (isNaN(teamNumber)) {
      return { status: 400, jsonBody: { error: 'Invalid team number' } };
    }

    try {
      const team = await prisma.team.findUnique({
        where: { teamNumber },
        select: { id: true, teamNumber: true, name: true },
      });

      if (!team) {
        return { status: 404, jsonBody: { error: 'Team not found' } };
      }

      return { status: 200, jsonBody: { data: team } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'findTeamByNumber',
      });
      return { status: 503, jsonBody: { error: 'Service temporarily unavailable' } };
    }
  },
});
