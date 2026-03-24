export type RankDetermination =
  | 'accurate'
  | 'carried'
  | 'easy_schedule'
  | 'favorable'
  | 'underrated'
  | 'tough_schedule'
  | 'unlucky';

export interface TeamRankAnalysis {
  teamKey: string;
  tbaRank: number;
  epaRank: number;
  rankDelta: number;
  determination: RankDetermination;
  explanation: string;
  partnerStrength: number;
  opponentStrength: number;
  matchesPlayed: number;
  strongPartnerRecord: { wins: number; losses: number };
  weakPartnerRecord: { wins: number; losses: number };
}

interface MatchInput {
  key: string;
  matchNumber: number;
  redTeams: string[];
  blueTeams: string[];
  redScore: number;
  blueScore: number;
  winningAlliance: string;
}

interface TeamEpaMap {
  [teamKey: string]: { total: number };
}

interface TeamRankInput {
  teamKey: string;
  tbaRank: number;
  epaRank: number;
}

const ACCURATE_THRESHOLD = 3;
const STRENGTH_HIGH = 1.1;
const STRENGTH_LOW = 0.9;

export function analyzeRankDiscrepancy(
  team: TeamRankInput,
  matches: MatchInput[],
  epaMap: TeamEpaMap,
  fieldAvgEpa: number,
): TeamRankAnalysis {
  const qualMatches = matches.filter(
    (m) => m.redTeams.includes(team.teamKey) || m.blueTeams.includes(team.teamKey),
  );

  const partnerEpas: number[] = [];
  const opponentEpas: number[] = [];
  const strongPartnerRecord = { wins: 0, losses: 0 };
  const weakPartnerRecord = { wins: 0, losses: 0 };

  for (const match of qualMatches) {
    const isRed = match.redTeams.includes(team.teamKey);
    const allies = isRed ? match.redTeams : match.blueTeams;
    const opponents = isRed ? match.blueTeams : match.redTeams;

    const partners = allies.filter((t) => t !== team.teamKey);
    const partnerAvg =
      partners.length > 0
        ? partners.reduce((sum, t) => sum + (epaMap[t]?.total ?? fieldAvgEpa), 0) /
          partners.length
        : fieldAvgEpa;

    const oppAvg =
      opponents.length > 0
        ? opponents.reduce((sum, t) => sum + (epaMap[t]?.total ?? fieldAvgEpa), 0) /
          opponents.length
        : fieldAvgEpa;

    partnerEpas.push(partnerAvg);
    opponentEpas.push(oppAvg);

    const played = match.redScore >= 0 && match.blueScore >= 0;
    if (played) {
      const won = match.winningAlliance === (isRed ? 'red' : 'blue');
      const strongPartners = partnerAvg >= fieldAvgEpa;
      if (strongPartners) {
        if (won) strongPartnerRecord.wins++;
        else strongPartnerRecord.losses++;
      } else {
        if (won) weakPartnerRecord.wins++;
        else weakPartnerRecord.losses++;
      }
    }
  }

  const avgPartnerEpa =
    partnerEpas.length > 0
      ? partnerEpas.reduce((a, b) => a + b, 0) / partnerEpas.length
      : fieldAvgEpa;
  const avgOpponentEpa =
    opponentEpas.length > 0
      ? opponentEpas.reduce((a, b) => a + b, 0) / opponentEpas.length
      : fieldAvgEpa;

  const partnerStrength = fieldAvgEpa > 0 ? avgPartnerEpa / fieldAvgEpa : 1;
  const opponentStrength = fieldAvgEpa > 0 ? avgOpponentEpa / fieldAvgEpa : 1;

  // rankDelta = tbaRank - epaRank
  // negative → TBA rank is better (lower number) than EPA rank (possibly carried)
  // positive → TBA rank is worse (higher number) than EPA rank (possibly underrated)
  const rankDelta = team.tbaRank - team.epaRank;

  const determination = classifyDetermination(rankDelta, partnerStrength, opponentStrength);
  const explanation = buildExplanation(
    determination,
    rankDelta,
    partnerStrength,
    opponentStrength,
    strongPartnerRecord,
    weakPartnerRecord,
  );

  return {
    teamKey: team.teamKey,
    tbaRank: team.tbaRank,
    epaRank: team.epaRank,
    rankDelta,
    determination,
    explanation,
    partnerStrength,
    opponentStrength,
    matchesPlayed: qualMatches.length,
    strongPartnerRecord,
    weakPartnerRecord,
  };
}

function classifyDetermination(
  rankDelta: number,
  partnerStrength: number,
  opponentStrength: number,
): RankDetermination {
  if (Math.abs(rankDelta) <= ACCURATE_THRESHOLD) return 'accurate';

  if (rankDelta < -ACCURATE_THRESHOLD) {
    // TBA rank better than EPA rank (e.g., TBA #7 but EPA #15)
    if (partnerStrength >= STRENGTH_HIGH) return 'carried';
    if (opponentStrength <= STRENGTH_LOW) return 'easy_schedule';
    return 'favorable';
  }

  // rankDelta > ACCURATE_THRESHOLD — TBA rank worse than EPA rank
  if (partnerStrength <= STRENGTH_LOW) return 'underrated';
  if (opponentStrength >= STRENGTH_HIGH) return 'tough_schedule';
  return 'unlucky';
}

function buildExplanation(
  determination: RankDetermination,
  rankDelta: number,
  partnerStrength: number,
  opponentStrength: number,
  strongPartnerRecord: { wins: number; losses: number },
  weakPartnerRecord: { wins: number; losses: number },
): string {
  const absDelta = Math.abs(rankDelta);
  const partnerPct = ((partnerStrength - 1) * 100).toFixed(0);
  const opponentPct = ((opponentStrength - 1) * 100).toFixed(0);

  switch (determination) {
    case 'accurate':
      return 'Ranking aligns with performance — no significant schedule effects detected.';

    case 'carried':
      return (
        `Ranked ${absDelta} spots higher than EPA suggests. ` +
        `Alliance partners averaged ${partnerPct}% above field average. ` +
        `Record with strong partners: ${strongPartnerRecord.wins}-${strongPartnerRecord.losses}, ` +
        `with weak partners: ${weakPartnerRecord.wins}-${weakPartnerRecord.losses}.`
      );

    case 'easy_schedule':
      return (
        `Ranked ${absDelta} spots higher than EPA suggests. ` +
        `Opponents averaged ${Math.abs(Number(opponentPct))}% below field average, ` +
        `inflating win record.`
      );

    case 'favorable':
      return (
        `Ranked ${absDelta} spots higher than EPA suggests ` +
        `despite an average schedule. May indicate favorable match outcomes or RP luck.`
      );

    case 'underrated':
      return (
        `Ranked ${absDelta} spots lower than EPA suggests. ` +
        `Alliance partners averaged ${Math.abs(Number(partnerPct))}% below field average. ` +
        `Record with strong partners: ${strongPartnerRecord.wins}-${strongPartnerRecord.losses}, ` +
        `with weak partners: ${weakPartnerRecord.wins}-${weakPartnerRecord.losses}.`
      );

    case 'tough_schedule':
      return (
        `Ranked ${absDelta} spots lower than EPA suggests. ` +
        `Opponents averaged ${opponentPct}% above field average, ` +
        `leading to a tougher path.`
      );

    case 'unlucky':
      return (
        `Ranked ${absDelta} spots lower than EPA suggests ` +
        `despite an average schedule. May indicate unfavorable match outcomes or RP luck.`
      );
  }
}

export function analyzeAllRankDiscrepancies(
  teams: TeamRankInput[],
  matches: MatchInput[],
  epaMap: TeamEpaMap,
): Map<string, TeamRankAnalysis> {
  const totalEpa = Object.values(epaMap).reduce((sum, e) => sum + e.total, 0);
  const teamCount = Object.keys(epaMap).length;
  const fieldAvgEpa = teamCount > 0 ? totalEpa / teamCount : 1;

  const result = new Map<string, TeamRankAnalysis>();
  for (const team of teams) {
    result.set(team.teamKey, analyzeRankDiscrepancy(team, matches, epaMap, fieldAvgEpa));
  }
  return result;
}
