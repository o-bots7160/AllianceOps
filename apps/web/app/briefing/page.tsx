'use client';

import { useMemo } from 'react';
import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { useSimulation } from '../../components/simulation-context';
import { filterMatchesByCursor, getTeamRecord } from '../../lib/simulation-filters';
import { matchLabel, sortMatches } from '../../lib/match-utils';
import { useSimulationEpa } from '../../hooks/use-simulation-epa';
import { InfoBox } from '../../components/info-box';
import { LoadingSpinner } from '../../components/loading-spinner';
import { PageGuard } from '../../components/page-guard';
import { StatusBanner } from '../../components/status-banner';
import { TeamCard } from '../../components/team-card';
import { getAdapter, analyzeAllRankDiscrepancies } from '@allianceops/shared';
import type { EnrichedTeam } from '../../lib/types';

interface TBAMatch {
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

export default function BriefingPage() {
  const { eventKey, teamNumber, year } = useEventSetup();
  const { activeCursor } = useSimulation();
  const myTeamKey = `frc${teamNumber}`;

  let adapter: ReturnType<typeof getAdapter> | null = null;
  try {
    adapter = getAdapter(year);
  } catch {
    // No adapter registered for this year
  }
  const cardMetrics =
    (adapter?.gameSpecificMetrics ?? []).filter(
      (m) => m.renderLocation === 'team_card' || m.renderLocation === 'all',
    );

  const { data: rawMatches, loading: matchesLoading, error: matchesError } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );
  const { data: teams, loading: teamsLoading, error: teamsError } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const matches = rawMatches ? filterMatchesByCursor(rawMatches, activeCursor) : undefined;

  // Compute currentMatch before useSimulationEpa so we can scope the fetch
  const allSortedMatches = useMemo(
    () => (matches ? sortMatches(matches) : undefined),
    [matches],
  );

  const currentMatch = useMemo(() => {
    const next = allSortedMatches?.find(
      (m) =>
        (m.alliances.red.team_keys.includes(myTeamKey) ||
          m.alliances.blue.team_keys.includes(myTeamKey)) &&
        m.alliances.red.score < 0,
    );
    return (
      next ??
      allSortedMatches
        ?.filter(
          (m) =>
            m.alliances.red.team_keys.includes(myTeamKey) ||
            m.alliances.blue.team_keys.includes(myTeamKey),
        )
        .pop()
    );
  }, [allSortedMatches, myTeamKey]);

  // Extract only the 6 match team numbers for the simulation EPA fetch
  const matchTeamNumbers = useMemo(() => {
    if (!currentMatch) return [];
    return [
      ...currentMatch.alliances.red.team_keys,
      ...currentMatch.alliances.blue.team_keys,
    ].map((k) => parseInt(k.replace('frc', ''), 10));
  }, [currentMatch]);

  const epaMap = useSimulationEpa(teams, eventKey, year, activeCursor, matchTeamNumbers);

  // Compute EPA rank for all event teams (1-based, sorted by epa.total descending)
  const epaRankMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!teams) return map;
    const sorted = [...teams]
      .filter((t) => t.epa?.total != null)
      .sort((a, b) => (b.epa?.total ?? 0) - (a.epa?.total ?? 0));
    sorted.forEach((t, i) => map.set(t.team_number, i + 1));
    return map;
  }, [teams]);

  const rankAnalysisMap = useMemo(() => {
    if (!teams || !matches) return new Map<string, ReturnType<typeof analyzeAllRankDiscrepancies> extends Map<string, infer V> ? V : never>();
    const teamInputs = teams
      .filter((t) => t.tbaRank != null && epaRankMap.has(t.team_number))
      .map((t) => ({
        teamKey: `frc${t.team_number}`,
        tbaRank: t.tbaRank!,
        epaRank: epaRankMap.get(t.team_number)!,
      }));
    const qualMatches = matches.filter((m) => m.comp_level === 'qm');
    const matchInputs = qualMatches.map((m) => ({
      key: m.key,
      matchNumber: m.match_number,
      redTeams: m.alliances.red.team_keys,
      blueTeams: m.alliances.blue.team_keys,
      redScore: m.alliances.red.score,
      blueScore: m.alliances.blue.score,
      winningAlliance: m.winning_alliance,
    }));
    const epaInputMap: Record<string, { total: number }> = {};
    for (const t of teams) {
      if (t.epa) epaInputMap[`frc${t.team_number}`] = t.epa;
    }
    return analyzeAllRankDiscrepancies(teamInputs, matchInputs, epaInputMap);
  }, [teams, matches, epaRankMap]);

  const isRed = currentMatch?.alliances.red.team_keys.includes(myTeamKey) ?? false;
  const ourTeams = isRed
    ? (currentMatch?.alliances.red.team_keys ?? [])
    : (currentMatch?.alliances.blue.team_keys ?? []);
  const oppTeams = isRed
    ? (currentMatch?.alliances.blue.team_keys ?? [])
    : (currentMatch?.alliances.red.team_keys ?? []);

  const ourAvgEpa =
    ourTeams.length > 0
      ? ourTeams.reduce((sum, t) => {
          const num = parseInt(t.replace('frc', ''), 10);
          return sum + (epaMap.get(num)?.epa?.total ?? 0);
        }, 0) / ourTeams.length
      : 0;

  const oppAvgEpa =
    oppTeams.length > 0
      ? oppTeams.reduce((sum, t) => {
          const num = parseInt(t.replace('frc', ''), 10);
          return sum + (epaMap.get(num)?.epa?.total ?? 0);
        }, 0) / oppTeams.length
      : 0;

  const epaDiff = ourAvgEpa - oppAvgEpa;

  return (
    <PageGuard condition={eventKey} message="Select an event on the Event page first.">
      {(matchesLoading || teamsLoading) ? (
        <LoadingSpinner message="Loading match data..." />
      ) : (matchesError || teamsError) ? (
        <StatusBanner variant="error">{matchesError || teamsError}</StatusBanner>
      ) : !currentMatch ? (
        <p className="text-gray-500">No matches found for your team at this event.</p>
      ) : (
    <div className="space-y-6">
      <InfoBox
        heading={`Match Briefing — ${matchLabel(currentMatch)}`}
        headingExtra={
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${isRed
              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }`}
          >
            {isRed ? 'Red' : 'Blue'} Alliance
          </span>
        }
      >
        <p>
          <strong>Match Briefing</strong> shows a head-to-head breakdown for your next upcoming match.
          Each team card displays <strong>EPA</strong> (Expected Points Added) from Statbotics — a
          statistical rating of how many points a team contributes per match across auto, teleop, and endgame.
        </p>
        <p>
          <strong>Win Conditions</strong> highlight areas where your alliance has an advantage (e.g., auto
          scoring edge). <strong>Risks</strong> flag opponent strengths or areas of concern. Use these to
          decide match strategy before you queue.
        </p>
        <p>
          The briefing automatically advances to the next unplayed match. When simulation mode is active,
          it shows the next unplayed match at the cursor position.
        </p>
      </InfoBox>

      {activeCursor !== null && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            📊 Simulation active — EPA values reflect pre-event estimates. W-L records filtered to match {activeCursor}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3">
            Our Alliance
          </h3>
          <div className="space-y-3">
            {ourTeams.map((t) => (
              <TeamCard
                key={t}
                teamKey={t}
                epaMap={epaMap}
                metrics={cardMetrics}
                epaRank={epaRankMap.get(parseInt(t.replace('frc', ''), 10))}
                record={activeCursor !== null && matches ? getTeamRecord(matches, t, activeCursor) : undefined}
                rankAnalysis={rankAnalysisMap.get(t)}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">
            Opponents
          </h3>
          <div className="space-y-3">
            {oppTeams.map((t) => (
              <TeamCard
                key={t}
                teamKey={t}
                epaMap={epaMap}
                metrics={cardMetrics}
                epaRank={epaRankMap.get(parseInt(t.replace('frc', ''), 10))}
                record={activeCursor !== null && matches ? getTeamRecord(matches, t, activeCursor) : undefined}
                rankAnalysis={rankAnalysisMap.get(t)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-green-200 dark:border-green-800 p-4">
          <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">
            Win Conditions
          </h4>
          {epaDiff > 3 && (
            <div className="mb-2 text-sm">
              <span className="font-medium">EPA Advantage:</span> +{epaDiff.toFixed(1)} avg EPA
            </div>
          )}
          {ourAvgEpa > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Our avg EPA: {ourAvgEpa.toFixed(1)} vs Opp: {oppAvgEpa.toFixed(1)}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 p-4">
          <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">Risks</h4>
          {epaDiff < -3 && (
            <div className="mb-2 text-sm">
              <span className="font-medium">EPA Deficit:</span> {epaDiff.toFixed(1)} avg EPA
            </div>
          )}
          {Math.abs(epaDiff) <= 3 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Evenly matched — execution will decide this one
            </p>
          )}
        </div>
      </div>
    </div>
      )}
    </PageGuard>
  );
}
