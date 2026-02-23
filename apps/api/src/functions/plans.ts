import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

// Note: In production, PrismaClient would be initialized here.
// For MVP, we use a mock implementation that returns placeholder data.
// Once Postgres is running locally, replace with actual Prisma queries.

interface MatchPlanResponse {
  id: string;
  eventKey: string;
  matchKey: string;
  duties: Array<{
    slotKey: string;
    teamNumber: number;
    notes: string | null;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
}

// In-memory store for development without Postgres
const planStore = new Map<string, MatchPlanResponse>();

app.http('getMatchPlan', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'event/{eventKey}/match/{matchKey}/plan',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const eventKey = request.params.eventKey!;
    const matchKey = request.params.matchKey!;
    const key = `${eventKey}:${matchKey}`;

    const plan = planStore.get(key);
    if (!plan) {
      return { status: 200, jsonBody: { data: null } };
    }
    return { status: 200, jsonBody: { data: plan } };
  },
});

app.http('upsertMatchPlan', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'event/{eventKey}/match/{matchKey}/plan',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const eventKey = request.params.eventKey!;
    const matchKey = request.params.matchKey!;
    const key = `${eventKey}:${matchKey}`;

    const body = (await request.json()) as {
      duties: Array<{ slotKey: string; teamNumber: number; notes?: string }>;
    };

    const plan: MatchPlanResponse = {
      id: key,
      eventKey,
      matchKey,
      duties: body.duties.map((d) => ({
        slotKey: d.slotKey,
        teamNumber: d.teamNumber,
        notes: d.notes ?? null,
      })),
      notes: planStore.get(key)?.notes ?? [],
    };

    planStore.set(key, plan);
    return { status: 200, jsonBody: { data: plan } };
  },
});

app.http('applyTemplate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'event/{eventKey}/match/{matchKey}/plan/from-template',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const eventKey = request.params.eventKey!;
    const matchKey = request.params.matchKey!;

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
