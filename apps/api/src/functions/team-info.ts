import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTBAClient } from '../lib/clients.js';
import { cached } from '../cache/index.js';
import { trackUpstreamError } from '../lib/telemetry.js';

app.http('getTeamInfo', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'team/{teamNumber}/info',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamNumber = request.params.teamNumber;
    if (!teamNumber) {
      return { status: 400, jsonBody: { error: 'teamNumber is required' } };
    }

    try {
      const result = await cached(`team-info:${teamNumber}`, 'STATIC', () =>
        getTBAClient().getTeam(`frc${teamNumber}`),
      );

      return { status: 200, jsonBody: result };
    } catch (err) {
      trackUpstreamError(
        'tba',
        `teamInfo:${teamNumber}`,
        (err as { status?: number })?.status ?? 0,
      );
      return {
        status: 502,
        jsonBody: {
          data: null,
          meta: { lastRefresh: new Date().toISOString(), stale: true, ttlClass: 'STATIC' },
        },
      };
    }
  },
});
