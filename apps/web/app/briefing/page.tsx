'use client';

import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';

interface TBAMatch {
  key: string;
  comp_level: string;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  winning_alliance: string;
}

interface TeamEpaData {
  team: number;
  epa: { total: number; auto: number; teleop: number; endgame: number };
  record: { wins: number; losses: number; ties: number };
  winrate: number;
}

function teamNum(key: string): string {
  return key.replace('frc', '');
}

function EpaBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function TeamCard({ teamKey, epaMap }: { teamKey: string; epaMap: Map<number, TeamEpaData> }) {
  const num = parseInt(teamKey.replace('frc', ''), 10);
  const data = epaMap.get(num);
  const maxEpa = 40;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">{teamNum(teamKey)}</span>
        {data?.record && (
          <span className="text-xs text-gray-500">
            {data.record.wins}W-{data.record.losses}L
          </span>
        )}
      </div>
      {data?.epa ? (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-14">Total</span>
            <EpaBar value={data.epa.total} max={maxEpa} color="bg-primary-500" />
            <span className="w-8 text-right">{data.epa.total.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14">Auto</span>
            <EpaBar value={data.epa.auto} max={maxEpa / 2} color="bg-green-500" />
            <span className="w-8 text-right">{data.epa.auto.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14">Teleop</span>
            <EpaBar value={data.epa.teleop} max={maxEpa / 2} color="bg-blue-500" />
            <span className="w-8 text-right">{data.epa.teleop.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14">Endgame</span>
            <EpaBar value={data.epa.endgame} max={maxEpa / 3} color="bg-purple-500" />
            <span className="w-8 text-right">{data.epa.endgame.toFixed(1)}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">No EPA data</p>
      )}
    </div>
  );
}

export default function BriefingPage() {
  const { eventKey, teamNumber } = useEventSetup();
  const myTeamKey = `frc${teamNumber}`;

  const { data: matches } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );
  const { data: teams } = useApi<TeamEpaData[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const epaMap = new Map<number, TeamEpaData>();
  if (teams) {
    for (const t of teams) {
      epaMap.set(t.team, t);
    }
  }

  // Find next unplayed match for our team
  const qualMatches = matches
    ?.filter((m) => m.comp_level === 'qm')
    .sort((a, b) => a.match_number - b.match_number);

  const nextMatch = qualMatches?.find(
    (m) =>
      (m.alliances.red.team_keys.includes(myTeamKey) ||
        m.alliances.blue.team_keys.includes(myTeamKey)) &&
      m.alliances.red.score < 0,
  );

  // Fall back to last match if all played
  const currentMatch =
    nextMatch ??
    qualMatches
      ?.filter(
        (m) =>
          m.alliances.red.team_keys.includes(myTeamKey) ||
          m.alliances.blue.team_keys.includes(myTeamKey),
      )
      .pop();

  if (!eventKey) {
    return <p className="text-gray-500">Select an event on the Event page first.</p>;
  }

  if (!currentMatch) {
    return <p className="text-gray-500">Loading match data...</p>;
  }

  const isRed = currentMatch.alliances.red.team_keys.includes(myTeamKey);
  const ourTeams = isRed
    ? currentMatch.alliances.red.team_keys
    : currentMatch.alliances.blue.team_keys;
  const oppTeams = isRed
    ? currentMatch.alliances.blue.team_keys
    : currentMatch.alliances.red.team_keys;

  // Simple win conditions based on EPA comparison
  const ourAvgEpa =
    ourTeams.reduce((sum, t) => {
      const num = parseInt(t.replace('frc', ''), 10);
      return sum + (epaMap.get(num)?.epa?.total ?? 0);
    }, 0) / ourTeams.length;

  const oppAvgEpa =
    oppTeams.reduce((sum, t) => {
      const num = parseInt(t.replace('frc', ''), 10);
      return sum + (epaMap.get(num)?.epa?.total ?? 0);
    }, 0) / oppTeams.length;

  const epaDiff = ourAvgEpa - oppAvgEpa;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Match Briefing — Q{currentMatch.match_number}
        </h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isRed
              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
          }`}
        >
          {isRed ? 'Red' : 'Blue'} Alliance
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3">
            Our Alliance
          </h3>
          <div className="space-y-3">
            {ourTeams.map((t) => (
              <TeamCard key={t} teamKey={t} epaMap={epaMap} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">
            Opponents
          </h3>
          <div className="space-y-3">
            {oppTeams.map((t) => (
              <TeamCard key={t} teamKey={t} epaMap={epaMap} />
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
  );
}
