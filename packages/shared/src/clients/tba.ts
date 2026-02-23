import type {
  TBAEvent,
  TBAMatch,
  TBATeam,
  TBARanking,
} from '../types/tba.js';

const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';

export class TBAClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = TBA_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'X-TBA-Auth-Key': this.apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TBA API error: ${response.status} ${response.statusText} for ${path}`);
    }

    return response.json() as Promise<T>;
  }

  async getEvents(year: number): Promise<TBAEvent[]> {
    return this.request<TBAEvent[]>(`/events/${year}`);
  }

  async getEvent(eventKey: string): Promise<TBAEvent> {
    return this.request<TBAEvent>(`/event/${eventKey}`);
  }

  async getEventMatches(eventKey: string): Promise<TBAMatch[]> {
    return this.request<TBAMatch[]>(`/event/${eventKey}/matches`);
  }

  async getEventTeams(eventKey: string): Promise<TBATeam[]> {
    return this.request<TBATeam[]>(`/event/${eventKey}/teams`);
  }

  async getEventRankings(eventKey: string): Promise<TBARanking> {
    return this.request<TBARanking>(`/event/${eventKey}/rankings`);
  }

  async getTeamEventStatus(
    teamKey: string,
    eventKey: string,
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(
      `/team/${teamKey}/event/${eventKey}/status`,
    );
  }

  async getMatch(matchKey: string): Promise<TBAMatch> {
    return this.request<TBAMatch>(`/match/${matchKey}`);
  }
}
