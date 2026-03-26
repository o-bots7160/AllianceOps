import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireUser, requireTeamRole, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';
import {
  ReviewJoinRequestSchema,
  parseBody,
  isValidationError,
  requiredParam,
  isParamError,
} from '../lib/validation.js';

app.http('createJoinRequest', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/join-request',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;

    try {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        return { status: 404, jsonBody: { error: 'Team not found' } };
      }

      const existing = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: auth.id, teamId } },
      });
      if (existing) {
        return { status: 409, jsonBody: { error: 'You are already a member of this team' } };
      }

      const pendingRequest = await prisma.joinRequest.findUnique({
        where: { teamId_userId: { teamId, userId: auth.id } },
      });
      if (pendingRequest && pendingRequest.status === 'PENDING') {
        return { status: 409, jsonBody: { error: 'You already have a pending request' } };
      }

      const joinRequest = await prisma.joinRequest.upsert({
        where: { teamId_userId: { teamId, userId: auth.id } },
        create: { teamId, userId: auth.id },
        update: { status: 'PENDING', reviewedBy: null, reviewedAt: null },
      });

      return { status: 201, jsonBody: { data: joinRequest } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'createJoinRequest',
        teamId,
      });
      return { status: 503, jsonBody: { error: 'Failed to submit join request. Please try again.' } };
    }
  },
});

app.http('listJoinRequests', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/join-requests',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const auth = await requireTeamRole(request, teamId, 'MENTOR');
    if (isAuthError(auth)) return auth;

    try {
      const requests = await prisma.joinRequest.findMany({
        where: { teamId, status: 'PENDING' },
        include: { user: { select: { id: true, displayName: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });

      return { status: 200, jsonBody: { data: requests } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'listJoinRequests',
        teamId,
      });
      return { status: 503, jsonBody: { error: 'Service temporarily unavailable' } };
    }
  },
});

app.http('reviewJoinRequest', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/join-requests/{requestId}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const requestId = requiredParam(request, 'requestId');
    if (isParamError(requestId)) return requestId;
    const auth = await requireTeamRole(request, teamId, 'MENTOR');
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, ReviewJoinRequestSchema);
    if (isValidationError(body)) return body;

    try {
      const joinRequest = await prisma.joinRequest.findFirst({
        where: { id: requestId, teamId, status: 'PENDING' },
      });
      if (!joinRequest) {
        return { status: 404, jsonBody: { error: 'Pending request not found' } };
      }

      if (body.action === 'approve') {
        await prisma.$transaction([
          prisma.joinRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED', reviewedBy: auth.user.id, reviewedAt: new Date() },
          }),
          prisma.teamMember.create({
            data: { userId: joinRequest.userId, teamId, role: body.role ?? 'STUDENT' },
          }),
        ]);
      } else {
        await prisma.joinRequest.update({
          where: { id: requestId },
          data: { status: 'REJECTED', reviewedBy: auth.user.id, reviewedAt: new Date() },
        });
      }

      return { status: 200, jsonBody: { data: { action: body.action, requestId } } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'reviewJoinRequest',
        teamId,
        requestId,
      });
      return { status: 503, jsonBody: { error: 'Failed to process request. Please try again.' } };
    }
  },
});
