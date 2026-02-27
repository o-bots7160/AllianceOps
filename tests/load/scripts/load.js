/**
 * k6 load test — standard load profile.
 * Ramp: 0→20 VUs / 30s → sustain 2min → ramp down 30s.
 * 70% public endpoints, 30% authenticated.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, YEAR, EVENT_KEY, LOAD_THRESHOLDS } from '../helpers/config.js';
import { COACH_7160_HEADERS } from '../helpers/auth.js';

export var options = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '2m', target: 20 },
        { duration: '30s', target: 0 },
    ],
    thresholds: LOAD_THRESHOLDS,
};

export default function () {
    var rand = Math.random();

    if (rand < 0.15) {
        // Health check (15%)
        group('health', function () {
            var res = http.get(BASE_URL + '/api/health');
            check(res, { 'health 200': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.30) {
        // Events list (15%)
        group('events', function () {
            var res = http.get(BASE_URL + '/api/events?year=' + YEAR);
            check(res, { 'events 200': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.45) {
        // Event teams (15%)
        group('event-teams', function () {
            var res = http.get(BASE_URL + '/api/event/' + EVENT_KEY + '/teams');
            check(res, { 'event-teams 200': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.55) {
        // Event matches (10%)
        group('event-matches', function () {
            var res = http.get(BASE_URL + '/api/event/' + EVENT_KEY + '/matches');
            check(res, { 'event-matches 200': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.65) {
        // Event rankings (10%)
        group('event-rankings', function () {
            var res = http.get(BASE_URL + '/api/event/' + EVENT_KEY + '/rankings');
            check(res, { 'event-rankings 200': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.70) {
        // Team site (5%)
        group('team-site', function () {
            var res = http.get(BASE_URL + '/api/team/7160/site?year=' + YEAR);
            check(res, { 'team-site 200': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.80) {
        // Me (authenticated, 10%)
        group('me', function () {
            var res = http.get(BASE_URL + '/api/me', { headers: COACH_7160_HEADERS });
            check(res, { 'me 200': function (r) { return r.status === 200; } });
        });
    } else if (rand < 0.90) {
        // Teams mine (authenticated, 10%)
        group('teams-mine', function () {
            var res = http.get(BASE_URL + '/api/teams/mine', { headers: COACH_7160_HEADERS });
            check(res, { 'teams-mine 200': function (r) { return r.status === 200; } });
        });
    } else {
        // Team lookup (10%)
        group('teams-lookup', function () {
            var res = http.get(BASE_URL + '/api/teams/lookup/7160');
            check(res, { 'teams-lookup 200': function (r) { return r.status === 200; } });
        });
    }

    sleep(0.3 + Math.random() * 0.7);
}
