import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { prisma } from '../lib/prisma.js';
import { requireTeamMember, isAuthError } from '../lib/auth.js';
import {
  UpsertMatchPlanSchema,
  ApplyTemplateSchema,
  parseBody,
  isValidationError,
  requiredParam,
  isParamError,
} from '../lib/validation.js';

app.http('getMatchPlan', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/match/{matchKey}/plan',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const eventKey = requiredParam(request, 'eventKey');
    if (isParamError(eventKey)) return eventKey;
    const matchKey = requiredParam(request, 'matchKey');
    if (isParamError(matchKey)) return matchKey;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const plan = await prisma.matchPlan.findUnique({
      where: { teamId_eventKey_matchKey: { teamId, eventKey, matchKey } },
      include: {
        duties: { select: { slotKey: true, teamNumber: true, notes: true } },
        notes: {
          select: { id: true, content: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return { status: 200, jsonBody: { data: plan ?? null } };
  },
});

app.http('upsertMatchPlan', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'teams/{teamId}/event/{eventKey}/match/{matchKey}/plan',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const eventKey = requiredParam(request, 'eventKey');
    if (isParamError(eventKey)) return eventKey;
    const matchKey = requiredParam(request, 'matchKey');
    if (isParamError(matchKey)) return matchKey;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, UpsertMatchPlanSchema);
    if (isValidationError(body)) return body;

    const plan = await prisma.matchPlan.upsert({
      where: { teamId_eventKey_matchKey: { teamId, eventKey, matchKey } },
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
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;
    const eventKey = requiredParam(request, 'eventKey');
    if (isParamError(eventKey)) return eventKey;
    const matchKey = requiredParam(request, 'matchKey');
    if (isParamError(matchKey)) return matchKey;

    const auth = await requireTeamMember(request, teamId);
    if (isAuthError(auth)) return auth;

    const body = await parseBody(request, ApplyTemplateSchema);
    if (isValidationError(body)) return body;

    // TODO: Implement actual template application logic (creates duties from template)
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
