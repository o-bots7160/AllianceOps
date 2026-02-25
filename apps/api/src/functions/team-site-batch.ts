import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getStatboticsClient } from '../lib/clients.js';
import { cached } from '../cache/index.js';

const MAX_TEAMS = 10;

interface BatchRequestBody {
  teamNumbers: number[];
  year: number;
}

app.http('getTeamSiteBatch', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams/site-batch',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    let body: BatchRequestBody;
    try {
      body = (await request.json()) as BatchRequestBody;
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } };
    }

    const { teamNumbers, year } = body;
    if (!Array.isArray(teamNumbers) || teamNumbers.length === 0 || !year) {
      return {
        status: 400,
        jsonBody: { error: 'teamNumbers (non-empty array) and year are required' },
      };
    }

    if (teamNumbers.length > MAX_TEAMS) {
      return {
        status: 400,
        jsonBody: { error: `Maximum ${MAX_TEAMS} teams per batch request` },
      };
    }

    const results: Record<number, unknown> = {};
    const client = getStatboticsClient();

    await Promise.all(
      teamNumbers.map(async (num) => {
        try {
          const result = await cached(`team-site:${num}:${year}`, 'SEMI_STATIC', () =>
            client.getTeamSite(num, year),
          );
          results[num] = result.data;
        } catch {
          // Gracefully skip individual team failures
          results[num] = [];
        }
      }),
    );

    return {
      status: 200,
      jsonBody: {
        data: results,
        meta: {
          lastRefresh: new Date().toISOString(),
          stale: false,
          ttlClass: 'SEMI_STATIC',
        },
      },
    };
  },
});
