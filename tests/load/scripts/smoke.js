/**
 * k6 smoke test — minimal confidence check.
 * 1 VU, 30 seconds, cycles through health + events + event-teams.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, YEAR, EVENT_KEY, DEFAULT_THRESHOLDS } from '../helpers/config.js';

export var options = {
    vus: 1,
    duration: '30s',
    thresholds: DEFAULT_THRESHOLDS,
};

export default function () {
    // Health check
    var healthRes = http.get(BASE_URL + '/api/health');
    check(healthRes, {
        'health: status 200': function (r) { return r.status === 200; },
        'health: body has status': function (r) { return JSON.parse(r.body).status === 'healthy'; },
    });

    sleep(0.5);

    // Events
    var eventsRes = http.get(BASE_URL + '/api/events?year=' + YEAR);
    check(eventsRes, {
        'events: status 200': function (r) { return r.status === 200; },
        'events: has data array': function (r) { return Array.isArray(JSON.parse(r.body).data); },
    });

    sleep(0.5);

    // Event teams
    var teamsRes = http.get(BASE_URL + '/api/event/' + EVENT_KEY + '/teams');
    check(teamsRes, {
        'event-teams: status 200': function (r) { return r.status === 200; },
        'event-teams: has data': function (r) { return JSON.parse(r.body).data !== undefined; },
    });

    sleep(0.5);
}
