'use client';

import { useState } from 'react';
import { useApi } from '../../components/use-api';
import { useSimulation } from '../../components/simulation-context';
import { getTeamRecord } from '../../lib/simulation-filters';
import { InfoBox } from '../../components/info-box';

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

const PRESETS = [
  {
    id: '2025mibig-7160',
    name: '2025 FIM District - Big Rapids',
    eventKey: '2025mibig',
    teamNumber: 7160,
  },
];

export default function SimulationPage() {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].eventKey);
  const [teamNumber, setTeamNumber] = useState(PRESETS[0].teamNumber);
  const { cursor, startSimulation, stopSimulation, setCursor, isSimulating, eventKey: simEventKey } =
    useSimulation();

  const activeEventKey = simEventKey || selectedPreset;

  const { data: matches, loading } = useApi<TBAMatch[]>(
    activeEventKey ? `event/${activeEventKey}/matches` : null,
  );

  const qualMatches = matches
    ?.filter((m) => m.comp_level === 'qm')
    .sort((a, b) => a.match_number - b.match_number);

  const maxCursor = qualMatches?.length ?? 1;
  const activeCursor = Math.min(cursor, maxCursor);
  const visibleMatches = qualMatches?.slice(0, activeCursor);
  const playedMatches = visibleMatches?.filter(
    (m) => m.alliances.red.score >= 0 && m.alliances.blue.score >= 0,
  );
  const upcomingMatches = qualMatches?.slice(activeCursor);

  const myTeamKey = `frc${teamNumber}`;
  const record = qualMatches
    ? getTeamRecord(qualMatches, myTeamKey, activeCursor)
    : { wins: 0, losses: 0, ties: 0 };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Simulation Replay</h2>

      <InfoBox>
        <p>
          <strong>Simulation Replay</strong> lets you time-travel through a past event match by match.
          Use the cursor slider to step through the qualification schedule and see how the event unfolded.
        </p>
        <p>
          Click <strong>Start Simulation</strong> to activate simulation mode across the entire dashboard.
          When active, an amber bar appears at the top of every page, and the Briefing, Path, and Event
          pages will reflect the state of the event at your cursor position — as if you were at that
          point in the competition.
        </p>
        <p>
          Click <strong>Stop Simulation</strong> or &quot;Exit Sim&quot; in the top bar to return all
          pages to live/real-time data. The simulation page itself always shows the replay view regardless
          of simulation mode.
        </p>
      </InfoBox>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Preset
          </label>
          <select
            value={selectedPreset}
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.eventKey === e.target.value);
              setSelectedPreset(e.target.value);
              if (isSimulating) startSimulation(e.target.value, 1);
              if (preset) setTeamNumber(preset.teamNumber);
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.eventKey}>
                {p.name} (Team {p.teamNumber})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Match Cursor: {activeCursor} / {maxCursor}
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
                    className={`text-xs py-1 px-2 rounded ${
                      isMyMatch ? 'bg-primary-50 dark:bg-primary-950' : ''
                    }`}
                  >
                    <span className="font-mono mr-2">Q{m.match_number}</span>
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
                    className={`text-xs py-1 px-2 rounded ${
                      isMyMatch ? 'bg-primary-50 dark:bg-primary-950 font-medium' : ''
                    }`}
                  >
                    <span className="font-mono mr-2">Q{m.match_number}</span>
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
