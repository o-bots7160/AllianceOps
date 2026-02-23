'use client';

import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { useSimulation } from '../../components/simulation-context';
import { filterMatchesByCursor } from '../../lib/simulation-filters';
import { InfoBox } from '../../components/info-box';
import { LoadingSpinner } from '../../components/loading-spinner';

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

  const { data: rawMatches, loading: matchesLoading } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );
  const { data: teams, loading: teamsLoading } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const matches = rawMatches ? filterMatchesByCursor(rawMatches, activeCursor) : undefined;

  if (!eventKey) {
    return <p className="text-gray-500">Select an event on the Event page first.</p>;
  }

  if (matchesLoading || teamsLoading) {
    return <LoadingSpinner message="Loading schedule..." />;
  }

  const epaMap = new Map<number, number>();
  let totalEpa = 0;
  let teamCount = 0;
  if (teams) {
    for (const t of teams) {
      epaMap.set(t.team_number, t.epa?.total ?? 0);
      totalEpa += t.epa?.total ?? 0;
      teamCount++;
    }
  }
  const fieldAvg = teamCount > 0 ? totalEpa / teamCount : 1;

  const qualMatches = matches
    ?.filter((m) => m.comp_level === 'qm')
    .sort((a, b) => a.match_number - b.match_number);

  const myMatches = qualMatches?.filter(
    (m) =>
      m.alliances.red.team_keys.includes(myTeamKey) ||
      m.alliances.blue.team_keys.includes(myTeamKey),
  );

  if (!myMatches || myMatches.length === 0) {
    return <p className="text-gray-500">No matches found for your team at this event.</p>;
  }

  const analyzed = myMatches.map((match, idx) => {
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

  const avgDiff = analyzed.reduce((a, m) => a + m.difficultyScore, 0) / analyzed.length;
  const swingCount = analyzed.filter((m) => m.isSwing).length;
  const hardest = [...analyzed].sort((a, b) => b.difficultyScore - a.difficultyScore)[0];
  const easiest = [...analyzed].sort((a, b) => a.difficultyScore - b.difficultyScore)[0];

  return (
    <div className="space-y-6">
      <InfoBox heading="Our Path Through Quals">
        <p>
          <strong>Path Analysis</strong> maps out your team&apos;s entire qualification schedule ranked by
          difficulty. Each match is rated based on opponent EPA averages compared to the field average.
        </p>
        <p>
          <strong>Difficulty</strong> ranges from Easy to Very Hard. <strong>Swing matches</strong> (⚡) are
          predicted to be within 10 points — these are the ones where preparation and execution matter most.
          <strong>Predicted margin</strong> shows the expected point differential based on alliance vs.
          opponent EPA.
        </p>
        <p>
          <strong>Rest time</strong> shows minutes between your matches. Use this to plan pit stops and
          pre-match strategy sessions. Results fill in as matches are played.
        </p>
      </InfoBox>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-2xl font-bold">{myMatches.length}</p>
          <p className="text-xs text-gray-500">Total Matches</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-2xl font-bold">{avgDiff.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Avg Difficulty</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-2xl font-bold">{swingCount}</p>
          <p className="text-xs text-gray-500">Swing Matches</p>
        </div>
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
              Hardest: Q{hardest.match.match_number}
            </p>
            <p className="text-gray-500">Difficulty: {hardest.difficultyScore.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-green-200 dark:border-green-800 p-3">
            <p className="font-medium text-green-600">
              Easiest: Q{easiest.match.match_number}
            </p>
            <p className="text-gray-500">Difficulty: {easiest.difficultyScore.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
              <th className="py-2 px-2">Match</th>
              <th className="py-2 px-2">Alliance</th>
              <th className="py-2 px-2">Opponents</th>
              <th className="py-2 px-2">Difficulty</th>
              <th className="py-2 px-2">Margin</th>
              <th className="py-2 px-2">Rest</th>
              <th className="py-2 px-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {analyzed.map((m) => {
              const diff = difficultyLabel(m.difficultyScore);
              return (
                <tr
                  key={m.match.key}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    m.isSwing ? 'bg-amber-50 dark:bg-amber-950' : ''
                  }`}
                >
                  <td className="py-2 px-2 font-mono">
                    Q{m.match.match_number}
                    {m.isSwing && <span className="ml-1 text-amber-500">⚡</span>}
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={m.isRed ? 'text-red-600' : 'text-blue-600'}
                    >
                      {m.isRed ? 'Red' : 'Blue'}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    {m.oppTeams.map((t) => t.replace('frc', '')).join(', ')}
                  </td>
                  <td className={`py-2 px-2 font-medium ${diff.color}`}>
                    {diff.label}
                  </td>
                  <td className="py-2 px-2 font-mono">
                    {m.predictedMargin > 0 ? '+' : ''}
                    {m.predictedMargin.toFixed(0)}
                  </td>
                  <td className="py-2 px-2 text-gray-500">
                    {m.restMin !== null ? `${m.restMin}m` : '—'}
                  </td>
                  <td className="py-2 px-2">
                    {m.played ? (
                      <span
                        className={
                          m.won ? 'text-green-600 font-medium' : 'text-red-600'
                        }
                      >
                        {m.won ? 'W' : 'L'} {m.ourScore}-{m.theirScore}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
