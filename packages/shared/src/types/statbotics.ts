/** Statbotics team-year summary */
export interface StatboticsTeamYear {
  team: number;
  year: number;
  epa: StatboticsEPA;
  record: StatboticsRecord;
  winrate: number;
  norm_epa: number;
}

/** Statbotics team-event summary */
export interface StatboticsTeamEvent {
  team: number;
  event: string;
  epa: StatboticsEPA;
  record: StatboticsRecord;
  winrate: number;
}

/** Statbotics match prediction */
export interface StatboticsMatch {
  match: string;
  pred: StatboticsMatchPrediction;
  result: StatboticsMatchResult | null;
}

export interface StatboticsEPA {
  total: number;
  auto: number;
  teleop: number;
  endgame: number;
  unitless: number;
}

export interface StatboticsRecord {
  wins: number;
  losses: number;
  ties: number;
}

export interface StatboticsMatchPrediction {
  winner: 'red' | 'blue';
  red_win_prob: number;
  red_score: number;
  blue_score: number;
}

export interface StatboticsMatchResult {
  winner: 'red' | 'blue' | '';
  red_score: number;
  blue_score: number;
}
