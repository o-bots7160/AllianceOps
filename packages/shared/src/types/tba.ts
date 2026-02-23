/** TBA Event (simplified) */
export interface TBAEvent {
  key: string;
  name: string;
  event_code: string;
  event_type: number;
  city: string;
  state_prov: string;
  country: string;
  start_date: string;
  end_date: string;
  year: number;
  week: number | null;
  webcasts: TBAWebcast[];
}

export interface TBAWebcast {
  type: string;
  channel: string;
}

/** TBA Match */
export interface TBAMatch {
  key: string;
  comp_level: 'qm' | 'ef' | 'qf' | 'sf' | 'f';
  set_number: number;
  match_number: number;
  alliances: {
    red: TBAAlliance;
    blue: TBAAlliance;
  };
  winning_alliance: 'red' | 'blue' | '';
  event_key: string;
  time: number | null;
  actual_time: number | null;
  predicted_time: number | null;
  score_breakdown: Record<string, TBAScoreBreakdown> | null;
}

export interface TBAAlliance {
  team_keys: string[];
  score: number;
  surrogate_team_keys: string[];
  dq_team_keys: string[];
}

/** TBA Score Breakdown — season-specific, so we use a flexible record */
export interface TBAScoreBreakdown {
  [key: string]: unknown;
}

/** TBA Team (simplified) */
export interface TBATeam {
  key: string;
  team_number: number;
  nickname: string;
  name: string;
  city: string;
  state_prov: string;
  country: string;
  rookie_year: number;
}

/** TBA Ranking */
export interface TBARanking {
  rankings: TBARankingEntry[];
}

export interface TBARankingEntry {
  rank: number;
  team_key: string;
  record: { wins: number; losses: number; ties: number };
  qual_average: number | null;
  matches_played: number;
  dq: number;
  sort_orders: number[];
  extra_stats: number[];
}
