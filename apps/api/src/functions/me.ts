import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { resolveUser } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';

app.http('getMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await resolveUser(request);
    if (!auth) {
      return { status: 200, jsonBody: { data: null } };
    }

    let user;
    let isAdmin = false;
    try {
      [user, isAdmin] = await Promise.all([
        prisma.user.findUnique({
          where: { id: auth.id },
          include: {
            memberships: {
              include: { team: true },
              orderBy: { joinedAt: 'asc' },
            },
          },
        }),
        prisma.adminUser.findUnique({ where: { userId: auth.id } }).then((r) => r !== null),
      ]);
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'getMe.findUser',
        userId: auth.id,
      });
      // Fall through — treat as if user record doesn't exist yet
    }

    // User is authenticated but may not have a DB record yet
    // (e.g., first login and upsert failed). Return auth info directly.
    if (!user) {
      return {
        status: 200,
        jsonBody: {
          data: {
            id: auth.id,
            email: auth.email ?? null,
            displayName: auth.displayName ?? null,
            teams: [],
            isAdmin,
          },
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        data: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isAdmin,
          teams: user.memberships.map((m) => ({
            teamId: m.team.id,
            teamNumber: m.team.teamNumber,
            name: m.team.name,
            role: m.role,
          })),
        },
      },
    };
  },
});
