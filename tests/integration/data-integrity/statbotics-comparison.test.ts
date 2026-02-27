import { describe, it, expect } from 'vitest';
import { get, post } from '../helpers/api-client';
import { YEAR, EVENT_KEY, TEAM_7160_NUMBER, TEAM_6328_NUMBER } from '../helpers/test-data';

const STATBOTICS_BASE = 'https://api.statbotics.io/v3';

// ─── Statbotics raw types (pre-normalization) ────────────
interface StatboticsRawEPA {
  total_points: { mean: number };
  unitless: number;
  breakdown?: Record<string, number>;
  stats?: { start: number; pre_elim: number; mean: number; max: number };
}

interface StatboticsRawRecord {
  qual: { wins: number; losses: number; ties: number; winrate: number };
  total: { wins: number; losses: number; ties: number; winrate: number };
}

interface StatboticsRawTeamEvent {
  team: number;
  event: string;
  epa: StatboticsRawEPA;
  record: StatboticsRawRecord;
}

interface StatboticsRawSiteResponse {
  team_events: StatboticsRawSiteEvent[];
}

interface StatboticsRawSiteEvent {
  event: string;
  epa: StatboticsRawEPA;
  record: StatboticsRawRecord;
}

// ─── AllianceOps API normalized types ────────────────────
interface NormalizedEPA {
  total: number;
  auto: number;
  teleop: number;
  endgame: number;
  unitless: number;
}

interface EnrichedTeam {
  team_number: number;
  nickname: string;
  epa: NormalizedEPA | null;
  eventRecord: { wins: number; losses: number; ties: number } | null;
  winrate: number | null;
}

interface SiteEvent {
  eventKey: string;
  epa: NormalizedEPA;
  startEpa: number;
  preElimEpa: number;
  record: { wins: number; losses: number; ties: number };
}

interface Envelope<T> {
  data: T;
  meta: { lastRefresh: string; stale: boolean; ttlClass: string };
}

async function statboticsGet<T>(path: string): Promise<T> {
  const res = await fetch(`${STATBOTICS_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Statbotics request failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

describe('Statbotics Data Integrity', () => {
  it('event teams have the same set of teams as Statbotics', async () => {
    const [ours, statbotics] = await Promise.all([
      get<Envelope<EnrichedTeam[]>>(`/api/event/${EVENT_KEY}/teams`),
      statboticsGet<StatboticsRawTeamEvent[]>(`/team_events?event=${EVENT_KEY}`),
    ]);

    expect(ours.status).toBe(200);

    const ourNumbers = new Set(ours.body.data.map((t) => t.team_number));
    const statNumbers = new Set(statbotics.map((t) => t.team));

    // Every Statbotics team should appear in our response
    for (const num of statNumbers) {
      expect(ourNumbers.has(num), `Missing team ${num} from API response`).toBe(true);
    }
    // Count should match
    expect(ourNumbers.size).toBe(statNumbers.size);
  });

  it('enriched EPA totals match Statbotics values', async () => {
    const [ours, statbotics] = await Promise.all([
      get<Envelope<EnrichedTeam[]>>(`/api/event/${EVENT_KEY}/teams`),
      statboticsGet<StatboticsRawTeamEvent[]>(`/team_events?event=${EVENT_KEY}`),
    ]);

    expect(ours.status).toBe(200);

    const ourByNumber = new Map(ours.body.data.map((t) => [t.team_number, t]));

    // Spot-check EPA for every team that has data
    for (const raw of statbotics) {
      const enriched = ourByNumber.get(raw.team);
      expect(enriched, `Team ${raw.team} missing from API`).toBeDefined();

      if (enriched?.epa) {
        // total EPA should match the normalized value
        expect(enriched.epa.total).toBeCloseTo(raw.epa.total_points.mean, 1);
        expect(enriched.epa.unitless).toBeCloseTo(raw.epa.unitless, 1);
      }
    }
  });

  it('enriched win/loss records match Statbotics', async () => {
    const [ours, statbotics] = await Promise.all([
      get<Envelope<EnrichedTeam[]>>(`/api/event/${EVENT_KEY}/teams`),
      statboticsGet<StatboticsRawTeamEvent[]>(`/team_events?event=${EVENT_KEY}`),
    ]);

    expect(ours.status).toBe(200);

    const ourByNumber = new Map(ours.body.data.map((t) => [t.team_number, t]));

    for (const raw of statbotics) {
      const enriched = ourByNumber.get(raw.team);
      if (enriched?.eventRecord && raw.record?.qual) {
        expect(enriched.eventRecord.wins).toBe(raw.record.qual.wins);
        expect(enriched.eventRecord.losses).toBe(raw.record.qual.losses);
        expect(enriched.eventRecord.ties).toBe(raw.record.qual.ties);
      }
      if (enriched?.winrate != null && raw.record?.total?.winrate != null) {
        expect(enriched.winrate).toBeCloseTo(raw.record.total.winrate, 2);
      }
    }
  });

  it('team site EPA timeline matches Statbotics for team 7160', async () => {
    const [ours, rawSite] = await Promise.all([
      get<Envelope<SiteEvent[]>>(`/api/team/${TEAM_7160_NUMBER}/site?year=${YEAR}`),
      statboticsGet<StatboticsRawSiteResponse>(`/site/team/${TEAM_7160_NUMBER}/${YEAR}`),
    ]);

    const statEvents = rawSite.team_events ?? [];

    expect(ours.status).toBe(200);
    expect(Array.isArray(ours.body.data)).toBe(true);

    // Should have the same number of events
    expect(ours.body.data.length).toBe(statEvents.length);

    // Match EPA totals per event
    const ourByEvent = new Map(ours.body.data.map((e) => [e.eventKey, e]));
    for (const raw of statEvents) {
      const ourEvent = ourByEvent.get(raw.event);
      expect(ourEvent, `Missing event ${raw.event} from site response`).toBeDefined();
      if (ourEvent) {
        // Final EPA total
        expect(ourEvent.epa.total).toBeCloseTo(raw.epa.total_points.mean, 1);
        // Start EPA (number derived from epa.stats.start)
        if (raw.epa.stats?.start != null) {
          expect(ourEvent.startEpa).toBeCloseTo(raw.epa.stats.start, 1);
        }
        // Record
        expect(ourEvent.record.wins).toBe(raw.record.qual.wins);
        expect(ourEvent.record.losses).toBe(raw.record.qual.losses);
      }
    }
  });

  it('batch output contains same EPA data as individual calls', async () => {
    const [batch, individual7160, individual6328] = await Promise.all([
      post<Envelope<Record<number, SiteEvent[]>>>('/api/teams/site-batch', {
        teamNumbers: [TEAM_7160_NUMBER, TEAM_6328_NUMBER],
        year: YEAR,
      }),
      get<Envelope<SiteEvent[]>>(`/api/team/${TEAM_7160_NUMBER}/site?year=${YEAR}`),
      get<Envelope<SiteEvent[]>>(`/api/team/${TEAM_6328_NUMBER}/site?year=${YEAR}`),
    ]);

    expect(batch.status).toBe(200);
    expect(individual7160.status).toBe(200);
    expect(individual6328.status).toBe(200);

    const batch7160 = batch.body.data[TEAM_7160_NUMBER];
    const batch6328 = batch.body.data[TEAM_6328_NUMBER];

    expect(Array.isArray(batch7160)).toBe(true);
    expect(Array.isArray(batch6328)).toBe(true);

    // Batch should have the same number of events as individual calls
    expect(batch7160.length).toBe(individual7160.body.data.length);
    expect(batch6328.length).toBe(individual6328.body.data.length);

    // Spot-check: first event EPA totals match between batch and individual
    if (batch7160.length > 0) {
      expect(batch7160[0].epa.total).toBe(individual7160.body.data[0].epa.total);
      expect(batch7160[0].epa.auto).toBe(individual7160.body.data[0].epa.auto);
      expect(batch7160[0].epa.teleop).toBe(individual7160.body.data[0].epa.teleop);
      expect(batch7160[0].epa.endgame).toBe(individual7160.body.data[0].epa.endgame);
      expect(batch7160[0].record.wins).toBe(individual7160.body.data[0].record.wins);
    }
    if (batch6328.length > 0) {
      expect(batch6328[0].epa.total).toBe(individual6328.body.data[0].epa.total);
      expect(batch6328[0].record.wins).toBe(individual6328.body.data[0].record.wins);
    }
  });
});
