import type {
  StatboticsTeamYear,
  StatboticsTeamEvent,
  StatboticsMatch,
  StatboticsEPA,
  StatboticsRecord,
  StatboticsTeamSiteEvent,
} from '../types/statbotics.js';

const STATBOTICS_BASE_URL = 'https://api.statbotics.io/v3';

/** Raw Statbotics v3 API response shapes (differ from our normalized types) */
interface RawStatboticsEPA {
  total_points?: { mean: number };
  unitless?: number;
  breakdown?: Record<string, number>;
}

interface RawStatboticsRecord {
  qual?: { wins: number; losses: number; ties: number; winrate: number };
  total?: { wins: number; losses: number; ties: number; winrate: number };
}

interface RawTeamEvent {
  team: number;
  event: string;
  epa: RawStatboticsEPA;
  record: RawStatboticsRecord;
}

interface RawTeamYear {
  team: number;
  year: number;
  epa: RawStatboticsEPA;
  record: RawStatboticsRecord;
  norm_epa?: number;
}

function normalizeEPA(raw: RawStatboticsEPA | null | undefined): StatboticsEPA {
  const bd = raw?.breakdown;
  return {
    total: raw?.total_points?.mean ?? bd?.total_points ?? 0,
    auto: bd?.auto_points ?? 0,
    teleop: bd?.teleop_points ?? 0,
    endgame: bd?.endgame_points ?? 0,
    unitless: raw?.unitless ?? 0,
    breakdown: bd,
  };
}

function normalizeRecord(raw: RawStatboticsRecord | null | undefined): StatboticsRecord {
  const src = raw?.qual ?? raw?.total;
  return {
    wins: src?.wins ?? 0,
    losses: src?.losses ?? 0,
    ties: src?.ties ?? 0,
  };
}

export class StatboticsClient {
  private baseUrl: string;

  constructor(baseUrl: string = STATBOTICS_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `Statbotics API error: ${response.status} ${response.statusText} for ${path}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async getTeamYear(team: number, year: number): Promise<StatboticsTeamYear> {
    const raw = await this.request<RawTeamYear>(`/team_year/${team}/${year}`);
    return {
      team: raw.team,
      year: raw.year,
      epa: normalizeEPA(raw.epa),
      record: normalizeRecord(raw.record),
      winrate: raw.record?.total?.winrate ?? 0,
      norm_epa: raw.norm_epa ?? 0,
    };
  }

  async getTeamEvent(team: number, event: string): Promise<StatboticsTeamEvent> {
    const raw = await this.request<RawTeamEvent>(`/team_event/${team}/${event}`);
    return {
      team: raw.team,
      event: raw.event,
      epa: normalizeEPA(raw.epa),
      record: normalizeRecord(raw.record),
      winrate: raw.record?.total?.winrate ?? 0,
    };
  }

  async getMatch(matchKey: string): Promise<StatboticsMatch> {
    const raw = await this.request<{ key: string; pred: StatboticsMatch['pred']; result: StatboticsMatch['result'] }>(`/match/${matchKey}`);
    return { match: raw.key, pred: raw.pred, result: raw.result };
  }

  async getEventTeams(event: string): Promise<StatboticsTeamEvent[]> {
    const raw = await this.request<RawTeamEvent[]>(`/team_events?event=${event}`);
    return raw.map((r) => ({
      team: r.team,
      event: r.event,
      epa: normalizeEPA(r.epa),
      record: normalizeRecord(r.record),
      winrate: r.record?.total?.winrate ?? 0,
    }));
  }

  async getEventMatches(event: string): Promise<StatboticsMatch[]> {
    const raw = await this.request<{ key: string; pred: StatboticsMatch['pred']; result: StatboticsMatch['result'] }[]>(`/matches?event=${event}`);
    return raw.map((r) => ({ match: r.key, pred: r.pred, result: r.result }));
  }

  /** Fetch per-event EPA timeline for a team from the Statbotics site endpoint. */
  async getTeamSite(team: number, year: number): Promise<StatboticsTeamSiteEvent[]> {
    interface RawSiteEvent {
      event: string;
      epa: RawStatboticsEPA & {
        stats?: { start: number; pre_elim: number; mean: number; max: number };
      };
      record: RawStatboticsRecord;
    }

    const raw = await this.request<{
      team_events: RawSiteEvent[];
    }>(`/site/team/${team}/${year}`);

    return (raw.team_events ?? []).map((te) => ({
      eventKey: te.event,
      epa: normalizeEPA(te.epa),
      startEpa: te.epa?.stats?.start ?? normalizeEPA(te.epa).total,
      preElimEpa: te.epa?.stats?.pre_elim ?? normalizeEPA(te.epa).total,
      record: normalizeRecord(te.record),
    }));
  }
}
