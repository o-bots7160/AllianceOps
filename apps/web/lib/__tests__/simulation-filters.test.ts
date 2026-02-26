import { describe, it, expect } from 'vitest';
import { filterMatchesByCursor, getNextMatch, getTeamRecord } from '../simulation-filters';

const makeMatch = (
  num: number,
  redScore = 50,
  blueScore = 45,
  winner = 'red',
  compLevel = 'qm' as string,
  setNumber = 1,
) => ({
  key: `2025test_${compLevel}${setNumber}m${num}`,
  comp_level: compLevel,
  set_number: setNumber,
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

  it('handles mixed match types with cursor', () => {
    const mixed = [
      makeMatch(1, 50, 45, 'red', 'qm'),
      makeMatch(2, 60, 55, 'red', 'qm'),
      makeMatch(1, 70, 65, 'red', 'sf', 1),
      makeMatch(1, -1, -1, '', 'f', 1),
    ];
    // Cursor at 3 = first 3 in competition order (Q1, Q2, SF1-1)
    const result = filterMatchesByCursor(mixed, 3);
    expect(result[0].alliances.red.score).toBe(50); // Q1 played
    expect(result[1].alliances.red.score).toBe(60); // Q2 played
    expect(result[2].alliances.red.score).toBe(70); // SF1-1 played
    expect(result[3].alliances.red.score).toBe(-1); // F1-1 unplayed
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

  it('finds next match in playoffs', () => {
    const mixed = [makeMatch(1, 50, 45, 'red', 'qm'), makeMatch(1, -1, -1, '', 'sf', 1)];
    const next = getNextMatch(mixed, 'frc100', null);
    expect(next?.comp_level).toBe('sf');
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

  it('includes playoff matches in record', () => {
    const mixed = [makeMatch(1, 50, 45, 'red', 'qm'), makeMatch(1, 60, 55, 'red', 'sf', 1)];
    const record = getTeamRecord(mixed, 'frc100', null);
    expect(record).toEqual({ wins: 2, losses: 0, ties: 0 });
  });
});
