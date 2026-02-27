'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useEventSetup } from '../../components/use-event-setup';
import { useAuth } from '../../components/use-auth';
import { useApi } from '../../components/use-api';
import { InfoBox } from '../../components/info-box';
import { LoadingSpinner } from '../../components/loading-spinner';
import { getApiBase } from '../../lib/api-base';
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard';

interface EnrichedTeam {
  team_number: number;
  nickname?: string;
  epa: { total: number; auto: number; teleop: number; endgame: number } | null;
  eventRecord: { wins: number; losses: number; ties: number } | null;
}

interface PicklistEntry {
  teamNumber: number;
  nickname: string;
  score: number;
  epaTotal: number;
  epaAuto: number;
  epaTeleop: number;
  epaEndgame: number;
  rank: number;
  excluded: boolean;
  tags: string[];
  notes: string;
}

interface SavedPicklistEntry {
  teamNumber: number;
  rank: number;
  tags: string[] | string;
  notes: string | null;
  excluded: boolean;
}

const POLL_INTERVAL_MS = 30_000;

function generatePicklist(teams: EnrichedTeam[]): PicklistEntry[] {
  if (!teams.length) return [];

  const maxEpa = Math.max(...teams.map((t) => t.epa?.total ?? 0), 1);

  return teams
    .map((t) => ({
      teamNumber: t.team_number,
      nickname: t.nickname ?? `Team ${t.team_number}`,
      score: (t.epa?.total ?? 0) / maxEpa,
      epaTotal: t.epa?.total ?? 0,
      epaAuto: t.epa?.auto ?? 0,
      epaTeleop: t.epa?.teleop ?? 0,
      epaEndgame: t.epa?.endgame ?? 0,
      rank: 0,
      excluded: false,
      tags: [] as string[],
      notes: '',
    }))
    .sort((a, b) => b.score - a.score)
    .map((t, i) => ({ ...t, rank: i + 1 }));
}

/** Merge saved annotations onto EPA-generated entries. */
function mergePicklist(
  base: PicklistEntry[],
  saved: SavedPicklistEntry[],
): PicklistEntry[] {
  const savedMap = new Map(saved.map((s) => [s.teamNumber, s]));
  const merged = base.map((entry) => {
    const s = savedMap.get(entry.teamNumber);
    if (!s) return entry;
    const tags = Array.isArray(s.tags) ? s.tags : [];
    return { ...entry, rank: s.rank, excluded: s.excluded, tags, notes: s.notes ?? '' };
  });
  // Re-sort by saved rank
  merged.sort((a, b) => a.rank - b.rank);
  return merged;
}

function downloadCSV(entries: PicklistEntry[]) {
  const header = 'Rank,Team,Name,Score,EPA Total,Auto,Teleop,Endgame,Tags,Notes';
  const rows = entries
    .filter((e) => !e.excluded)
    .map(
      (e) =>
        `${e.rank},${e.teamNumber},"${e.nickname}",${e.score.toFixed(3)},${e.epaTotal.toFixed(1)},${e.epaAuto.toFixed(1)},${e.epaTeleop.toFixed(1)},${e.epaEndgame.toFixed(1)},"${e.tags.join(';')}","${e.notes}"`,
    );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'picklist.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function PicklistPage() {
  const { eventKey, teamNumber, setEventKey } = useEventSetup();
  const { activeTeam } = useAuth();
  const isOwnTeam = activeTeam !== null && activeTeam.teamNumber === teamNumber;
  const canEdit = isOwnTeam;
  const teamId = isOwnTeam ? activeTeam?.teamId ?? null : null;
  const { data: teams, loading: teamsLoading } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [entries, setEntries] = useState<PicklistEntry[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useUnsavedGuard(dirty);

  // Track base entries (from EPA data) for merging
  const baseEntriesRef = useRef<PicklistEntry[]>([]);
  const loadAbortRef = useRef<AbortController | null>(null);

  // Track previous eventKey to detect changes and reset state
  const prevEventKeyRef = useRef(eventKey);
  useEffect(() => {
    if (prevEventKeyRef.current === eventKey) return;
    const oldKey = prevEventKeyRef.current;
    prevEventKeyRef.current = eventKey;

    if (dirty) {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        // User cancelled — revert eventKey
        setEventKey(oldKey);
        prevEventKeyRef.current = oldKey;
        return;
      }
    }

    // Abort any in-flight picklist load for the previous event
    loadAbortRef.current?.abort();

    // Reset state for new event
    setEntries([]);
    baseEntriesRef.current = [];
    setInitialized(false);
    setDirty(false);
    setSaved(false);
    setLastUpdated(null);
    setLoadError(null);
  }, [eventKey, dirty, setEventKey]);

  // Generate base entries from teams
  const baseEntries = useMemo(() => {
    if (!teams) return [];
    return generatePicklist(teams);
  }, [teams]);

  // Load saved picklist from API
  const loadPicklist = useCallback(async () => {
    if (!eventKey || !teamId) return;
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    try {
      const API_BASE = getApiBase();
      const res = await fetch(`${API_BASE}/teams/${teamId}/event/${eventKey}/picklist`, {
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return; // Not authorized — use local only
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted) return;
      if (json.data && json.data.entries && baseEntriesRef.current.length > 0) {
        const merged = mergePicklist(baseEntriesRef.current, json.data.entries);
        setEntries(merged);
        setLastUpdated(json.data.updatedAt);
        setDirty(false);
      }
    } catch {
      // Silently fail on polling errors
    }
  }, [eventKey, teamId]);

  // Initialize: generate base, then load saved data on top
  useEffect(() => {
    if (baseEntries.length > 0 && !initialized) {
      baseEntriesRef.current = baseEntries;
      setEntries(baseEntries);
      setInitialized(true);
    }
  }, [baseEntries, initialized]);

  // After initialization, load saved picklist
  useEffect(() => {
    if (initialized && teamId) {
      loadPicklist();
    }
  }, [initialized, teamId, loadPicklist]);

  // Poll for updates every 30s
  useEffect(() => {
    if (!initialized || !teamId || !eventKey) return;
    const interval = setInterval(() => {
      if (!dirty) {
        loadPicklist();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [initialized, teamId, eventKey, dirty, loadPicklist]);

  // Wrapper for setEntries that marks dirty
  const updateEntries = useCallback(
    (updater: (prev: PicklistEntry[]) => PicklistEntry[]) => {
      setEntries((prev) => {
        const next = updater(prev);
        setDirty(true);
        setSaved(false);
        return next;
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!eventKey || !teamId) return;
    setSaving(true);
    setLoadError(null);
    try {
      const API_BASE = getApiBase();
      const payload = entries.map((e) => ({
        teamNumber: e.teamNumber,
        rank: e.rank,
        tags: e.tags,
        notes: e.notes,
        excluded: e.excluded,
      }));
      const res = await fetch(`${API_BASE}/teams/${teamId}/event/${eventKey}/picklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ entries: payload }),
      });
      if (!res.ok) {
        const text = await res.text();
        setLoadError(`Save failed: ${res.status} ${text}`);
        return;
      }
      const json = await res.json();
      setLastUpdated(json.data?.updatedAt ?? null);
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setLoadError('Save failed — network error');
    } finally {
      setSaving(false);
    }
  }, [eventKey, teamId, entries]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [entries]);

  const filtered = entries.filter((e) => {
    if (search && !String(e.teamNumber).includes(search) && !e.nickname.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (tagFilter && !e.tags.includes(tagFilter)) return false;
    return true;
  });

  if (!eventKey) {
    return <p className="text-gray-500">Select an event on the Event page first.</p>;
  }

  if (teamsLoading) {
    return <LoadingSpinner message="Loading team data..." />;
  }

  return (
    <div className="space-y-6">
      <InfoBox heading="Picklist">
        <p>
          <strong>Picklist</strong> ranks all teams at the event by a composite score based on Statbotics
          EPA ratings — auto, teleop, and endgame. Use this during alliance selection to identify the
          strongest available partners.
        </p>
        <p>
          <strong>Tags</strong> let you categorize teams (e.g., &quot;strong auto&quot;, &quot;good
          defense&quot;). <strong>Notes</strong> are free-form observations. <strong>Exclude</strong> teams
          you don&apos;t want to consider. Changes are shared with your team when you save.
        </p>
        <p>
          Use <strong>Export CSV</strong> to download the picklist for sharing or printing. Search by team
          number or name, and filter by tag. The picklist auto-refreshes every 30 seconds to pick up
          changes from teammates.
        </p>
      </InfoBox>

      {!canEdit && teamNumber && activeTeam && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Viewing team {teamNumber} — read-only (you&apos;re not a member)
          </p>
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2">
          <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search team # or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[12rem] flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="min-w-[8rem] h-[38px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          <button
            onClick={() => downloadCSV(entries)}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm whitespace-nowrap"
          >
            Export CSV
          </button>
          <button
            onClick={handleSave}
            disabled={!canEdit || saving}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${canEdit
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              } disabled:opacity-60`}
          >
            {!canEdit ? (!activeTeam ? 'Join Team to Save' : 'Read Only') : saving ? 'Saving...' : 'Save Picklist'}
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
              <th className="py-2 px-2 w-12">#</th>
              <th className="py-2 px-2">Team</th>
              <th className="py-2 px-2">Score</th>
              <th className="py-2 px-2">Auto</th>
              <th className="py-2 px-2">Teleop</th>
              <th className="py-2 px-2">Endgame</th>
              <th className="py-2 px-2">Tags</th>
              <th className="py-2 px-2">Notes</th>
              <th className="py-2 px-2 w-16">Excl</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr
                key={entry.teamNumber}
                className={`border-b border-gray-100 dark:border-gray-800 ${entry.excluded ? 'opacity-40 line-through' : ''
                  }`}
              >
                <td className="py-2 px-2 font-mono text-gray-500">{entry.rank}</td>
                <td className="py-2 px-2">
                  <span className="font-bold">{entry.teamNumber}</span>
                  <span className="ml-2 text-gray-500 text-xs">{entry.nickname}</span>
                </td>
                <td className="py-2 px-2 font-mono">{entry.epaTotal.toFixed(1)}</td>
                <td className="py-2 px-2 font-mono text-green-600">{entry.epaAuto.toFixed(1)}</td>
                <td className="py-2 px-2 font-mono text-blue-600">{entry.epaTeleop.toFixed(1)}</td>
                <td className="py-2 px-2 font-mono text-purple-600">{entry.epaEndgame.toFixed(1)}</td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    placeholder="tag1;tag2"
                    value={entry.tags.join(';')}
                    onChange={(e) =>
                      updateEntries((prev) =>
                        prev.map((p) =>
                          p.teamNumber === entry.teamNumber
                            ? { ...p, tags: e.target.value.split(';').filter(Boolean) }
                            : p,
                        ),
                      )
                    }
                    disabled={!canEdit}
                    className="w-24 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    placeholder="Notes..."
                    value={entry.notes}
                    onChange={(e) =>
                      updateEntries((prev) =>
                        prev.map((p) =>
                          p.teamNumber === entry.teamNumber
                            ? { ...p, notes: e.target.value }
                            : p,
                        ),
                      )
                    }
                    disabled={!canEdit}
                    className="w-32 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={entry.excluded}
                    disabled={!canEdit}
                    onChange={() =>
                      updateEntries((prev) =>
                        prev.map((p) =>
                          p.teamNumber === entry.teamNumber
                            ? { ...p, excluded: !p.excluded }
                            : p,
                        ),
                      )
                    }
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
