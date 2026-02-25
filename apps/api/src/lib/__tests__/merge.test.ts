import { describe, it, expect } from 'vitest';
import type { TBATeam, TBAMatch, StatboticsTeamEvent, StatboticsMatch } from '@allianceops/shared';
import { mergeTeams, mergeMatches } from '../merge.js';

const makeTBATeam = (num: number): TBATeam => ({
  key: `frc${num}`,
  team_number: num,
  nickname: `Team ${num}`,
  name: `Team ${num} Full Name`,
  city: 'Test City',
  state_prov: 'MI',
  country: 'USA',
  rookie_year: 2020,
});

const makeStatboticsTeam = (num: number): StatboticsTeamEvent => ({
  team: num,
  event: '2025test',
  epa: { total: 30, auto: 10, teleop: 15, endgame: 5, unitless: 0.8 },
  record: { wins: 5, losses: 2, ties: 0 },
  winrate: 0.71,
});

const makeTBAMatch = (num: number): TBAMatch => ({
  key: `2025test_qm${num}`,
  comp_level: 'qm',
  set_number: 1,
  match_number: num,
  alliances: {
    red: { team_keys: ['frc100', 'frc200', 'frc300'], score: 50, surrogate_team_keys: [], dq_team_keys: [] },
    blue: { team_keys: ['frc400', 'frc500', 'frc600'], score: 45, surrogate_team_keys: [], dq_team_keys: [] },
  },
  winning_alliance: 'red',
  event_key: '2025test',
  time: 1700000000 + num * 600,
  actual_time: null,
  predicted_time: null,
  score_breakdown: { red: { totalPoints: 50 }, blue: { totalPoints: 45 } },
});

const makeStatboticsMatch = (num: number): StatboticsMatch => ({
  match: `2025test_qm${num}`,
  pred: { winner: 'red', red_win_prob: 0.65, red_score: 55, blue_score: 42 },
  result: { winner: 'red', red_score: 50, blue_score: 45 },
});

describe('mergeTeams', () => {
  it('merges TBA teams with Statbotics EPA data', () => {
    const tbaTeams = [makeTBATeam(100), makeTBATeam(200)];
    const sbTeams = [makeStatboticsTeam(100)];

    const result = mergeTeams(tbaTeams, sbTeams);

    expect(result).toHaveLength(2);
    expect(result[0].team_number).toBe(100);
    expect(result[0].epa).toEqual({ total: 30, auto: 10, teleop: 15, endgame: 5, unitless: 0.8 });
    expect(result[0].eventRecord).toEqual({ wins: 5, losses: 2, ties: 0 });
    expect(result[0].winrate).toBe(0.71);
    expect(result[0].nickname).toBe('Team 100');
  });

  it('returns null EPA fields when Statbotics data is missing', () => {
    const tbaTeams = [makeTBATeam(999)];
    const sbTeams: StatboticsTeamEvent[] = [];

    const result = mergeTeams(tbaTeams, sbTeams);

    expect(result).toHaveLength(1);
    expect(result[0].team_number).toBe(999);
    expect(result[0].epa).toBeNull();
    expect(result[0].eventRecord).toBeNull();
    expect(result[0].winrate).toBeNull();
  });

  it('handles empty inputs', () => {
    expect(mergeTeams([], [])).toEqual([]);
  });
});

describe('mergeMatches', () => {
  it('merges TBA matches with Statbotics predictions', () => {
    const tbaMatches = [makeTBAMatch(1), makeTBAMatch(2)];
    const sbMatches = [makeStatboticsMatch(1)];

    const result = mergeMatches(tbaMatches, sbMatches, false);

    expect(result).toHaveLength(2);
    expect(result[0].prediction).toEqual({
      winner: 'red',
      red_win_prob: 0.65,
      red_score: 55,
      blue_score: 42,
    });
    expect(result[1].prediction).toBeNull();
  });

  it('strips score_breakdown when includeBreakdowns is false', () => {
    const tbaMatches = [makeTBAMatch(1)];
    const result = mergeMatches(tbaMatches, [], false);

    expect(result[0].score_breakdown).toBeNull();
  });

  it('preserves score_breakdown when includeBreakdowns is true', () => {
    const tbaMatches = [makeTBAMatch(1)];
    const result = mergeMatches(tbaMatches, [], true);

    expect(result[0].score_breakdown).toEqual({
      red: { totalPoints: 50 },
      blue: { totalPoints: 45 },
    });
  });

  it('handles empty inputs', () => {
    expect(mergeMatches([], [], false)).toEqual([]);
  });
});
