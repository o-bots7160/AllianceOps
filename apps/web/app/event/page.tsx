'use client';

import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { useSimulation } from '../../components/simulation-context';
import { filterMatchesByCursor } from '../../lib/simulation-filters';
import { Combobox } from '../../components/combobox';
import { InfoBox } from '../../components/info-box';

interface TBAEvent {
  key: string;
  name: string;
  start_date: string;
  city: string;
  state_prov: string;
}

interface TBAMatch {
  key: string;
  comp_level: string;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  time: number | null;
  winning_alliance: string;
}

function teamDisplay(teamKey: string): string {
  return teamKey.replace('frc', '');
}

export default function EventPage() {
  const { year, eventKey, teamNumber, setYear, setEventKey, setTeamNumber } = useEventSetup();
  const { activeCursor } = useSimulation();
  const { data: events, loading: eventsLoading } = useApi<TBAEvent[]>(
    year ? `events?year=${year}` : null,
  );
  const { data: rawMatches, loading: matchesLoading, meta } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );

  const matches = rawMatches ? filterMatchesByCursor(rawMatches, activeCursor) : undefined;

  const myTeamKey = `frc${teamNumber}`;
  const sortedMatches = matches
    ?.filter((m) => m.comp_level === 'qm')
    .sort((a, b) => a.match_number - b.match_number);

  const sortedEvents = events
    ?.filter((e) => e.name)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: String(y), label: String(y) };
  });

  const eventOptions =
    sortedEvents?.map((ev) => ({
      value: ev.key,
      label: `${ev.name} — ${ev.city}, ${ev.state_prov}`,
    })) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Event Setup</h2>

      <InfoBox>
        <p>
          <strong>Event Setup</strong> is your starting point. Select your team number, competition year,
          and event to configure the entire dashboard. All other pages use these selections.
        </p>
        <p>
          Data is pulled live from <strong>The Blue Alliance</strong> (match schedules, scores) and{' '}
          <strong>Statbotics</strong> (EPA ratings, predictions). No manual scouting or data entry needed.
        </p>
        <p>
          The qual schedule below shows all matches for the selected event. Your team&apos;s matches are
          highlighted. Scores appear as matches are played.
        </p>
      </InfoBox>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            My Team #
          </label>
          <input
            type="number"
            value={teamNumber || ''}
            onChange={(e) => setTeamNumber(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Year
          </label>
          <Combobox
            value={year ? String(year) : ''}
            options={yearOptions}
            onChange={(v) => setYear(parseInt(v, 10) || 0)}
            placeholder="Select year..."
            disabled={!teamNumber}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Event
          </label>
          <Combobox
            value={eventKey}
            options={eventOptions}
            onChange={setEventKey}
            placeholder={eventsLoading ? 'Loading events...' : 'Select event...'}
            disabled={!year || eventsLoading || !events}
          />
        </div>
      </div>

      {meta && (
        <p className="text-xs text-gray-500">
          Last refresh: {new Date(meta.lastRefresh).toLocaleString()}
          {meta.stale && <span className="ml-2 text-amber-500">(stale cache)</span>}
        </p>
      )}

      {matchesLoading && <p className="text-gray-500">Loading matches...</p>}

      {sortedMatches && sortedMatches.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Qual Schedule ({sortedMatches.length} matches)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="py-2 px-3">Match</th>
                  <th className="py-2 px-3 text-red-600">Red Alliance</th>
                  <th className="py-2 px-3 text-blue-600">Blue Alliance</th>
                  <th className="py-2 px-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatches.map((match) => {
                  const isMyMatch =
                    match.alliances.red.team_keys.includes(myTeamKey) ||
                    match.alliances.blue.team_keys.includes(myTeamKey);
                  return (
                    <tr
                      key={match.key}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        isMyMatch ? 'bg-primary-50 dark:bg-primary-950' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-mono">Q{match.match_number}</td>
                      <td className="py-2 px-3">
                        {match.alliances.red.team_keys.map((t) => (
                          <span
                            key={t}
                            className={`inline-block mr-2 ${
                              t === myTeamKey ? 'font-bold text-primary-600' : 'text-red-700 dark:text-red-400'
                            }`}
                          >
                            {teamDisplay(t)}
                          </span>
                        ))}
                      </td>
                      <td className="py-2 px-3">
                        {match.alliances.blue.team_keys.map((t) => (
                          <span
                            key={t}
                            className={`inline-block mr-2 ${
                              t === myTeamKey ? 'font-bold text-primary-600' : 'text-blue-700 dark:text-blue-400'
                            }`}
                          >
                            {teamDisplay(t)}
                          </span>
                        ))}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {match.alliances.red.score >= 0
                          ? `${match.alliances.red.score} - ${match.alliances.blue.score}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {eventKey && !matchesLoading && (!sortedMatches || sortedMatches.length === 0) && (
        <p className="text-gray-500">No matches found for this event.</p>
      )}
    </div>
  );
}
