export interface EnrichedTeam {
  team_number: number;
  nickname: string;
  epa: {
    total: number;
    auto: number;
    teleop: number;
    endgame: number;
    breakdown?: Record<string, number>;
  } | null;
  eventRecord: { wins: number; losses: number; ties: number } | null;
  winrate: number | null;
  tbaRank: number | null;
}
