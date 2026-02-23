import type {
  StatboticsTeamYear,
  StatboticsTeamEvent,
  StatboticsMatch,
} from '../types/statbotics.js';

const STATBOTICS_BASE_URL = 'https://api.statbotics.io/v3';

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
    return this.request<StatboticsTeamYear>(`/team_year/${team}/${year}`);
  }

  async getTeamEvent(team: number, event: string): Promise<StatboticsTeamEvent> {
    return this.request<StatboticsTeamEvent>(`/team_event/${team}/${event}`);
  }

  async getMatch(matchKey: string): Promise<StatboticsMatch> {
    return this.request<StatboticsMatch>(`/match/${matchKey}`);
  }

  async getEventTeams(event: string): Promise<StatboticsTeamEvent[]> {
    return this.request<StatboticsTeamEvent[]>(`/team_events?event=${event}`);
  }

  async getEventMatches(event: string): Promise<StatboticsMatch[]> {
    return this.request<StatboticsMatch[]>(`/matches?event=${event}`);
  }
}
