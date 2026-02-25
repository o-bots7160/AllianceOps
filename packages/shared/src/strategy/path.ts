import type { StatboticsEPA } from '../types/statbotics.js';

export interface PathMatch {
  matchKey: string;
  matchNumber: number;
  allianceColor: 'red' | 'blue';
  allianceTeams: string[];
  opponentTeams: string[];
  opponentAvgEpa: number;
  difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard';
  difficultyScore: number;
  isSwingMatch: boolean;
  predictedMargin: number;
  restMinutes: number | null;
  time: number | null;
  result: { won: boolean; ourScore: number; theirScore: number } | null;
}

export interface PathAnalysis {
  teamKey: string;
  eventKey: string;
  matches: PathMatch[];
  averageDifficulty: number;
  hardestMatch: PathMatch | null;
  easiestMatch: PathMatch | null;
  swingMatchCount: number;
}

interface MatchInput {
  key: string;
  matchNumber: number;
  redTeams: string[];
  blueTeams: string[];
  redScore: number;
  blueScore: number;
  time: number | null;
  winningAlliance: string;
}

interface TeamEpaMap {
  [teamKey: string]: StatboticsEPA;
}

export function analyzePath(
  teamKey: string,
  eventKey: string,
  matches: MatchInput[],
  epaMap: TeamEpaMap,
  fieldAvgEpa: number,
): PathAnalysis {
  const qualMatches = matches
    .filter(
      (m) =>
        m.redTeams.includes(teamKey) || m.blueTeams.includes(teamKey),
    )
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const pathMatches: PathMatch[] = qualMatches.map((match, idx) => {
    const isRed = match.redTeams.includes(teamKey);
    const allianceTeams = isRed ? match.redTeams : match.blueTeams;
    const opponentTeams = isRed ? match.blueTeams : match.redTeams;

    const opponentEpas = opponentTeams.map((t) => epaMap[t]?.total ?? fieldAvgEpa);
    const opponentAvgEpa = opponentEpas.reduce((a, b) => a + b, 0) / opponentEpas.length;

    const allianceEpas = allianceTeams.map((t) => epaMap[t]?.total ?? fieldAvgEpa);
    const allianceAvgEpa = allianceEpas.reduce((a, b) => a + b, 0) / allianceEpas.length;

    const difficultyScore = opponentAvgEpa / fieldAvgEpa;
    const predictedMargin = (allianceAvgEpa - opponentAvgEpa) * 3;

    let difficulty: PathMatch['difficulty'];
    if (difficultyScore > 1.3) difficulty = 'very_hard';
    else if (difficultyScore > 1.1) difficulty = 'hard';
    else if (difficultyScore > 0.9) difficulty = 'moderate';
    else difficulty = 'easy';

    const isSwingMatch = Math.abs(predictedMargin) < 10;

    const prevMatch = idx > 0 ? qualMatches[idx - 1] : null;
    const restMinutes =
      match.time && prevMatch?.time
        ? (match.time - prevMatch.time) / 60
        : null;

    const played = match.redScore >= 0 && match.blueScore >= 0;
    const result = played
      ? {
          won: match.winningAlliance === (isRed ? 'red' : 'blue'),
          ourScore: isRed ? match.redScore : match.blueScore,
          theirScore: isRed ? match.blueScore : match.redScore,
        }
      : null;

    return {
      matchKey: match.key,
      matchNumber: match.matchNumber,
      allianceColor: isRed ? 'red' : 'blue',
      allianceTeams,
      opponentTeams,
      opponentAvgEpa,
      difficulty,
      difficultyScore,
      isSwingMatch,
      predictedMargin,
      restMinutes,
      time: match.time,
      result,
    };
  });

  const avgDiff =
    pathMatches.length > 0
      ? pathMatches.reduce((a, m) => a + m.difficultyScore, 0) / pathMatches.length
      : 0;

  const sorted = [...pathMatches].sort((a, b) => b.difficultyScore - a.difficultyScore);

  return {
    teamKey,
    eventKey,
    matches: pathMatches,
    averageDifficulty: avgDiff,
    hardestMatch: sorted[0] ?? null,
    easiestMatch: sorted[sorted.length - 1] ?? null,
    swingMatchCount: pathMatches.filter((m) => m.isSwingMatch).length,
  };
}
