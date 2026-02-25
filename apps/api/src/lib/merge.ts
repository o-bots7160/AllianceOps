import type {
  TBATeam,
  TBAMatch,
  StatboticsTeamEvent,
  StatboticsMatch,
  EnrichedTeam,
  EnrichedMatch,
} from '@allianceops/shared';

/** Merge TBA teams with Statbotics EPA data by team number */
export function mergeTeams(
  tbaTeams: TBATeam[],
  statboticsTeams: StatboticsTeamEvent[],
): EnrichedTeam[] {
  const epaMap = new Map(statboticsTeams.map((st) => [st.team, st]));

  return tbaTeams.map((t): EnrichedTeam => {
    const sb = epaMap.get(t.team_number);
    return {
      ...t,
      epa: sb?.epa ?? null,
      eventRecord: sb?.record ?? null,
      winrate: sb?.winrate ?? null,
    };
  });
}

/** Merge TBA matches with Statbotics predictions by match key */
export function mergeMatches(
  tbaMatches: TBAMatch[],
  statboticsMatches: StatboticsMatch[],
  includeBreakdowns: boolean,
): EnrichedMatch[] {
  const predictionMap = new Map(
    statboticsMatches.map((sm) => [sm.match, sm.pred]),
  );

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
