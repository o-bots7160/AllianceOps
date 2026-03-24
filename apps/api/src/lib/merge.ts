import type {
  TBATeam,
  TBARankingEntry,
  TBAMatch,
  StatboticsTeamEvent,
  StatboticsMatch,
  EnrichedTeam,
  EnrichedMatch,
} from '@allianceops/shared';

function parseTeamNumber(teamKey: string): number | null {
  if (!teamKey.startsWith('frc')) return null;
  const parsed = Number.parseInt(teamKey.slice(3), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Merge TBA teams with Statbotics EPA data by team number */
export function mergeTeams(
  tbaTeams: TBATeam[],
  statboticsTeams: StatboticsTeamEvent[],
  rankings: TBARankingEntry[] = [],
): EnrichedTeam[] {
  const epaMap = new Map(statboticsTeams.map((st) => [st.team, st]));
  const rankingMap = new Map(
    rankings
      .map((entry) => {
        const teamNumber = parseTeamNumber(entry.team_key);
        if (teamNumber === null) {
          return null;
        }
        return [teamNumber, entry] as const;
      })
      .filter((entry): entry is readonly [number, TBARankingEntry] => entry !== null),
  );

  return tbaTeams.map((t): EnrichedTeam => {
    const sb = epaMap.get(t.team_number);
    const ranking = rankingMap.get(t.team_number);
    return {
      ...t,
      epa: sb?.epa ?? null,
      eventRecord: sb?.record ?? null,
      winrate: sb?.winrate ?? null,
      tbaRank: ranking?.rank ?? null,
      qualAverage: ranking?.qual_average ?? null,
    };
  });
}

/** Merge TBA matches with Statbotics predictions by match key */
export function mergeMatches(
  tbaMatches: TBAMatch[],
  statboticsMatches: StatboticsMatch[],
  includeBreakdowns: boolean,
): EnrichedMatch[] {
  const predictionMap = new Map(statboticsMatches.map((sm) => [sm.match, sm.pred]));

  return tbaMatches.map((m): EnrichedMatch => {
    const base = includeBreakdowns
      ? m
      : {
          key: m.key,
          comp_level: m.comp_level,
          set_number: m.set_number,
          match_number: m.match_number,
          alliances: m.alliances,
          winning_alliance: m.winning_alliance,
          event_key: m.event_key,
          time: m.time,
          actual_time: m.actual_time,
          predicted_time: m.predicted_time,
          score_breakdown: null,
        };
    return {
      ...base,
      prediction: predictionMap.get(m.key) ?? null,
    };
  });
}
