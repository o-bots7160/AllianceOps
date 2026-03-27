import type { EnrichedTeam as BaseEnrichedTeam } from '@/lib/types';

export interface EnrichedTeam extends BaseEnrichedTeam {
  qualAverage: number | null;
}

export interface PicklistEntry {
  teamNumber: number;
  nickname: string;
  score: number;
  epaTotal: number;
  epaAuto: number;
  epaTeleop: number;
  epaEndgame: number;
  epaRank: number;
  tbaRank: number | null;
  qualAverage: number | null;
  rank: number;
  excluded: boolean;
  tags: string[];
  notes: string;
}

export interface SavedPicklistEntry {
  teamNumber: number;
  rank: number;
  tags: string[] | string;
  notes: string | null;
  excluded: boolean;
}

export interface TBAMatch {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  winning_alliance: string;
}

export type SortDirection = 'asc' | 'desc';

export type SortKey =
  | 'manualRank'
  | 'team'
  | 'tbaRank'
  | 'analysis'
  | 'epaRank'
  | 'epaTotal'
  | 'epaAuto'
  | 'epaTeleop'
  | 'epaEndgame'
  | 'tags'
  | 'notes'
  | 'excluded';

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export type RankByOption = 'tbaRank' | 'epaTotal' | 'epaAuto' | 'epaTeleop' | 'epaEndgame';

export const RANK_BY_OPTIONS: { value: RankByOption; label: string }[] = [
  { value: 'tbaRank', label: 'TBA Rank' },
  { value: 'epaTotal', label: 'EPA Total' },
  { value: 'epaAuto', label: 'EPA Auto' },
  { value: 'epaTeleop', label: 'EPA Teleop' },
  { value: 'epaEndgame', label: 'EPA Endgame' },
];

export const POLL_INTERVAL_MS = 30_000;
