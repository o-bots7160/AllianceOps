'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { useSimulation } from '../../components/simulation-context';
import { useAuth } from '../../components/use-auth';
import { filterMatchesByCursor, getTeamRecord } from '../../lib/simulation-filters';
import { matchLabel, sortMatches } from '../../lib/match-utils';
import { useSimulationEpa } from '../../hooks/use-simulation-epa';
import { InfoBox } from '../../components/info-box';
import { LoadingSpinner } from '../../components/loading-spinner';
import { getApiBase } from '../../lib/api-base';
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard';
import {
  getAdapter,
  type DutySlotDefinition,
  type DutyTemplateSlot,
  type GameMetricDefinition,
} from '@allianceops/shared';

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

interface EnrichedTeam {
  team_number: number;
  nickname: string;
  epa: {
    total: number;
    auto: number;
    teleop: number;
    endgame: number;
    breakdown?: Record<string, number>;
  } | null;
  eventRecord: { wins: number; losses: number; ties: number } | null;
  winrate: number | null;
}

function EpaBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  auto: 'border-l-green-500',
  teleop: 'border-l-blue-500',
  endgame: 'border-l-purple-500',
  defense: 'border-l-orange-500',
  discipline: 'border-l-red-500',
};

const METRIC_COLOR = 'bg-cyan-500';

function TeamStrengthCard({
  teamKey,
  epaMap,
  metrics,
  record,
}: {
  teamKey: string;
  epaMap: Map<number, EnrichedTeam>;
  metrics: GameMetricDefinition[];
  record?: { wins: number; losses: number; ties: number };
}) {
  const num = parseInt(teamKey.replace('frc', ''), 10);
  const data = epaMap.get(num);
  const maxEpa = 40;
  const bd = data?.epa?.breakdown;
  const displayRecord = record ?? data?.eventRecord;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">{num}</span>
        {data?.nickname && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate ml-2">
            {data.nickname}
          </span>
        )}
      </div>
      {displayRecord && (
        <div className="flex gap-3 text-xs">
          <span className="text-green-600 dark:text-green-400 font-medium">
            {displayRecord.wins}W
          </span>
          <span className="text-red-600 dark:text-red-400 font-medium">
            {displayRecord.losses}L
          </span>
          {displayRecord.ties > 0 && (
            <span className="text-gray-500 font-medium">{displayRecord.ties}T</span>
          )}
          {!record && data?.winrate != null && (
            <span className="text-gray-500">({(data.winrate * 100).toFixed(0)}%)</span>
          )}
        </div>
      )}
      {data?.epa?.total != null ? (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-20">Total</span>
            <EpaBar value={data.epa.total} max={maxEpa} color="bg-primary-500" />
            <span className="w-8 text-right">{data.epa.total.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20">Auto</span>
            <EpaBar value={data.epa.auto ?? 0} max={maxEpa / 2} color="bg-green-500" />
            <span className="w-8 text-right">{(data.epa.auto ?? 0).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20">Teleop</span>
            <EpaBar value={data.epa.teleop ?? 0} max={maxEpa / 2} color="bg-blue-500" />
            <span className="w-8 text-right">{(data.epa.teleop ?? 0).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20">Endgame</span>
            <EpaBar value={data.epa.endgame ?? 0} max={maxEpa / 3} color="bg-purple-500" />
            <span className="w-8 text-right">{(data.epa.endgame ?? 0).toFixed(1)}</span>
          </div>

          {bd && metrics.length > 0 && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                <span className="font-medium text-gray-500 dark:text-gray-400">Game Breakdown</span>
              </div>
              {metrics.map(
                (m) =>
                  bd[m.key] != null && (
                    <div key={m.key} className="flex items-center gap-2">
                      <span className="w-20 truncate" title={m.description}>{m.label}</span>
                      <EpaBar value={Math.abs(bd[m.key])} max={6} color={METRIC_COLOR} />
                      <span className="w-8 text-right">{bd[m.key].toFixed(1)}</span>
                    </div>
                  ),
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No EPA data</p>
      )}
    </div>
  );
}

/** Sum EPA breakdown values for the given keys. */
function sumEpaKeys(
  teamNum: number,
  epaMap: Map<number, EnrichedTeam>,
  keys: string[],
): number {
  const bd = epaMap.get(teamNum)?.epa?.breakdown;
  if (!bd) return 0;
  return keys.reduce((sum, k) => sum + (bd[k] ?? 0), 0);
}

/** Normalize a template assignment value to a full DutyTemplateSlot. */
function toSlotConfig(val: string | DutyTemplateSlot | undefined): DutyTemplateSlot {
  if (!val) return { hint: '' };
  if (typeof val === 'string') return { hint: val };
  return val;
}

/** Build smart assignments from EPA data using adapter-defined duty slots. */
function buildTemplateAssignments(
  _templateName: string,
  teamNums: number[],
  epaMap: Map<number, EnrichedTeam>,
  dutySlots: DutySlotDefinition[],
  templateHints: Record<string, string | DutyTemplateSlot>,
): { assignments: Record<string, number | null>; notes: Record<string, string> } {
  if (teamNums.length === 0) return { assignments: {}, notes: {} };

  const byTotal = [...teamNums].sort(
    (a, b) => (epaMap.get(b)?.epa?.total ?? 0) - (epaMap.get(a)?.epa?.total ?? 0),
  );
  const weakest = byTotal[byTotal.length - 1];

  const a: Record<string, number | null> = {};
  const n: Record<string, string> = {};

  // Group slots by epaRankKeys signature to track assignment order
  const slotAssignIndex = new Map<string, number>();

  for (const slot of dutySlots) {
    const cfg = toSlotConfig(templateHints[slot.key]);
    n[slot.key] = cfg.hint;
    const strategy = cfg.strategy ?? 'strongest';

    // Skip: leave unassigned
    if (strategy === 'skip' || strategy === 'all') {
      a[slot.key] = null;
      continue;
    }

    // Weakest: assign lowest overall EPA scorer
    if (strategy === 'weakest') {
      a[slot.key] = weakest;
      continue;
    }

    // Defense/discipline defaults (when no explicit strategy)
    if (slot.category === 'defense' && !cfg.strategy) {
      a[slot.key] = null;
      continue;
    }
    if (slot.category === 'discipline' && !cfg.strategy) {
      a[slot.key] = null;
      continue;
    }

    // Strongest: rank by EPA keys (with optional override)
    const keys = cfg.epaRankKeysOverride ?? slot.epaRankKeys;
    if (keys && keys.length > 0) {
      const ranked = [...teamNums].sort(
        (x, y) => sumEpaKeys(y, epaMap, keys) - sumEpaKeys(x, epaMap, keys),
      );
      const sig = keys.join(',');
      const idx = slotAssignIndex.get(sig) ?? 0;
      a[slot.key] = ranked[idx % ranked.length];
      slotAssignIndex.set(sig, idx + 1);
    } else {
      // Fallback: rank by category EPA
      const catKey =
        slot.category === 'auto' ? 'auto' :
          slot.category === 'endgame' ? 'endgame' : 'teleop';
      const ranked = [...teamNums].sort(
        (x, y) =>
          (epaMap.get(y)?.epa?.[catKey] ?? 0) - (epaMap.get(x)?.epa?.[catKey] ?? 0),
      );
      const sig = `_cat_${catKey}`;
      const idx = slotAssignIndex.get(sig) ?? 0;
      a[slot.key] = ranked[idx % ranked.length];
      slotAssignIndex.set(sig, idx + 1);
    }
  }

  return { assignments: a, notes: n };
}

export default function PlannerPage() {
  const { eventKey, teamNumber, year } = useEventSetup();
  const { activeCursor } = useSimulation();
  const { activeTeam } = useAuth();
  const isOwnTeam = activeTeam !== null && activeTeam.teamNumber === teamNumber;
  const canEdit = isOwnTeam;
  const myTeamKey = `frc${teamNumber}`;

  let adapter: ReturnType<typeof getAdapter> | null = null;
  try {
    adapter = getAdapter(year);
  } catch {
    // No adapter registered for this year
  }

  const dutySlots = adapter?.dutySlots ?? [];
  const dutyTemplates = adapter?.dutyTemplates ?? [];
  const cardMetrics = (adapter?.gameSpecificMetrics ?? []).filter(
    (m) => m.renderLocation === 'team_card' || m.renderLocation === 'all',
  );

  const { data: rawMatches, loading: matchesLoading } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );
  const { data: teams, loading: teamsLoading } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const matches = rawMatches ? filterMatchesByCursor(rawMatches, activeCursor) : rawMatches;

  const [selectedMatch, setSelectedMatch] = useState<string>('');

  // Compute currentMatch before useSimulationEpa so we can scope the fetch
  const allSortedMatches = useMemo(
    () => (matches ? sortMatches(matches) : undefined),
    [matches],
  );

  const myMatches = useMemo(
    () =>
      allSortedMatches?.filter(
        (m) =>
          m.alliances.red.team_keys.includes(myTeamKey) ||
          m.alliances.blue.team_keys.includes(myTeamKey),
      ),
    [allSortedMatches, myTeamKey],
  );

  const nextUnplayed = myMatches?.find((m) => m.alliances.red.score < 0);
  const defaultMatch = nextUnplayed ?? myMatches?.[myMatches.length - 1];
  const currentMatch = myMatches?.find((m) => m.key === selectedMatch) ?? defaultMatch;

  // Extract all 6 match team numbers for the simulation EPA fetch
  const matchTeamNumbers = useMemo(() => {
    if (!currentMatch) return [];
    return [
      ...currentMatch.alliances.red.team_keys,
      ...currentMatch.alliances.blue.team_keys,
    ].map((k) => parseInt(k.replace('frc', ''), 10));
  }, [currentMatch]);

  const epaMap = useSimulationEpa(teams, eventKey, year, activeCursor, matchTeamNumbers);
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const { confirmIfDirty } = useUnsavedGuard(dirty);

  // Load saved plan when match or team changes
  useEffect(() => {
    if (!currentMatch || !activeTeam?.teamId || !eventKey || !isOwnTeam) return;
    let cancelled = false;
    setPlanLoading(true);
    const API_BASE = getApiBase();
    fetch(
      `${API_BASE}/teams/${activeTeam.teamId}/event/${eventKey}/match/${currentMatch.key}/plan`,
      { credentials: 'same-origin' },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.data) {
          setPlanLoading(false);
          return;
        }
        const plan = json.data;
        if (plan.duties && plan.duties.length > 0) {
          const loadedAssignments: Record<string, number | null> = {};
          const loadedNotes: Record<string, string> = {};
          for (const d of plan.duties) {
            loadedAssignments[d.slotKey] = d.teamNumber;
            loadedNotes[d.slotKey] = d.notes ?? '';
          }
          setAssignments(loadedAssignments);
          setNotes(loadedNotes);
          setTemplate('');
          setDirty(false);
          setLastUpdated(plan.updatedAt ?? null);
        }
        setPlanLoading(false);
      })
      .catch(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentMatch?.key, activeTeam?.teamId, eventKey, isOwnTeam]);

  const isRed = currentMatch?.alliances.red.team_keys.includes(myTeamKey);
  const allianceTeams = currentMatch
    ? isRed
      ? currentMatch.alliances.red.team_keys
      : currentMatch.alliances.blue.team_keys
    : [];

  const teamNumbers = allianceTeams.map((t) => parseInt(t.replace('frc', ''), 10));

  const handleTemplateChange = useCallback(
    (name: string) => {
      setTemplate(name);
      if (!name) {
        setAssignments({});
        setNotes({});
        return;
      }
      const tmpl = dutyTemplates.find((t) => t.name === name);
      const result = buildTemplateAssignments(
        name,
        teamNumbers,
        epaMap,
        dutySlots,
        tmpl?.assignments ?? {},
      );
      setAssignments(result.assignments);
      setNotes(result.notes);
      setDirty(true);
      setSaved(false);
    },
    [teamNumbers.join(','), teams, dutySlots, dutyTemplates],
  );

  const handleSave = async () => {
    if (!currentMatch || !canEdit) return;
    const duties = Object.entries(assignments)
      .filter(([, v]) => v !== null)
      .map(([slotKey, teamNumber]) => ({
        slotKey,
        teamNumber: teamNumber!,
        notes: notes[slotKey] || undefined,
      }));

    try {
      const API_BASE = getApiBase();
      await fetch(
        `${API_BASE}/teams/${activeTeam?.teamId}/event/${eventKey}/match/${currentMatch.key}/plan`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duties }),
        },
      );
      setSaved(true);
      setDirty(false);
      setLastUpdated(new Date().toISOString());
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handle error
    }
  };

  if (!eventKey) {
    return <p className="text-gray-500">Select an event on the Event page first.</p>;
  }

  if (matchesLoading || teamsLoading) {
    return <LoadingSpinner message="Loading planner data..." />;
  }

  return (
    <div className="space-y-6">
      <InfoBox
        heading={`Duty Planner${adapter ? ` — ${adapter.gameName} ${adapter.year}` : ''}`}
        headingExtra={
          <div className="flex items-center gap-3">
            {currentMatch && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${isRed
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  }`}
              >
                {isRed ? 'Red' : 'Blue'} Alliance
              </span>
            )}
          </div>
        }
      >
        <p>
          <strong>Duty Planner</strong> lets you assign specific roles to each alliance partner for an
          upcoming match. Select a match, then assign teams to their duties.
        </p>
        <p>
          Use <strong>Templates</strong> to quickly apply a pre-built strategy. Templates auto-assign
          teams to roles based on their EPA data. You can customize assignments after applying a
          template.
        </p>
        <p>
          Add <strong>notes</strong> to any duty slot for match-specific instructions. Click{' '}
          <strong>Save Plan</strong> to store the plan. Duty categories are color-coded: green (auto),
          blue (teleop), purple (endgame), orange (defense), red (discipline).
        </p>
      </InfoBox>

      {!canEdit && teamNumber && activeTeam && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Viewing team {teamNumber} — read-only (you&apos;re not a member)
          </p>
        </div>
      )}

      {!adapter && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No game adapter registered for {year}. Duty slots and templates are unavailable.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[8rem]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Match
          </label>
          <select
            value={selectedMatch || currentMatch?.key || ''}
            onChange={(e) => {
              const newKey = e.target.value;
              confirmIfDirty(() => {
                setSelectedMatch(newKey);
                setAssignments({});
                setNotes({});
                setTemplate('');
                setDirty(false);
              });
            }}
            className="w-full h-[38px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {myMatches?.map((m) => (
              <option key={m.key} value={m.key}>
                {matchLabel(m)}
              </option>
            ))}
          </select>
        </div>

        {dutyTemplates.length > 0 && (
          <div className="w-full sm:w-auto min-w-0 sm:max-w-[16rem] md:max-w-xs">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template
            </label>
            <select
              value={template}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={!canEdit}
              className="w-full h-[38px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm truncate disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Manual</option>
              {dutyTemplates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.label} — {t.description}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-3 sm:ml-auto shrink-0">
          <button
            onClick={handleSave}
            disabled={!canEdit}
            className={`h-[38px] px-4 rounded-md text-sm font-medium whitespace-nowrap ${canEdit
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
          >
            {canEdit ? 'Save Plan' : !activeTeam ? 'Join Team to Save' : 'Read Only'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {saved && (
          <span className="text-green-600 font-medium">&#10003; Saved</span>
        )}
        {dirty && !saved && (
          <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
        )}
        {lastUpdated && !dirty && !saved && (
          <span className="text-gray-400">
            Last saved {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      {activeCursor !== null && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            📊 Simulation active — EPA values reflect pre-event estimates. W-L records filtered to match {activeCursor}.
          </p>
        </div>
      )}

      {currentMatch && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Team Strengths
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allianceTeams.map((t) => (
                <TeamStrengthCard
                  key={t}
                  teamKey={t}
                  epaMap={epaMap}
                  metrics={cardMetrics}
                  record={activeCursor !== null && matches ? getTeamRecord(matches, t, activeCursor) : undefined}
                />
              ))}
            </div>
          </div>

          {dutySlots.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dutySlots.map((slot) => (
                <div
                  key={slot.key}
                  className={`rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${CATEGORY_COLORS[slot.category] || ''
                    } p-3 space-y-2`}
                >
                  <div className="font-medium text-sm" title={slot.description}>
                    {slot.label}
                  </div>
                  <select
                    value={assignments[slot.key] ?? ''}
                    onChange={(e) => {
                      setAssignments((a) => ({
                        ...a,
                        [slot.key]: e.target.value ? parseInt(e.target.value, 10) : null,
                      }));
                      setDirty(true);
                      setSaved(false);
                    }}
                    disabled={!canEdit}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Unassigned</option>
                    {teamNumbers.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Notes..."
                    value={notes[slot.key] || ''}
                    onChange={(e) => {
                      setNotes((n) => ({ ...n, [slot.key]: e.target.value }));
                      setDirty(true);
                      setSaved(false);
                    }}
                    disabled={!canEdit}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
