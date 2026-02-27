import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireUser, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';

app.http('getMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireUser(request);
    if (isAuthError(auth)) return auth;

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: auth.id },
        include: {
          memberships: {
            include: { team: true },
            orderBy: { joinedAt: 'asc' },
          },
        },
      });
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
