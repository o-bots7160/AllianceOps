import { describe, it, expect } from 'vitest';
import { get } from '../helpers/api-client';
import { YEAR, EVENT_KEY, TEAM_7160_NUMBER } from '../helpers/test-data';

const TBA_BASE = 'https://www.thebluealliance.com/api/v3';
const TBA_API_KEY = process.env.TBA_API_KEY;

function tbaHeaders(): Record<string, string> {
  if (!TBA_API_KEY) {
    throw new Error('TBA_API_KEY env var is required for data integrity tests');
  }
  return { 'X-TBA-Auth-Key': TBA_API_KEY };
}

async function tbaGet<T>(path: string): Promise<T> {
  const res = await fetch(`${TBA_BASE}${path}`, { headers: tbaHeaders() });
  if (!res.ok) {
    throw new Error(`TBA request failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

describe.skipIf(!TBA_API_KEY)('TBA Data Integrity', () => {
  it('events count and keys match TBA', async () => {
    const [ours, tba] = await Promise.all([
      get<{ data: Array<{ key: string }> }>(`/api/events?year=${YEAR}`),
      tbaGet<Array<{ key: string }>>(`/events/${YEAR}/simple`),
    ]);

    expect(ours.status).toBe(200);
    // Our count should match TBA's — allow small variance from filtering
    const ourKeys = new Set(ours.body.data.map((e) => e.key));
    const tbaKeys = new Set(tba.map((e) => e.key));

    // All our events should exist in TBA
    for (const key of ourKeys) {
      expect(tbaKeys.has(key)).toBe(true);
    }

    // Counts should be similar (we may filter some event types)
    const ratio = ours.body.data.length / tba.length;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThanOrEqual(1.0);
  });

  it('match count and alliances match TBA for event', async () => {
    interface MatchData {
      key: string;
      alliances: {
        red: { team_keys: string[]; score: number };
        blue: { team_keys: string[]; score: number };
      };
    }

    const [ours, tba] = await Promise.all([
      get<{ data: MatchData[] }>(`/api/event/${EVENT_KEY}/matches`),
      tbaGet<Array<{ key: string; alliances: MatchData['alliances'] }>>(
        `/event/${EVENT_KEY}/matches/simple`,
      ),
    ]);

    expect(ours.status).toBe(200);
    expect(ours.body.data.length).toBe(tba.length);

    // Verify match keys are identical
    const ourKeys = new Set(ours.body.data.map((m) => m.key));
    for (const m of tba) {
      expect(ourKeys.has(m.key), `Missing match ${m.key}`).toBe(true);
    }

    // Spot-check: alliance scores match for completed matches
    const tbaByKey = new Map(tba.map((m) => [m.key, m]));
    for (const match of ours.body.data) {
      const tbaMatch = tbaByKey.get(match.key);
      if (tbaMatch && match.alliances?.red?.score != null && match.alliances.red.score >= 0) {
        expect(match.alliances.red.score).toBe(tbaMatch.alliances.red.score);
        expect(match.alliances.blue.score).toBe(tbaMatch.alliances.blue.score);
        expect(match.alliances.red.team_keys).toEqual(tbaMatch.alliances.red.team_keys);
        expect(match.alliances.blue.team_keys).toEqual(tbaMatch.alliances.blue.team_keys);
      }
    }
  });

  it('all TBA team numbers present in our event teams', async () => {
    const [ours, tba] = await Promise.all([
      get<{ data: Array<{ team_number: number }> }>(`/api/event/${EVENT_KEY}/teams`),
      tbaGet<Array<{ team_number: number }>>(`/event/${EVENT_KEY}/teams/simple`),
    ]);

    expect(ours.status).toBe(200);
    const ourNumbers = new Set(ours.body.data.map((t) => t.team_number));
    for (const team of tba) {
      expect(ourNumbers.has(team.team_number)).toBe(true);
    }
  });

  it('ranking positions and records match TBA', async () => {
    interface RankingEntry {
      rank: number;
      team_key: string;
      record: { wins: number; losses: number; ties: number };
      matches_played: number;
    }

    const [ours, tba] = await Promise.all([
      get<{ data: { rankings: RankingEntry[] } }>(`/api/event/${EVENT_KEY}/rankings`),
      tbaGet<{ rankings: RankingEntry[] }>(`/event/${EVENT_KEY}/rankings`),
    ]);

    expect(ours.status).toBe(200);
    const ourRankings = ours.body.data?.rankings ?? [];
    const tbaRankings = tba.rankings ?? [];

    if (tbaRankings.length > 0) {
      // Same number of ranked teams
      expect(ourRankings.length).toBe(tbaRankings.length);

      // Top 5 ranks should match exactly (team + position)
      for (let i = 0; i < Math.min(5, tbaRankings.length); i++) {
        expect(ourRankings[i].rank).toBe(tbaRankings[i].rank);
        expect(ourRankings[i].team_key).toBe(tbaRankings[i].team_key);
      }

      // Verify W-L-T records match for all teams
      const tbaByTeam = new Map(tbaRankings.map((r) => [r.team_key, r]));
      for (const ranking of ourRankings) {
        const tbaRanking = tbaByTeam.get(ranking.team_key);
        expect(tbaRanking, `Missing ranking for ${ranking.team_key}`).toBeDefined();
        if (tbaRanking) {
          expect(ranking.record.wins).toBe(tbaRanking.record.wins);
          expect(ranking.record.losses).toBe(tbaRanking.record.losses);
          expect(ranking.matches_played).toBe(tbaRanking.matches_played);
        }
      }
    }
  });

  it('team events match TBA for team 7160', async () => {
    interface EventData {
      key: string;
      name: string;
      start_date: string;
      city: string;
    }

    const [ours, tba] = await Promise.all([
      get<{ data: EventData[] }>(`/api/team/${TEAM_7160_NUMBER}/events?year=${YEAR}`),
      tbaGet<EventData[]>(`/team/frc${TEAM_7160_NUMBER}/events/${YEAR}/simple`),
    ]);

    expect(ours.status).toBe(200);

    // Same event count
    expect(ours.body.data.length).toBe(tba.length);

    // Verify keys, names, and dates match
    const ourByKey = new Map(ours.body.data.map((e) => [e.key, e]));
    for (const tbaEvent of tba) {
      const ours = ourByKey.get(tbaEvent.key);
      expect(ours, `Missing event ${tbaEvent.key}`).toBeDefined();
      if (ours) {
        expect(ours.name).toBe(tbaEvent.name);
        expect(ours.start_date).toBe(tbaEvent.start_date);
      }
    }
  });
});
