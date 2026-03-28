'use client';

import { useState, useMemo, useCallback } from 'react';
import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { useSimulation } from '../../components/simulation-context';
import { filterMatchesByCursor } from '../../lib/simulation-filters';
import { matchLabel } from '../../lib/match-utils';
import { InfoBox } from '../../components/info-box';
import { StatusBanner } from '../../components/status-banner';
import { DataTable, type ColumnDef } from '../../components/data-table';
import { PageGuard } from '../../components/page-guard';
import { HoverPopover } from '../../components/hover-popover';

interface TBAMatch {
  key: string;
  comp_level: string;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  winning_alliance: string;
  time: number | null;
}

interface EnrichedTeam {
  team_number: number;
  epa: { total: number } | null;
}

interface AnalyzedMatch {
  match: TBAMatch;
  isRed: boolean;
  oppTeams: string[];
  oppAvgEpa: number;
  difficultyScore: number;
  predictedMargin: number;
  isSwing: boolean;
  restMin: number | null;
  played: boolean;
  won: boolean | null;
  ourScore: number;
  theirScore: number;
}

function difficultyLabel(score: number): { label: string; color: string } {
  if (score > 1.3) return { label: 'Very Hard', color: 'text-red-600' };
  if (score > 1.1) return { label: 'Hard', color: 'text-orange-500' };
  if (score > 0.9) return { label: 'Moderate', color: 'text-yellow-600' };
  return { label: 'Easy', color: 'text-green-600' };
}

export default function PathPage() {
  const { eventKey, teamNumber } = useEventSetup();
  const { activeCursor } = useSimulation();
  const myTeamKey = `frc${teamNumber}`;
  const [sortColumn, setSortColumn] = useState('matchNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: rawMatches, loading: matchesLoading, error: matchesError } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );
  const { data: teams, loading: teamsLoading, error: teamsError } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const matches = useMemo(
    () => (rawMatches ? filterMatchesByCursor(rawMatches, activeCursor) : undefined),
    [rawMatches, activeCursor],
  );

  const { epaMap, fieldAvg } = useMemo(() => {
    const map = new Map<number, number>();
    let totalEpa = 0;
    let teamCount = 0;
    if (teams) {
      for (const t of teams) {
        map.set(t.team_number, t.epa?.total ?? 0);
        totalEpa += t.epa?.total ?? 0;
        teamCount++;
      }
    }
    return { epaMap: map, fieldAvg: teamCount > 0 ? totalEpa / teamCount : 1 };
  }, [teams]);

  const myMatches = useMemo(() => {
    const qualMatches = matches
      ?.filter((m) => m.comp_level === 'qm')
      .sort((a, b) => a.match_number - b.match_number);
    return qualMatches?.filter(
      (m) =>
        m.alliances.red.team_keys.includes(myTeamKey) ||
        m.alliances.blue.team_keys.includes(myTeamKey),
    );
  }, [matches, myTeamKey]);

  const analyzed = useMemo(() => {
    if (!myMatches || myMatches.length === 0) return [];
    return myMatches.map((match, idx) => {
      const isRed = match.alliances.red.team_keys.includes(myTeamKey);
      const oppTeams = isRed
        ? match.alliances.blue.team_keys
        : match.alliances.red.team_keys;

      const oppAvgEpa =
        oppTeams.reduce((sum, t) => {
          const num = parseInt(t.replace('frc', ''), 10);
          return sum + (epaMap.get(num) ?? fieldAvg);
        }, 0) / oppTeams.length;

      const allianceTeams = isRed
        ? match.alliances.red.team_keys
        : match.alliances.blue.team_keys;

      const allianceAvgEpa =
        allianceTeams.reduce((sum, t) => {
          const num = parseInt(t.replace('frc', ''), 10);
          return sum + (epaMap.get(num) ?? fieldAvg);
        }, 0) / allianceTeams.length;

      const difficultyScore = fieldAvg > 0 ? oppAvgEpa / fieldAvg : 1;
      const predictedMargin = (allianceAvgEpa - oppAvgEpa) * 3;
      const isSwing = Math.abs(predictedMargin) < 10;

      const prevMatch = idx > 0 ? myMatches[idx - 1] : null;
      const restMin =
        match.time && prevMatch?.time
          ? Math.round((match.time - prevMatch.time) / 60)
          : null;

      const played =
        match.alliances.red.score >= 0 && match.alliances.blue.score >= 0;
      const won = played
        ? match.winning_alliance === (isRed ? 'red' : 'blue')
        : null;
      const ourScore = isRed ? match.alliances.red.score : match.alliances.blue.score;
      const theirScore = isRed ? match.alliances.blue.score : match.alliances.red.score;

      return {
        match,
        isRed,
        oppTeams,
        oppAvgEpa,
        difficultyScore,
        predictedMargin,
        isSwing,
        restMin,
        played,
        won,
        ourScore,
        theirScore,
      };
    });
  }, [myMatches, myTeamKey, epaMap, fieldAvg]);

  const { avgDiff, swingCount, hardest, easiest } = useMemo(() => {
    if (analyzed.length === 0)
      return { avgDiff: 0, swingCount: 0, hardest: undefined, easiest: undefined };
    return {
      avgDiff: analyzed.reduce((a, m) => a + m.difficultyScore, 0) / analyzed.length,
      swingCount: analyzed.filter((m) => m.isSwing).length,
      hardest: [...analyzed].sort((a, b) => b.difficultyScore - a.difficultyScore)[0],
      easiest: [...analyzed].sort((a, b) => a.difficultyScore - b.difficultyScore)[0],
    };
  }, [analyzed]);

  const apiError = matchesError || teamsError;

  const handleSort = useCallback(
    (column: string) => {
      if (sortColumn === column) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn],
  );

  const displayData = useMemo<AnalyzedMatch[]>(() => {
    if (!analyzed.length) return [];
    return [...analyzed].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'matchNumber':
          cmp = a.match.match_number - b.match.match_number;
          break;
        case 'difficultyScore':
          cmp = a.difficultyScore - b.difficultyScore;
          break;
        case 'predictedMargin':
          cmp = a.predictedMargin - b.predictedMargin;
          break;
        default:
          cmp = a.match.match_number - b.match.match_number;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [analyzed, sortColumn, sortDirection]);

  const pathColumns = useMemo<ColumnDef<AnalyzedMatch>[]>(
    () => [
      {
        key: 'matchNumber',
        header: 'Match',
        sortable: true,
        render: (row) => (
          <>
            <span className="font-mono">{matchLabel(row.match)}</span>
            {row.isSwing && <span className="ml-1 text-amber-500">⚡</span>}
          </>
        ),
      },
      {
        key: 'alliance',
        header: 'Alliance',
        render: (row) => (
          <span className={row.isRed ? 'text-red-600' : 'text-blue-600'}>
            {row.isRed ? 'Red' : 'Blue'}
          </span>
        ),
      },
      {
        key: 'opponents',
        header: 'Opponents',
        render: (row) => row.oppTeams.map((t) => t.replace('frc', '')).join(', '),
      },
      {
        key: 'difficultyScore',
        header: 'Difficulty',
        sortable: true,
        render: (row) => {
          const diff = difficultyLabel(row.difficultyScore);
          return (
            <HoverPopover
              trigger={<span className={`font-medium ${diff.color}`}>{diff.label}</span>}
              width="w-56"
            >
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                Opp avg EPA {row.oppAvgEpa.toFixed(1)} ÷ field avg {fieldAvg.toFixed(1)} ={' '}
                <span className={diff.color}>{row.difficultyScore.toFixed(2)}</span>
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                {'> 1.3 = Very Hard, > 1.1 = Hard, > 0.9 = Moderate, ≤ 0.9 = Easy'}
              </p>
            </HoverPopover>
          );
        },
      },
      {
        key: 'predictedMargin',
        header: 'Margin',
        sortable: true,
        render: (row) => (
          <span className="font-mono">
            {row.predictedMargin > 0 ? '+' : ''}
            {row.predictedMargin.toFixed(0)}
          </span>
        ),
      },
      {
        key: 'rest',
        header: 'Rest',
        render: (row) => (
          <span className="text-gray-500">
            {row.restMin !== null ? `${row.restMin}m` : '—'}
          </span>
        ),
      },
      {
        key: 'result',
        header: 'Result',
        render: (row) =>
          row.played ? (
            <span className={row.won ? 'text-green-600 font-medium' : 'text-red-600'}>
              {row.won ? 'W' : 'L'} {row.ourScore}-{row.theirScore}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <PageGuard
      condition={eventKey}
      loading={matchesLoading || teamsLoading}
      message="Select an event on the Event page first."
    >
      {apiError ? (
        <StatusBanner variant="error">{apiError}</StatusBanner>
      ) : !displayData.length ? (
        <p className="text-gray-500">No matches found for your team at this event.</p>
      ) : (
        <div className="space-y-6">
          <InfoBox heading="Our Path Through Quals">
            <p>
              <strong>Path Analysis</strong> maps out your team&apos;s entire qualification schedule
              ranked by difficulty. Each match is rated based on opponent EPA averages compared to
              the field average.
            </p>
            <p>
              <strong>Difficulty</strong> ranges from Easy to Very Hard.{' '}
              <strong>Swing matches</strong> (⚡) are predicted to be within 10 points — these are
              the ones where preparation and execution matter most.{' '}
              <strong>Predicted margin</strong> shows the expected point differential based on
              alliance vs. opponent EPA.
            </p>
            <p>
              <strong>Rest time</strong> shows minutes between your matches. Use this to plan pit
              stops and pre-match strategy sessions. Results fill in as matches are played.
            </p>
          </InfoBox>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
              <p className="text-2xl font-bold">{analyzed.length}</p>
              <p className="text-xs text-gray-500">Total Matches</p>
            </div>
            <HoverPopover
              trigger={
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
                  <p className="text-2xl font-bold">{avgDiff.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Avg Difficulty</p>
                </div>
              }
              width="w-64"
            >
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                Opponent avg EPA ÷ field avg EPA, averaged across all matches.
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                Above 1.0 = harder-than-average schedule. Below 1.0 = easier.
              </p>
            </HoverPopover>
            <HoverPopover
              trigger={
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
                  <p className="text-2xl font-bold">{swingCount}</p>
                  <p className="text-xs text-gray-500">Swing Matches</p>
                </div>
              }
              width="w-64"
            >
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                Matches predicted within 10 points.
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                These are where preparation and execution matter most.
              </p>
            </HoverPopover>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
              <p className="text-2xl font-bold">
                {analyzed.filter((m) => m.won === true).length}-
                {analyzed.filter((m) => m.won === false).length}
              </p>
              <p className="text-xs text-gray-500">Record (played)</p>
            </div>
          </div>

          {hardest && easiest && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-red-200 dark:border-red-800 p-3">
                <p className="font-medium text-red-600">
                  Hardest: {matchLabel(hardest.match)}
                </p>
                <p className="text-gray-500">
                  Difficulty: {hardest.difficultyScore.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-green-200 dark:border-green-800 p-3">
                <p className="font-medium text-green-600">
                  Easiest: {matchLabel(easiest.match)}
                </p>
                <p className="text-gray-500">
                  Difficulty: {easiest.difficultyScore.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <DataTable
            data={displayData}
            columns={pathColumns}
            keyExtractor={(row) => row.match.key}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            isRowHighlighted={(row) => row.isSwing}
            emptyMessage="No matches to analyze."
          />
        </div>
      )}
    </PageGuard>
  );
}
