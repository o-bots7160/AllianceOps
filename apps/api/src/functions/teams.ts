import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireUser, requireTeamMember, requireTeamRole, isAuthError } from '../lib/auth.js';
import { randomBytes } from 'crypto';
import type { TeamRole } from '@prisma/client';

// ─── Team CRUD ───────────────────────────────────────────

app.http('createTeam', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as { teamNumber: number; name: string };

    if (!body.teamNumber || !body.name) {
      return { status: 400, jsonBody: { error: 'teamNumber and name are required' } };
    }

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
  },
});

app.http('getMyTeams', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/mine',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;

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
  },
});

app.http('getTeam', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

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
  },
});

app.http('updateTeam', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const auth = await requireTeamRole(request, teamId, 'COACH');
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as { name?: string };
    const team = await prisma.team.update({
      where: { id: teamId },
      data: { ...(body.name && { name: body.name }) },
    });

    return { status: 200, jsonBody: { data: team } };
  },
});

// ─── Invite Codes ────────────────────────────────────────

app.http('createInviteCode', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/invite',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const auth = await requireTeamRole(request, teamId, 'MENTOR');
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as { maxUses?: number; expiresInHours?: number };
    const code = randomBytes(4).toString('hex').toUpperCase();

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
  },
});

app.http('joinViaCode', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams/join/{code}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;
    const code = request.params.code!;

    const invite = await prisma.inviteCode.findUnique({ where: { code } });
    if (!invite || !invite.active) {
      return { status: 404, jsonBody: { error: 'Invalid or inactive invite code' } };
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return { status: 410, jsonBody: { error: 'Invite code has expired' } };
    }
    if (invite.maxUses && invite.useCount >= invite.maxUses) {
      return { status: 410, jsonBody: { error: 'Invite code has reached max uses' } };
    }

    const existing = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: auth.id, teamId: invite.teamId } },
    });
    if (existing) {
      return { status: 409, jsonBody: { error: 'You are already a member of this team' } };
    }

    const [member] = await prisma.$transaction([
      prisma.teamMember.create({
        data: { userId: auth.id, teamId: invite.teamId, role: 'STUDENT' },
        include: { team: true },
      }),
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      }),
    ]);

    return {
      status: 201,
      jsonBody: {
        data: { teamId: member.teamId, teamNumber: member.team.teamNumber, role: member.role },
      },
    };
  },
});

// ─── Join Requests ───────────────────────────────────────

app.http('createJoinRequest', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/join-request',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;

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
  },
});

app.http('listJoinRequests', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/join-requests',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const auth = await requireTeamRole(request, teamId, 'MENTOR');
    if (isAuthError(auth)) return auth;

    const requests = await prisma.joinRequest.findMany({
      where: { teamId, status: 'PENDING' },
      include: { user: { select: { id: true, displayName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { status: 200, jsonBody: { data: requests } };
  },
});

app.http('reviewJoinRequest', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/join-requests/{requestId}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const requestId = request.params.requestId!;
    const auth = await requireTeamRole(request, teamId, 'MENTOR');
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as { action: 'approve' | 'reject'; role?: TeamRole };

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
  },
});

// ─── Member Management ───────────────────────────────────

app.http('removeMember', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/members/{userId}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const targetUserId = request.params.userId!;
    const auth = await requireTeamRole(request, teamId, 'MENTOR');
    if (isAuthError(auth)) return auth;

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
  },
});

app.http('changeMemberRole', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/members/{userId}/role',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const targetUserId = request.params.userId!;
    const auth = await requireTeamRole(request, teamId, 'COACH');
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as { role: TeamRole };
    if (!['COACH', 'MENTOR', 'STUDENT'].includes(body.role)) {
      return { status: 400, jsonBody: { error: 'Invalid role' } };
    }

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
  },
});

// ─── Team Lookup (public, for join requests) ─────────────

app.http('findTeamByNumber', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/lookup/{teamNumber}',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamNumber = parseInt(request.params.teamNumber!, 10);
    if (isNaN(teamNumber)) {
      return { status: 400, jsonBody: { error: 'Invalid team number' } };
    }

    const team = await prisma.team.findUnique({
      where: { teamNumber },
      select: { id: true, teamNumber: true, name: true },
    });

    if (!team) {
      return { status: 404, jsonBody: { error: 'Team not found' } };
    }

    return { status: 200, jsonBody: { data: team } };
  },
});
