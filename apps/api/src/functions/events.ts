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

    const result = await cached(`events:${year}`, 'STATIC', () =>
      getTBAClient().getEvents(parseInt(year, 10)),
    );

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

    const result = await cached(`matches:${eventKey}`, 'LIVE', () =>
      getTBAClient().getEventMatches(eventKey),
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
