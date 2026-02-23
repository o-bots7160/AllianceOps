import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTBAClient, getStatboticsClient } from '../lib/clients.js';
import { cached } from '../cache/index.js';
import { mergeTeams, mergeMatches } from '../lib/merge.js';

app.http('getEvents', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'events',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const year = request.query.get('year');
    if (!year) {
      return { status: 400, jsonBody: { error: 'year query parameter is required' } };
    }

    const result = await cached(`events:${year}`, 'STATIC', async () => {
      const events = await getTBAClient().getEvents(parseInt(year, 10));
      return events.map((e) => ({
        key: e.key,
        name: e.name,
        event_code: e.event_code,
        event_type: e.event_type,
        start_date: e.start_date,
        end_date: e.end_date,
        city: e.city,
        state_prov: e.state_prov,
        country: e.country,
      }));
    });

    return { status: 200, jsonBody: result };
  },
});

app.http('getEventMatches', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'event/{eventKey}/matches',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const eventKey = request.params.eventKey;
    if (!eventKey) {
      return { status: 400, jsonBody: { error: 'eventKey is required' } };
    }

    const includeBreakdowns = request.query.get('breakdowns') === 'true';

    const result = await cached(
      `matches:${eventKey}:${includeBreakdowns ? 'full' : 'slim'}`,
      'LIVE',
      async () => {
        const [tbaMatches, statboticsMatches] = await Promise.all([
          getTBAClient().getEventMatches(eventKey),
          getStatboticsClient().getEventMatches(eventKey).catch(() => []),
        ]);
        return mergeMatches(tbaMatches, statboticsMatches, includeBreakdowns);
      },
    );

    return { status: 200, jsonBody: result };
  },
});

app.http('getEventTeams', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'event/{eventKey}/teams',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const eventKey = request.params.eventKey;
    if (!eventKey) {
      return { status: 400, jsonBody: { error: 'eventKey is required' } };
    }

    const result = await cached(`teams:${eventKey}`, 'SEMI_STATIC', async () => {
      const [tbaTeams, statboticsTeams] = await Promise.all([
        getTBAClient().getEventTeams(eventKey),
        getStatboticsClient().getEventTeams(eventKey).catch(() => []),
      ]);
      return mergeTeams(tbaTeams, statboticsTeams);
    });

    return { status: 200, jsonBody: result };
  },
});

app.http('getEventRankings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'event/{eventKey}/rankings',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const eventKey = request.params.eventKey;
    if (!eventKey) {
      return { status: 400, jsonBody: { error: 'eventKey is required' } };
    }

    const result = await cached(`rankings:${eventKey}`, 'SEMI_STATIC', () =>
      getTBAClient().getEventRankings(eventKey),
    );

    return { status: 200, jsonBody: result };
  },
});

app.http('getTeamEvents', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'team/{teamNumber}/events',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    const teamNumber = request.params.teamNumber;
    const year = request.query.get('year');
    if (!teamNumber || !year) {
      return { status: 400, jsonBody: { error: 'teamNumber and year are required' } };
    }

    const result = await cached(`team-events:frc${teamNumber}:${year}`, 'STATIC', async () => {
      const events = await getTBAClient().getTeamEvents(`frc${teamNumber}`, parseInt(year, 10));
      return events.map((e) => ({
        key: e.key,
        name: e.name,
        event_code: e.event_code,
        event_type: e.event_type,
        start_date: e.start_date,
        end_date: e.end_date,
        city: e.city,
        state_prov: e.state_prov,
        country: e.country,
      }));
    });

    return { status: 200, jsonBody: result };
  },
});
