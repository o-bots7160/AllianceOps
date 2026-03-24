import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireAdmin, isAuthError } from '../lib/auth.js';
import { trackException } from '../lib/telemetry.js';

app.http('getAdminStats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'site-admin/stats',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireAdmin(request);
    if (isAuthError(auth)) return auth;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [totalUsers, totalTeams, totalAdmins, recentSignups] = await Promise.all([
        prisma.user.count(),
        prisma.team.count(),
        prisma.adminUser.count(),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      ]);

      return {
        status: 200,
        jsonBody: {
          data: { totalUsers, totalTeams, totalAdmins, recentSignups },
        },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'getAdminStats',
        userId: auth.user.id,
      });
      return {
        status: 503,
        jsonBody: { error: 'Service temporarily unavailable. Please try again.' },
        headers: { 'Retry-After': '5' },
      };
    }
  },
});

app.http('getAdminUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'site-admin/users',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const auth = await requireAdmin(request);
    if (isAuthError(auth)) return auth;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '25', 10)),
    );
    const search = url.searchParams.get('search')?.trim() ?? '';
    const sortBy = url.searchParams.get('sortBy') ?? 'createdAt';
    const sortDir =
      (url.searchParams.get('sortDir') ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const allowedSortFields = ['createdAt', 'email', 'displayName'] as const;
    type SortField = (typeof allowedSortFields)[number];
    const orderField: SortField = allowedSortFields.includes(sortBy as SortField)
      ? (sortBy as SortField)
      : 'createdAt';

    try {
      const where = search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { displayName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            memberships: {
              include: { team: { select: { id: true, teamNumber: true, name: true } } },
            },
          },
          orderBy: { [orderField]: sortDir },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        status: 200,
        jsonBody: {
          data: {
            users: users.map((u) => ({
              id: u.id,
              email: u.email,
              displayName: u.displayName,
              createdAt: u.createdAt.toISOString(),
              teams: u.memberships.map((m) => ({
                teamId: m.team.id,
                teamNumber: m.team.teamNumber,
                name: m.team.name,
                role: m.role,
              })),
            })),
            total,
            page,
            pageSize,
          },
        },
      };
    } catch (err) {
      trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'getAdminUsers',
        userId: auth.user.id,
      });
      return {
        status: 503,
        jsonBody: { error: 'Service temporarily unavailable. Please try again.' },
        headers: { 'Retry-After': '5' },
      };
    }
  },
});
