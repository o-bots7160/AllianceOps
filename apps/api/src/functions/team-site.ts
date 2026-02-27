import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getStatboticsClient } from '../lib/clients.js';
import { cached } from '../cache/index.js';
import { trackUpstreamError } from '../lib/telemetry.js';

app.http('getTeamSite', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'team/{teamNumber}/site',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamNumber = request.params.teamNumber;
    const year = request.query.get('year');
    if (!teamNumber || !year) {
      return { status: 400, jsonBody: { error: 'teamNumber and year are required' } };
    }

    try {
      const result = await cached(
        `team-site:${teamNumber}:${year}`,
        'SEMI_STATIC',
        () => getStatboticsClient().getTeamSite(parseInt(teamNumber, 10), parseInt(year, 10)),
      );

      return { status: 200, jsonBody: result };
    } catch (err) {
      trackUpstreamError(
        'statbotics',
        `teamSite:${teamNumber}`,
        (err as { status?: number })?.status ?? 0,
      );
      return {
        status: 200,
        jsonBody: {
          data: null,
          meta: { lastRefresh: new Date().toISOString(), stale: true, ttlClass: 'SEMI_STATIC' },
        },
      };
    }
  },
});
