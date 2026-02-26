'use client';

import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { useSimulation } from '../../components/simulation-context';
import { getTeamRecord } from '../../lib/simulation-filters';
import { matchLabel, sortMatches } from '../../lib/match-utils';
import { InfoBox } from '../../components/info-box';

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
  time: number | null;
}

export default function SimulationPage() {
  const { eventKey, teamNumber } = useEventSetup();
  const { cursor, startSimulation, stopSimulation, setCursor, isSimulating, eventKey: simEventKey } =
    useSimulation();

  const activeEventKey = simEventKey || eventKey;
  const myTeamKey = `frc${teamNumber}`;

  const { data: matches, loading } = useApi<TBAMatch[]>(
    activeEventKey ? `event/${activeEventKey}/matches` : null,
  );

  const allSortedMatches = matches ? sortMatches(matches) : undefined;

  // For the cursor, we use ALL matches in competition order
  // The cursor number maps to position in sorted array
  const maxCursor = allSortedMatches?.length ?? 1;
  const activeCursor = Math.min(cursor, maxCursor);
  const visibleMatches = allSortedMatches?.slice(0, activeCursor);
  const playedMatches = visibleMatches?.filter(
    (m) => m.alliances.red.score >= 0 && m.alliances.blue.score >= 0,
  );
  const upcomingMatches = allSortedMatches?.slice(activeCursor);

  const record = allSortedMatches
    ? getTeamRecord(allSortedMatches, myTeamKey, activeCursor)
    : { wins: 0, losses: 0, ties: 0 };

  if (!eventKey) {
    return <p className="text-gray-500">Select a team and event in the header to begin.</p>;
  }

  return (
    <div className="space-y-6">
      <InfoBox heading="Simulation Replay">
        <p>
          <strong>Simulation Replay</strong> lets you time-travel through a past event match by match.
          Use the cursor slider to step through the full schedule — qualifications, semifinals,
          and finals — and see how the event unfolded.
        </p>
        <p>
          Click <strong>Start Simulation</strong> to activate simulation mode across the entire dashboard.
          When active, an amber bar appears at the top of every page, and the Briefing, Path, and Event
          pages will reflect the state of the event at your cursor position — as if you were at that
          point in the competition.
        </p>
        <p>
          Click <strong>Stop Simulation</strong> or &quot;Exit Sim&quot; in the top bar to return all
          pages to live/real-time data.
        </p>
      </InfoBox>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Match Cursor: {activeCursor} / {maxCursor}
            {allSortedMatches && activeCursor > 0 && activeCursor <= allSortedMatches.length && (
              <span className="ml-2 font-mono text-xs text-gray-500">
                ({matchLabel(allSortedMatches[activeCursor - 1])})
              </span>
            )}
          </label>
          <input
            type="range"
            min={1}
            max={maxCursor}
            value={activeCursor}
            onChange={(e) => setCursor(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <button
              onClick={() => setCursor(Math.max(1, activeCursor - 1))}
              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              ◀ Back
            </button>
            <button
              onClick={() => setCursor(Math.min(maxCursor, activeCursor + 1))}
              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Forward ▶
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold">
              {record.wins}W - {record.losses}L
            </p>
            <p className="text-xs text-gray-500">
              Team {teamNumber} at cursor {activeCursor}
            </p>
            {isSimulating ? (
              <button
                onClick={stopSimulation}
                className="mt-2 text-xs px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
              >
                Stop Simulation
              </button>
            ) : (
              <button
                onClick={() => startSimulation(activeEventKey, activeCursor)}
                className="mt-2 text-xs px-3 py-1 rounded bg-primary-600 text-white hover:bg-primary-700"
              >
                Start Simulation
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading matches...</p>}

      {visibleMatches && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Played ({playedMatches?.length ?? 0} matches)
            </h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {visibleMatches.map((m) => {
                const isMyMatch =
                  m.alliances.red.team_keys.includes(myTeamKey) ||
                  m.alliances.blue.team_keys.includes(myTeamKey);
                const played = m.alliances.red.score >= 0;
                return (
                  <div
                    key={m.key}
                    className={`text-xs py-1 px-2 rounded ${isMyMatch ? 'bg-primary-50 dark:bg-primary-950' : ''
                      }`}
                  >
                    <span className="font-mono mr-2">{matchLabel(m)}</span>
                    <span className="text-red-600">
                      {m.alliances.red.team_keys.map((t) => t.replace('frc', '')).join(' ')}
                    </span>
                    <span className="mx-2">vs</span>
                    <span className="text-blue-600">
                      {m.alliances.blue.team_keys.map((t) => t.replace('frc', '')).join(' ')}
                    </span>
                    {played && (
                      <span className="ml-2 font-mono">
                        {m.alliances.red.score}-{m.alliances.blue.score}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">
              Upcoming ({upcomingMatches?.length ?? 0} matches)
            </h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {upcomingMatches?.slice(0, 10).map((m) => {
                const isMyMatch =
                  m.alliances.red.team_keys.includes(myTeamKey) ||
                  m.alliances.blue.team_keys.includes(myTeamKey);
                return (
                  <div
                    key={m.key}
                    className={`text-xs py-1 px-2 rounded ${isMyMatch ? 'bg-primary-50 dark:bg-primary-950 font-medium' : ''
                      }`}
                  >
                    <span className="font-mono mr-2">{matchLabel(m)}</span>
                    <span className="text-red-600">
                      {m.alliances.red.team_keys.map((t) => t.replace('frc', '')).join(' ')}
                    </span>
                    <span className="mx-2">vs</span>
                    <span className="text-blue-600">
                      {m.alliances.blue.team_keys.map((t) => t.replace('frc', '')).join(' ')}
                    </span>
                  </div>
                );
              })}
              {(upcomingMatches?.length ?? 0) > 10 && (
                <p className="text-xs text-gray-400">
                  ...and {(upcomingMatches?.length ?? 0) - 10} more
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
