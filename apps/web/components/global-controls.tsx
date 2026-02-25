'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useEventSetup } from './use-event-setup';
import { useAuth } from './use-auth';
import { useApi } from './use-api';
import { Combobox } from './combobox';

interface TBAEvent {
  key: string;
  name: string;
  start_date: string;
  city: string;
  state_prov: string;
}

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

export function GlobalControls() {
  const { year, eventKey, teamNumber, setYear, setEventKey, setTeamNumber } = useEventSetup();
  const { user, activeTeam, setActiveTeamId } = useAuth();
  const [teamInput, setTeamInput] = useState(String(teamNumber || ''));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedSetTeam = useCallback(
    (num: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (num > 0) setTeamNumber(num);
      }, 400);
    },
    [setTeamNumber],
  );

  // Auto-populate team number from active team membership
  useEffect(() => {
    if (activeTeam && activeTeam.teamNumber !== teamNumber) {
      setTeamNumber(activeTeam.teamNumber);
      setTeamInput(String(activeTeam.teamNumber));
    }
  }, [activeTeam, teamNumber, setTeamNumber]);

  const teamOptions = useMemo(
    () =>
      user?.teams.map((t) => ({
        value: t.teamId,
        label: `${t.teamNumber} — ${t.name}`,
      })) ?? [],
    [user?.teams],
  );

  const { data: teamEvents } = useApi<TBAEvent[]>(
    teamNumber && year ? `team/${teamNumber}/events?year=${year}` : null,
  );

  const eventOptions = useMemo(
    () =>
      teamEvents
        ?.slice()
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .map((ev) => ({
          value: ev.key,
          label: `${ev.name} — ${ev.city}, ${ev.state_prov}`,
        })) ?? [],
    [teamEvents],
  );

  return (
    <div className="flex items-center gap-2 text-sm min-w-0">
      {/* Team switcher (if user belongs to teams) */}
      {teamOptions.length > 1 && (
        <div className="w-40 min-w-0">
          <Combobox
            value={activeTeam?.teamId ?? ''}
            options={teamOptions}
            onChange={setActiveTeamId}
            placeholder="Team"
            compact
          />
        </div>
      )}

      <label className="sr-only" htmlFor="gc-team">Team</label>
      <input
        id="gc-team"
        type="text"
        inputMode="numeric"
        value={teamInput}
        onChange={(e) => {
          setTeamInput(e.target.value);
          const num = parseInt(e.target.value, 10);
          debouncedSetTeam(num);
        }}
        placeholder="Team #"
        className="w-16 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
      />

      <div className="w-20">
        <Combobox
          value={year ? String(year) : ''}
          options={YEAR_OPTIONS}
          onChange={(v) => setYear(parseInt(v, 10) || 0)}
          placeholder="Year"
          compact
        />
      </div>

      <div className="w-64 min-w-0">
        <Combobox
          value={eventKey}
          options={eventOptions}
          onChange={setEventKey}
          placeholder={!teamNumber ? 'Enter team #' : eventOptions.length === 0 ? 'No events' : 'Select event...'}
          disabled={!teamNumber || eventOptions.length === 0}
          compact
        />
      </div>
    </div>
  );
}
