import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireTeamMember, isAuthError } from '../lib/auth.js';

app.http('getMatchPlan', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/match/{matchKey}/plan',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const eventKey = request.params.eventKey!;
    const matchKey = request.params.matchKey!;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const plan = await prisma.matchPlan.findUnique({
      where: { eventKey_matchKey: { eventKey, matchKey } },
      include: {
        duties: { select: { slotKey: true, teamNumber: true, notes: true } },
        notes: {
          select: { id: true, content: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Verify team ownership if plan exists
    if (plan && plan.teamId && plan.teamId !== teamId) {
      return { status: 403, jsonBody: { error: 'Plan belongs to a different team' } };
    }

    return { status: 200, jsonBody: { data: plan ?? null } };
  },
});

app.http('upsertMatchPlan', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/match/{matchKey}/plan',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const eventKey = request.params.eventKey!;
    const matchKey = request.params.matchKey!;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as {
      duties: Array<{ slotKey: string; teamNumber: number; notes?: string }>;
    };

    const plan = await prisma.matchPlan.upsert({
      where: { eventKey_matchKey: { eventKey, matchKey } },
      create: {
        teamId,
        eventKey,
        matchKey,
        createdBy: auth.user.id,
        duties: {
          create: body.duties.map((d) => ({
            slotKey: d.slotKey,
            teamNumber: d.teamNumber,
            notes: d.notes ?? null,
          })),
        },
      },
      update: {
        duties: {
          deleteMany: {},
          create: body.duties.map((d) => ({
            slotKey: d.slotKey,
            teamNumber: d.teamNumber,
            notes: d.notes ?? null,
          })),
        },
      },
      include: {
        duties: { select: { slotKey: true, teamNumber: true, notes: true } },
        notes: {
          select: { id: true, content: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return { status: 200, jsonBody: { data: plan } };
  },
});

app.http('applyTemplate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/match/{matchKey}/plan/from-template',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = request.params.teamId!;
    const eventKey = request.params.eventKey!;
    const matchKey = request.params.matchKey!;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as {
      templateName: 'safe' | 'balanced' | 'aggressive';
      teamNumbers: number[];
    };

    return {
      status: 200,
      jsonBody: {
        data: {
          templateName: body.templateName,
          eventKey,
          matchKey,
          message: `Template '${body.templateName}' applied. Assign teams in the duty planner.`,
        },
      },
    };
  },
});
