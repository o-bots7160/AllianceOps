import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getStatboticsClient } from '../lib/clients.js';
import { cached } from '../cache/index.js';
import { TeamSiteBatchSchema, parseBody, isValidationError } from '../lib/validation.js';

app.http('getTeamSiteBatch', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'teams/site-batch',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const body = await parseBody(request, TeamSiteBatchSchema);
    if (isValidationError(body)) return body;

    const { teamNumbers, year } = body;

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
