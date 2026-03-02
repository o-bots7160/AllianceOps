'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useEventSetup } from './use-event-setup';
import { useAuth } from './use-auth';
import { useApi } from './use-api';
import { Combobox } from './combobox';
import {
  TeamCombobox,
  type TeamOption,
  type RecentSearch,
  loadRecentSearches,
  addRecentSearch,
} from './team-combobox';

interface TBAEvent {
  key: string;
  name: string;
  start_date: string;
  city: string;
  state_prov: string;
}

interface TBATeamInfo {
  nickname: string;
  team_number: number;
}

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

export function GlobalControls() {
  const { year, eventKey, teamNumber, setYear, setEventKey, setTeamNumber } = useEventSetup();
  const { user, activeTeam, setActiveTeamId } = useAuth();
  const hasInitializedRef = useRef(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  // Auto-populate team number from active team on first load only
  useEffect(() => {
    if (!hasInitializedRef.current && activeTeam) {
      hasInitializedRef.current = true;
      if (activeTeam.teamNumber !== teamNumber) {
        setTeamNumber(activeTeam.teamNumber);
      }
    }
  }, [activeTeam, teamNumber, setTeamNumber]);

  const teamOptions: TeamOption[] = useMemo(
    () =>
      user?.teams.map((t) => ({
        teamId: t.teamId,
        teamNumber: t.teamNumber,
        name: t.name,
      })) ?? [],
    [user?.teams],
  );

  const handleTeamSelect = useCallback(
    (teamId: string, num: number) => {
      setActiveTeamId(teamId);
      setTeamNumber(num);
    },
    [setActiveTeamId, setTeamNumber],
  );

  const handleManualEntry = useCallback(
    (num: number) => {
      setTeamNumber(num);
    },
    [setTeamNumber],
  );

  const { data: teamEvents, error: teamEventsError } = useApi<TBAEvent[]>(
    teamNumber && year ? `team/${teamNumber}/events?year=${year}` : null,
  );

  // Fetch team info (nickname) from TBA for any valid team number
  const { data: teamInfo } = useApi<TBATeamInfo>(
    teamNumber ? `team/${teamNumber}/info` : null,
  );

  // Only record a recent search after TBA confirms the team exists (returns event data)
  const lastRecordedTeamRef = useRef<number>(0);
  useEffect(() => {
    if (teamNumber && teamEvents && !teamEventsError && teamNumber !== lastRecordedTeamRef.current) {
      lastRecordedTeamRef.current = teamNumber;
      const memberTeam = teamOptions.find((t) => t.teamNumber === teamNumber);
      const name = memberTeam?.name ?? teamInfo?.nickname;
      setRecentSearches(addRecentSearch(teamNumber, name));
    }
  }, [teamNumber, teamEvents, teamEventsError, teamOptions, teamInfo]);

  // Update recent search name when team info loads after initial recording
  useEffect(() => {
    if (teamNumber && teamInfo?.nickname && lastRecordedTeamRef.current === teamNumber) {
      const memberTeam = teamOptions.find((t) => t.teamNumber === teamNumber);
      if (!memberTeam) {
        setRecentSearches(addRecentSearch(teamNumber, teamInfo.nickname));
      }
    }
  }, [teamInfo, teamNumber, teamOptions]);

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
      <div className="w-28 min-w-0">
        <TeamCombobox
          teamNumber={teamNumber}
          teams={teamOptions}
          recentSearches={recentSearches}
          onTeamSelect={handleTeamSelect}
          onManualEntry={handleManualEntry}
          compact
        />
      </div>

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
