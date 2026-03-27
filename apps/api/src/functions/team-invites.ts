import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireUser, requireTeamRole, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';
import { randomBytes } from 'crypto';
import {
  CreateInviteCodeSchema,
  parseBody,
  isValidationError,
  requiredParam,
  isParamError,
} from '../lib/validation.js';

/** Custom error class for invite code validation within transactions. */
class InviteError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'InviteError';
  }
}

app.http('createInviteCode', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/invite',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const auth = await requireTeamRole(request, teamId, 'MENTOR');
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, CreateInviteCodeSchema);
    if (isValidationError(body)) return body;
    const code = randomBytes(6).toString('hex').toUpperCase();

    try {
      const invite = await prisma.inviteCode.create({
        data: {
          teamId,
          code,
          createdBy: auth.user.id,
          maxUses: body.maxUses ?? null,
          expiresAt: body.expiresInHours
            ? new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000)
            : null,
        },
      });

      return { status: 201, jsonBody: { data: invite } };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'createInviteCode',
        teamId,
      });
      return { status: 503, jsonBody: { error: 'Failed to create invite. Please try again.' } };
    }
  },
});

app.http('joinViaCode', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams/join/{code}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;
    const code = requiredParam(request, 'code');
    if (isParamError(code)) return code;

    // Use a serializable transaction to prevent race conditions on maxUses
    try {
      const member = await prisma.$transaction(async (tx) => {
        const invite = await tx.inviteCode.findUnique({ where: { code } });
        if (!invite || !invite.active) {
          throw new InviteError(404, 'Invalid or inactive invite code');
        }
        if (invite.expiresAt && invite.expiresAt < new Date()) {
          throw new InviteError(410, 'Invite code has expired');
        }
        if (invite.maxUses && invite.useCount >= invite.maxUses) {
          throw new InviteError(410, 'Invite code has reached max uses');
        }

        const existing = await tx.teamMember.findUnique({
          where: { userId_teamId: { userId: auth.id, teamId: invite.teamId } },
        });
        if (existing) {
          throw new InviteError(409, 'You are already a member of this team');
        }

        const newMember = await tx.teamMember.create({
          data: { userId: auth.id, teamId: invite.teamId, role: 'STUDENT' },
          include: { team: true },
        });

        await tx.inviteCode.update({
          where: { id: invite.id },
          data: { useCount: { increment: 1 } },
        });

        return newMember;
      });

      return {
        status: 201,
        jsonBody: {
          data: { teamId: member.teamId, teamNumber: member.team.teamNumber, role: member.role },
        },
      };
    } catch (err) {
      if (err instanceof InviteError) {
        return { status: err.statusCode, jsonBody: { error: err.message } };
      }
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'joinViaCode',
      });
      return { status: 503, jsonBody: { error: 'Failed to join team. Please try again.' } };
    }
  },
});
