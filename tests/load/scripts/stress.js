/**
 * k6 stress test — peak load profile.
 * Ramp: 0→50 VUs / 1min → sustain 3min → ramp down 1min.
 * Manual dispatch only — not run in CI by default.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, YEAR, EVENT_KEY, STRESS_THRESHOLDS } from '../helpers/config.js';
import { COACH_7160_HEADERS } from '../helpers/auth.js';

export var options = {
    stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
    ],
    thresholds: STRESS_THRESHOLDS,
};

export default function () {
    var rand = Math.random();

    if (rand < 0.20) {
        group('health', function () {
            var res = http.get(BASE_URL + '/api/health');
            check(res, { 'health ok': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.35) {
        group('events', function () {
            var res = http.get(BASE_URL + '/api/events?year=' + YEAR);
            check(res, { 'events ok': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.50) {
        group('event-teams', function () {
            var res = http.get(BASE_URL + '/api/event/' + EVENT_KEY + '/teams');
            check(res, { 'event-teams ok': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.60) {
        group('event-matches', function () {
            var res = http.get(BASE_URL + '/api/event/' + EVENT_KEY + '/matches');
            check(res, { 'event-matches ok': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.70) {
        group('event-rankings', function () {
            var res = http.get(BASE_URL + '/api/event/' + EVENT_KEY + '/rankings');
            check(res, { 'event-rankings ok': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.80) {
        group('team-site', function () {
            var res = http.get(BASE_URL + '/api/team/7160/site?year=' + YEAR);
            check(res, { 'team-site ok': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.85) {
        group('site-batch', function () {
            var payload = JSON.stringify({ teamNumbers: [7160, 6328], year: YEAR });
            var res = http.post(BASE_URL + '/api/teams/site-batch', payload, {
                headers: { 'Content-Type': 'application/json' },
            });
            check(res, { 'site-batch ok': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.90) {
        group('me', function () {
            var res = http.get(BASE_URL + '/api/me', { headers: COACH_7160_HEADERS });
            check(res, { 'me ok': function (r) { return r.status === 200; } });
        });
    } else {
        group('teams-mine', function () {
            var res = http.get(BASE_URL + '/api/teams/mine', { headers: COACH_7160_HEADERS });
            check(res, { 'teams-mine ok': function (r) { return r.status === 200; } });
        });
    }

    sleep(0.2 + Math.random() * 0.5);
}
