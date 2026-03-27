import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireTeamRole, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';
import {
  ChangeMemberRoleSchema,
  parseBody,
  isValidationError,
  requiredParam,
  isParamError,
} from '../lib/validation.js';

app.http('removeMember', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/members/{userId}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const targetUserId = requiredParam(request, 'userId');
    if (isParamError(targetUserId)) return targetUserId;
    const auth = await requireTeamRole(request, teamId, 'MENTOR');
    if (isAuthError(auth)) return auth;

    try {
      const target = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: targetUserId, teamId } },
      });
      if (!target) {
        return { status: 404, jsonBody: { error: 'Member not found' } };
      }

      // Mentors can only remove Students; Coaches can remove anyone except themselves
      if (auth.role === 'MENTOR' && target.role !== 'STUDENT') {
        return { status: 403, jsonBody: { error: 'Mentors can only remove Students' } };
      }
      if (targetUserId === auth.user.id) {
        return {
          status: 400,
          jsonBody: { error: 'Cannot remove yourself. Transfer ownership first.' },
        };
      }

      await prisma.teamMember.delete({
        where: { userId_teamId: { userId: targetUserId, teamId } },
      });

      return { status: 200, jsonBody: { data: { removed: targetUserId } } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'removeMember',
        teamId,
        targetUserId,
      });
      return { status: 503, jsonBody: { error: 'Failed to remove member. Please try again.' } };
    }
  },
});

app.http('changeMemberRole', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/members/{userId}/role',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const targetUserId = requiredParam(request, 'userId');
    if (isParamError(targetUserId)) return targetUserId;
    const auth = await requireTeamRole(request, teamId, 'COACH');
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, ChangeMemberRoleSchema);
    if (isValidationError(body)) return body;

    try {
      const target = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: targetUserId, teamId } },
      });
      if (!target) {
        return { status: 404, jsonBody: { error: 'Member not found' } };
      }

      await prisma.teamMember.update({
        where: { userId_teamId: { userId: targetUserId, teamId } },
        data: { role: body.role },
      });

      return { status: 200, jsonBody: { data: { userId: targetUserId, role: body.role } } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'changeMemberRole',
        teamId,
        targetUserId,
      });
      return { status: 503, jsonBody: { error: 'Failed to change role. Please try again.' } };
    }
  },
});
