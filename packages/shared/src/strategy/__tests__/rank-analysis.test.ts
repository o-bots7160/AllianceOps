import { describe, it, expect } from 'vitest';
import { analyzeRankDiscrepancy, analyzeAllRankDiscrepancies } from '../rank-analysis.js';

function makeEpa(total: number) {
  return { total };
}

const FIELD_AVG = 10;

function makeMatch(
  key: string,
  matchNumber: number,
  redTeams: string[],
  blueTeams: string[],
  winner: 'red' | 'blue' | '',
) {
  return {
    key,
    matchNumber,
    redTeams,
    blueTeams,
    redScore: winner ? 100 : -1,
    blueScore: winner ? 80 : -1,
    winningAlliance: winner,
  };
}

describe('analyzeRankDiscrepancy', () => {
  it('returns accurate for small delta (±3)', () => {
    const team = { teamKey: 'frc100', tbaRank: 5, epaRank: 7 };
    const match = makeMatch(
      'qm1',
      1,
      ['frc100', 'frc200', 'frc300'],
      ['frc400', 'frc500', 'frc600'],
      'red',
    );
    const epaMap = {
      frc100: makeEpa(10),
      frc200: makeEpa(10),
      frc300: makeEpa(10),
      frc400: makeEpa(10),
      frc500: makeEpa(10),
      frc600: makeEpa(10),
    };

    const result = analyzeRankDiscrepancy(team, [match], epaMap, FIELD_AVG);
    expect(result.determination).toBe('accurate');
    expect(result.rankDelta).toBe(-2);
  });

  it('returns carried when TBA rank much better and partners are strong', () => {
    const team = { teamKey: 'frc100', tbaRank: 3, epaRank: 15 };
    const matches = [
      makeMatch('qm1', 1, ['frc100', 'frc200', 'frc300'], ['frc400', 'frc500', 'frc600'], 'red'),
      makeMatch('qm2', 2, ['frc100', 'frc700', 'frc800'], ['frc900', 'frc101', 'frc102'], 'red'),
    ];
    const epaMap = {
      frc100: makeEpa(6),
      frc200: makeEpa(15),
      frc300: makeEpa(14),
      frc700: makeEpa(16),
      frc800: makeEpa(13),
      frc400: makeEpa(10),
      frc500: makeEpa(10),
      frc600: makeEpa(10),
      frc900: makeEpa(10),
      frc101: makeEpa(10),
      frc102: makeEpa(10),
    };

    const result = analyzeRankDiscrepancy(team, matches, epaMap, FIELD_AVG);
    expect(result.determination).toBe('carried');
    expect(result.rankDelta).toBe(-12);
    expect(result.partnerStrength).toBeGreaterThan(1.1);
    expect(result.strongPartnerRecord.wins).toBe(2);
  });

  it('returns easy_schedule when opponents are weak', () => {
    const team = { teamKey: 'frc100', tbaRank: 2, epaRank: 10 };
    const matches = [
      makeMatch('qm1', 1, ['frc100', 'frc200', 'frc300'], ['frc400', 'frc500', 'frc600'], 'red'),
      makeMatch('qm2', 2, ['frc100', 'frc700', 'frc800'], ['frc900', 'frc101', 'frc102'], 'red'),
    ];
    const epaMap = {
      frc100: makeEpa(10),
      frc200: makeEpa(10),
      frc300: makeEpa(10),
      frc700: makeEpa(10),
      frc800: makeEpa(10),
      frc400: makeEpa(5),
      frc500: makeEpa(4),
      frc600: makeEpa(5),
      frc900: makeEpa(4),
      frc101: makeEpa(5),
      frc102: makeEpa(4),
    };

    const result = analyzeRankDiscrepancy(team, matches, epaMap, FIELD_AVG);
    expect(result.determination).toBe('easy_schedule');
    expect(result.opponentStrength).toBeLessThan(0.9);
  });

  it('returns underrated when TBA rank much worse and partners are weak', () => {
    const team = { teamKey: 'frc100', tbaRank: 20, epaRank: 5 };
    const matches = [
      makeMatch('qm1', 1, ['frc100', 'frc200', 'frc300'], ['frc400', 'frc500', 'frc600'], 'blue'),
      makeMatch('qm2', 2, ['frc100', 'frc700', 'frc800'], ['frc900', 'frc101', 'frc102'], 'blue'),
    ];
    const epaMap = {
      frc100: makeEpa(15),
      frc200: makeEpa(4),
      frc300: makeEpa(5),
      frc700: makeEpa(3),
      frc800: makeEpa(5),
      frc400: makeEpa(10),
      frc500: makeEpa(10),
      frc600: makeEpa(10),
      frc900: makeEpa(10),
      frc101: makeEpa(10),
      frc102: makeEpa(10),
    };

    const result = analyzeRankDiscrepancy(team, matches, epaMap, FIELD_AVG);
    expect(result.determination).toBe('underrated');
    expect(result.rankDelta).toBe(15);
    expect(result.partnerStrength).toBeLessThan(0.9);
    expect(result.weakPartnerRecord.losses).toBe(2);
  });

  it('returns tough_schedule when opponents are strong', () => {
    const team = { teamKey: 'frc100', tbaRank: 18, epaRank: 8 };
    const matches = [
      makeMatch('qm1', 1, ['frc100', 'frc200', 'frc300'], ['frc400', 'frc500', 'frc600'], 'blue'),
      makeMatch('qm2', 2, ['frc100', 'frc700', 'frc800'], ['frc900', 'frc101', 'frc102'], 'blue'),
    ];
    const epaMap = {
      frc100: makeEpa(12),
      frc200: makeEpa(10),
      frc300: makeEpa(10),
      frc700: makeEpa(10),
      frc800: makeEpa(10),
      frc400: makeEpa(16),
      frc500: makeEpa(15),
      frc600: makeEpa(14),
      frc900: makeEpa(15),
      frc101: makeEpa(16),
      frc102: makeEpa(14),
    };

    const result = analyzeRankDiscrepancy(team, matches, epaMap, FIELD_AVG);
    expect(result.determination).toBe('tough_schedule');
    expect(result.opponentStrength).toBeGreaterThan(1.1);
  });

  it('returns favorable for TBA-better with average schedule', () => {
    const team = { teamKey: 'frc100', tbaRank: 2, epaRank: 12 };
    const matches = [
      makeMatch('qm1', 1, ['frc100', 'frc200', 'frc300'], ['frc400', 'frc500', 'frc600'], 'red'),
    ];
    const epaMap = {
      frc100: makeEpa(10),
      frc200: makeEpa(10),
      frc300: makeEpa(10),
      frc400: makeEpa(10),
      frc500: makeEpa(10),
      frc600: makeEpa(10),
    };

    const result = analyzeRankDiscrepancy(team, matches, epaMap, FIELD_AVG);
    expect(result.determination).toBe('favorable');
  });

  it('returns unlucky for TBA-worse with average schedule', () => {
    const team = { teamKey: 'frc100', tbaRank: 18, epaRank: 8 };
    const matches = [
      makeMatch('qm1', 1, ['frc100', 'frc200', 'frc300'], ['frc400', 'frc500', 'frc600'], 'blue'),
    ];
    const epaMap = {
      frc100: makeEpa(10),
      frc200: makeEpa(10),
      frc300: makeEpa(10),
      frc400: makeEpa(10),
      frc500: makeEpa(10),
      frc600: makeEpa(10),
    };

    const result = analyzeRankDiscrepancy(team, matches, epaMap, FIELD_AVG);
    expect(result.determination).toBe('unlucky');
  });

  it('handles team with no matches', () => {
    const team = { teamKey: 'frc100', tbaRank: 5, epaRank: 5 };
    const result = analyzeRankDiscrepancy(team, [], {}, FIELD_AVG);
    expect(result.determination).toBe('accurate');
    expect(result.matchesPlayed).toBe(0);
    expect(result.partnerStrength).toBe(1);
    expect(result.opponentStrength).toBe(1);
  });

  it('handles missing EPA data by using field average', () => {
    const team = { teamKey: 'frc100', tbaRank: 3, epaRank: 15 };
    const match = makeMatch(
      'qm1',
      1,
      ['frc100', 'frc200', 'frc300'],
      ['frc400', 'frc500', 'frc600'],
      'red',
    );
    // No EPA data for any team
    const result = analyzeRankDiscrepancy(team, [match], {}, FIELD_AVG);
    expect(result.partnerStrength).toBe(1);
    expect(result.opponentStrength).toBe(1);
    // Still classifies based on delta
    expect(result.determination).toBe('favorable');
  });

  it('excludes self from partner EPA calculation', () => {
    const team = { teamKey: 'frc100', tbaRank: 5, epaRank: 5 };
    const match = makeMatch(
      'qm1',
      1,
      ['frc100', 'frc200', 'frc300'],
      ['frc400', 'frc500', 'frc600'],
      'red',
    );
    const epaMap = {
      frc100: makeEpa(20), // high EPA — should NOT inflate partnerStrength
      frc200: makeEpa(10),
      frc300: makeEpa(10),
      frc400: makeEpa(10),
      frc500: makeEpa(10),
      frc600: makeEpa(10),
    };

    const result = analyzeRankDiscrepancy(team, [match], epaMap, FIELD_AVG);
    // Partners are exactly at field avg, so partnerStrength should be 1.0
    expect(result.partnerStrength).toBe(1);
  });
});

describe('analyzeAllRankDiscrepancies', () => {
  it('returns a map of analyses for all teams', () => {
    const teams = [
      { teamKey: 'frc100', tbaRank: 5, epaRank: 5 },
      { teamKey: 'frc200', tbaRank: 1, epaRank: 10 },
    ];
    const match = makeMatch(
      'qm1',
      1,
      ['frc100', 'frc200', 'frc300'],
      ['frc400', 'frc500', 'frc600'],
      'red',
    );
    const epaMap = {
      frc100: makeEpa(10),
      frc200: makeEpa(10),
      frc300: makeEpa(10),
      frc400: makeEpa(10),
      frc500: makeEpa(10),
      frc600: makeEpa(10),
    };

    const result = analyzeAllRankDiscrepancies(teams, [match], epaMap);
    expect(result.size).toBe(2);
    expect(result.get('frc100')?.determination).toBe('accurate');
    expect(result.get('frc200')?.determination).toBe('favorable');
  });

  it('computes field average from provided EPA map', () => {
    const teams = [{ teamKey: 'frc100', tbaRank: 1, epaRank: 15 }];
    const match = makeMatch(
      'qm1',
      1,
      ['frc100', 'frc200', 'frc300'],
      ['frc400', 'frc500', 'frc600'],
      'red',
    );
    const epaMap = {
      frc100: makeEpa(5),
      frc200: makeEpa(20),
      frc300: makeEpa(18),
      frc400: makeEpa(8),
      frc500: makeEpa(8),
      frc600: makeEpa(7),
    };
    // Field avg = (5 + 20 + 18 + 8 + 8 + 7) / 6 = 11
    // Partner avg = (20 + 18) / 2 = 19
    // partnerStrength = 19 / 11 ≈ 1.727
    const result = analyzeAllRankDiscrepancies(teams, [match], epaMap);
    const analysis = result.get('frc100')!;
    expect(analysis.determination).toBe('carried');
    expect(analysis.partnerStrength).toBeGreaterThan(1.5);
  });
});
