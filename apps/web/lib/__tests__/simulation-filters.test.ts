import { describe, it, expect } from 'vitest';
import { filterMatchesByCursor, getNextMatch, getTeamRecord } from '../simulation-filters';

const makeMatch = (num: number, redScore = 50, blueScore = 45, winner = 'red') => ({
  key: `2025test_qm${num}`,
  comp_level: 'qm' as const,
  match_number: num,
  alliances: {
    red: { team_keys: ['frc100', 'frc200', 'frc300'], score: redScore },
    blue: { team_keys: ['frc400', 'frc500', 'frc600'], score: blueScore },
  },
  winning_alliance: winner,
});

describe('filterMatchesByCursor', () => {
  const matches = [makeMatch(1), makeMatch(2), makeMatch(3, -1, -1, '')];

  it('returns all matches unmodified when cursor is null', () => {
    const result = filterMatchesByCursor(matches, null);
    expect(result).toEqual(matches);
  });

  it('marks matches beyond cursor as unplayed', () => {
    const result = filterMatchesByCursor(matches, 1);
    expect(result[0].alliances.red.score).toBe(50);
    expect(result[1].alliances.red.score).toBe(-1);
    expect(result[1].alliances.blue.score).toBe(-1);
    expect(result[1].winning_alliance).toBe('');
  });

  it('keeps all matches when cursor equals total', () => {
    const result = filterMatchesByCursor(matches, 3);
    expect(result[0].alliances.red.score).toBe(50);
    expect(result[1].alliances.red.score).toBe(50);
    expect(result[2].alliances.red.score).toBe(-1); // already unplayed
  });

  it('handles empty array', () => {
    expect(filterMatchesByCursor([], 5)).toEqual([]);
  });
});

describe('getNextMatch', () => {
  const matches = [makeMatch(1), makeMatch(2), makeMatch(3, -1, -1, '')];

  it('finds next unplayed match for team without cursor', () => {
    const next = getNextMatch(matches, 'frc100', null);
    expect(next?.match_number).toBe(3);
  });

  it('finds next unplayed match respecting cursor', () => {
    const next = getNextMatch(matches, 'frc100', 1);
    expect(next?.match_number).toBe(2);
  });

  it('returns undefined when team is not in any match', () => {
    const next = getNextMatch(matches, 'frc999', null);
    expect(next).toBeUndefined();
  });
});

describe('getTeamRecord', () => {
  const matches = [
    makeMatch(1, 50, 45, 'red'),
    makeMatch(2, 30, 40, 'blue'),
    makeMatch(3, -1, -1, ''),
  ];

  it('calculates full record without cursor', () => {
    const record = getTeamRecord(matches, 'frc100', null);
    expect(record).toEqual({ wins: 1, losses: 1, ties: 0 });
  });

  it('calculates record up to cursor', () => {
    const record = getTeamRecord(matches, 'frc100', 1);
    expect(record).toEqual({ wins: 1, losses: 0, ties: 0 });
  });

  it('returns zero record when cursor is before any matches', () => {
    const record = getTeamRecord(matches, 'frc100', 0);
    expect(record).toEqual({ wins: 0, losses: 0, ties: 0 });
  });

  it('returns zero record for team not in matches', () => {
    const record = getTeamRecord(matches, 'frc999', null);
    expect(record).toEqual({ wins: 0, losses: 0, ties: 0 });
  });

  it('tracks blue alliance team correctly', () => {
    const record = getTeamRecord(matches, 'frc400', null);
    expect(record).toEqual({ wins: 1, losses: 1, ties: 0 });
  });
});
