'use client';

import { useState, useMemo, useCallback } from 'react';
import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { useSimulation } from '../../components/simulation-context';
import { filterMatchesByCursor } from '../../lib/simulation-filters';
import { matchLabel, compLevelName, sortMatches } from '../../lib/match-utils';
import { InfoBox } from '../../components/info-box';
import { LoadingSpinner } from '../../components/loading-spinner';
import { DataTable, type ColumnDef } from '../../components/data-table';

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
  set_number: number;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  time: number | null;
  winning_alliance: string;
}

type MatchRow = TBAMatch & { _order: number };

function teamDisplay(teamKey: string): string {
  return teamKey.replace('frc', '');
}

export default function EventPage() {
  const { year, eventKey, teamNumber, setEventKey } = useEventSetup();
  const { activeCursor } = useSimulation();
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [sortColumn, setSortColumn] = useState('_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: teamEvents } = useApi<TBAEvent[]>(
    teamNumber && year ? `team/${teamNumber}/events?year=${year}` : null,
  );

  const { data: allEvents, loading: allEventsLoading } = useApi<TBAEvent[]>(
    showAllEvents && year ? `events?year=${year}` : null,
  );

  const { data: rawMatches, loading: matchesLoading, meta } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );

  const matches = rawMatches ? filterMatchesByCursor(rawMatches, activeCursor) : undefined;

  const myTeamKey = `frc${teamNumber}`;
  const sortedMatches = matches ? sortMatches(matches) : undefined;

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

  const displayMatches = useMemo<MatchRow[]>(() => {
    if (!sortedMatches) return [];
    const rows: MatchRow[] = sortedMatches.map((m, i) => ({ ...m, _order: i }));
    if (sortColumn === '_order') {
      return sortDirection === 'asc' ? rows : [...rows].reverse();
    }
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'comp_level':
          cmp = a._order - b._order;
          break;
        case 'redScore':
          cmp = a.alliances.red.score - b.alliances.red.score;
          break;
        default:
          cmp = a._order - b._order;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [sortedMatches, sortColumn, sortDirection]);

  const matchColumns = useMemo<ColumnDef<MatchRow>[]>(
    () => [
      {
        key: '_order',
        header: 'Match',
        sortable: true,
        render: (row) => <span className="font-mono">{matchLabel(row)}</span>,
      },
      {
        key: 'comp_level',
        header: 'Phase',
        sortable: true,
        render: (row) => compLevelName(row.comp_level),
      },
      {
        key: 'redAlliance',
        header: <span className="text-red-600">Red Alliance</span>,
        render: (row) => (
          <>
            {row.alliances.red.team_keys.map((t) => (
              <span
                key={t}
                className={`inline-block mr-2 ${
                  t === myTeamKey
                    ? 'font-bold text-primary-600'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {teamDisplay(t)}
              </span>
            ))}
          </>
        ),
      },
      {
        key: 'blueAlliance',
        header: <span className="text-blue-600">Blue Alliance</span>,
        render: (row) => (
          <>
            {row.alliances.blue.team_keys.map((t) => (
              <span
                key={t}
                className={`inline-block mr-2 ${
                  t === myTeamKey
                    ? 'font-bold text-primary-600'
                    : 'text-blue-700 dark:text-blue-400'
                }`}
              >
                {teamDisplay(t)}
              </span>
            ))}
          </>
        ),
      },
      {
        key: 'redScore',
        header: 'Score',
        sortable: true,
        render: (row) => (
          <span className="font-mono">
            {row.alliances.red.score >= 0
              ? `${row.alliances.red.score} - ${row.alliances.blue.score}`
              : '—'}
          </span>
        ),
      },
    ],
    [myTeamKey],
  );

  const teamEventKeys = useMemo(
    () => new Set(teamEvents?.map((e) => e.key)),
    [teamEvents],
  );

  const displayEvents = useMemo(() => {
    const events = showAllEvents ? allEvents : teamEvents;
    return events
      ?.filter((e) => e.name)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [showAllEvents, allEvents, teamEvents]);

  return (
    <div className="space-y-6">
      <InfoBox heading="Event Setup">
        <p>
          <strong>Event Setup</strong> shows your team&apos;s events and match schedule. Use the header
          controls to set your team number, year, and event — all other pages use these selections.
        </p>
        <p>
          Data is pulled live from <strong>The Blue Alliance</strong> (match schedules, scores) and{' '}
          <strong>Statbotics</strong> (EPA ratings, predictions). No manual scouting or data entry needed.
        </p>
        <p>
          The schedule below shows all matches for the selected event — qualifications, semifinals,
          and finals. Your team&apos;s matches are highlighted. Scores appear as matches are played.
        </p>
      </InfoBox>

      {teamNumber > 0 && year > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {showAllEvents ? `All Events — ${year}` : `Team ${teamNumber} Events — ${year}`}
            </h3>
            <button
              onClick={() => setShowAllEvents((v) => !v)}
              className="text-xs px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {showAllEvents ? 'Show My Events Only' : 'Show All Events'}
            </button>
          </div>

          {(showAllEvents && allEventsLoading) && (
            <LoadingSpinner message="Loading all events..." />
          )}

          {displayEvents && displayEvents.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {displayEvents.map((ev) => {
                const isSelected = ev.key === eventKey;
                const isMyEvent = teamEventKeys.has(ev.key);
                return (
                  <button
                    key={ev.key}
                    onClick={() => setEventKey(ev.key)}
                    className={`text-left rounded-lg border p-3 text-sm transition-colors ${isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                      }`}
                  >
                    <div className="font-medium flex items-center gap-2">
                      {ev.name}
                      {showAllEvents && isMyEvent && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                          My Team
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {ev.city}, {ev.state_prov} — {ev.start_date}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {displayEvents && displayEvents.length === 0 && (
            <p className="text-sm text-gray-500">
              {showAllEvents ? 'No events found for this year.' : `No events found for team ${teamNumber} in ${year}.`}
            </p>
          )}
        </div>
      )}

      {!teamNumber && (
        <p className="text-gray-500">Enter your team number in the header to get started.</p>
      )}

      {meta && (
        <p className="text-xs text-gray-500">
          Last refresh: {new Date(meta.lastRefresh).toLocaleString()}
          {meta.stale && <span className="ml-2 text-amber-500">(stale cache)</span>}
        </p>
      )}

      {matchesLoading && <LoadingSpinner message="Loading matches..." />}

      {displayMatches.length > 0 && (
        <DataTable
          data={displayMatches}
          columns={matchColumns}
          keyExtractor={(row) => row.key}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          isRowHighlighted={(row) =>
            row.alliances.red.team_keys.includes(myTeamKey) ||
            row.alliances.blue.team_keys.includes(myTeamKey)
          }
          emptyMessage="No matches found."
        />
      )}

      {eventKey && !matchesLoading && displayMatches.length === 0 && (
        <p className="text-gray-500">No matches found for this event.</p>
      )}
    </div>
  );
}
