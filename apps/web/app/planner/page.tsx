'use client';

import { useState, useCallback } from 'react';
import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { InfoBox } from '../../components/info-box';
import { LoadingSpinner } from '../../components/loading-spinner';
import {
  getAdapter,
  type DutySlotDefinition,
  type GameMetricDefinition,
} from '@allianceops/shared';

interface TBAMatch {
  key: string;
  comp_level: string;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
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
}: {
  teamKey: string;
  epaMap: Map<number, EnrichedTeam>;
  metrics: GameMetricDefinition[];
}) {
  const num = parseInt(teamKey.replace('frc', ''), 10);
  const data = epaMap.get(num);
  const maxEpa = 40;
  const bd = data?.epa?.breakdown;

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
      {data?.eventRecord && (
        <div className="flex gap-3 text-xs">
          <span className="text-green-600 dark:text-green-400 font-medium">
            {data.eventRecord.wins}W
          </span>
          <span className="text-red-600 dark:text-red-400 font-medium">
            {data.eventRecord.losses}L
          </span>
          {data.eventRecord.ties > 0 && (
            <span className="text-gray-500 font-medium">{data.eventRecord.ties}T</span>
          )}
          {data.winrate != null && (
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

/** Build smart assignments from EPA data using adapter-defined duty slots. */
function buildTemplateAssignments(
  templateName: string,
  teamNums: number[],
  epaMap: Map<number, EnrichedTeam>,
  dutySlots: DutySlotDefinition[],
  templateHints: Record<string, string>,
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
    const hint = templateHints[slot.key] ?? '';
    n[slot.key] = hint;

    if (slot.category === 'defense') {
      if (templateName === 'safe') {
        a[slot.key] = null;
      } else {
        a[slot.key] = weakest;
      }
      continue;
    }

    if (slot.category === 'discipline') {
      a[slot.key] = null;
      continue;
    }

    // Rank teams by the slot's epaRankKeys
    const keys = slot.epaRankKeys;
    if (keys && keys.length > 0) {
      const ranked = [...teamNums].sort(
        (x, y) => sumEpaKeys(y, epaMap, keys) - sumEpaKeys(x, epaMap, keys),
      );
      // Track how many times we've assigned from this ranking
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

  const { data: matches, loading: matchesLoading } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );
  const { data: teams, loading: teamsLoading } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const epaMap = new Map<number, EnrichedTeam>();
  if (teams) {
    for (const t of teams) {
      epaMap.set(t.team_number, t);
    }
  }

  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<string>('');
  const [saved, setSaved] = useState(false);

  const qualMatches = matches
    ?.filter((m) => m.comp_level === 'qm')
    .sort((a, b) => a.match_number - b.match_number);

  const myMatches = qualMatches?.filter(
    (m) =>
      m.alliances.red.team_keys.includes(myTeamKey) ||
      m.alliances.blue.team_keys.includes(myTeamKey),
  );

  const nextUnplayed = myMatches?.find((m) => m.alliances.red.score < 0);
  const defaultMatch = nextUnplayed ?? myMatches?.[myMatches.length - 1];
  const currentMatch = myMatches?.find((m) => m.key === selectedMatch) ?? defaultMatch;

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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamNumbers.join(','), teams, dutySlots, dutyTemplates],
  );

  const handleSave = async () => {
    if (!currentMatch) return;
    const duties = Object.entries(assignments)
      .filter(([, v]) => v !== null)
      .map(([slotKey, teamNumber]) => ({
        slotKey,
        teamNumber: teamNumber!,
        notes: notes[slotKey] || undefined,
      }));

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071/api';
      await fetch(
        `${API_BASE}/event/${eventKey}/match/${currentMatch.key}/plan`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duties }),
        },
      );
      setSaved(true);
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Duty Planner
          {adapter && (
            <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-2">
              {adapter.gameName} {adapter.year}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-green-600 text-sm font-medium">✓ Saved</span>
          )}
          {currentMatch && (
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isRed
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }`}
            >
              {isRed ? 'Red' : 'Blue'} Alliance
            </span>
          )}
        </div>
      </div>

      <InfoBox>
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

      {!adapter && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No game adapter registered for {year}. Duty slots and templates are unavailable.
          </p>
        </div>
      )}

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Match
          </label>
          <select
            value={selectedMatch || currentMatch?.key || ''}
            onChange={(e) => {
              setSelectedMatch(e.target.value);
              setAssignments({});
              setNotes({});
              setTemplate('');
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {myMatches?.map((m) => (
              <option key={m.key} value={m.key}>
                Q{m.match_number}
              </option>
            ))}
          </select>
        </div>

        {dutyTemplates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template
            </label>
            <select
              value={template}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
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
      </div>

      {currentMatch && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Team Strengths
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allianceTeams.map((t) => (
                <TeamStrengthCard key={t} teamKey={t} epaMap={epaMap} metrics={cardMetrics} />
              ))}
            </div>
          </div>

          {dutySlots.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dutySlots.map((slot) => (
                <div
                  key={slot.key}
                  className={`rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${
                    CATEGORY_COLORS[slot.category] || ''
                  } p-3 space-y-2`}
                >
                  <div className="font-medium text-sm" title={slot.description}>
                    {slot.label}
                  </div>
                  <select
                    value={assignments[slot.key] ?? ''}
                    onChange={(e) =>
                      setAssignments((a) => ({
                        ...a,
                        [slot.key]: e.target.value ? parseInt(e.target.value, 10) : null,
                      }))
                    }
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
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
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [slot.key]: e.target.value }))
                    }
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
          >
            Save Plan
          </button>
        </div>
      )}
    </div>
  );
}
