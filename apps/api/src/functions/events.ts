import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTBAClient } from '../lib/clients.js';
import { cached } from '../cache/index.js';

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
        const matches = await getTBAClient().getEventMatches(eventKey);
        if (includeBreakdowns) return matches;
        return matches.map((m) => ({
          key: m.key,
          comp_level: m.comp_level,
          set_number: m.set_number,
          match_number: m.match_number,
          alliances: m.alliances,
          winning_alliance: m.winning_alliance,
          event_key: m.event_key,
          time: m.time,
          actual_time: m.actual_time,
          predicted_time: m.predicted_time,
        }));
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

    const result = await cached(`teams:${eventKey}`, 'SEMI_STATIC', () =>
      getTBAClient().getEventTeams(eventKey),
    );

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
