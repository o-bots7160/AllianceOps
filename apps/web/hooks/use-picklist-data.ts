import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useEventSetup } from '@/components/use-event-setup';
import { useAuth } from '@/components/use-auth';
import { useApi } from '@/components/use-api';
import { getApiBase } from '@/lib/api-base';
import { getAdapter, analyzeAllRankDiscrepancies } from '@allianceops/shared';
import type { TeamRankAnalysis, GameMetricDefinition } from '@allianceops/shared';
import {
  generatePicklist,
  defaultDirectionForKey,
  compareEntries,
  mergePicklist,
  rankEntries,
} from '@/components/picklist/picklist-utils';
import {
  POLL_INTERVAL_MS,
  type EnrichedTeam,
  type TBAMatch,
  type PicklistEntry,
  type SortState,
  type SortKey,
  type RankByOption,
} from '@/components/picklist/types';

export function usePicklistData() {
  const { eventKey, teamNumber, year, setEventKey } = useEventSetup();
  const { user, activeTeam } = useAuth();
  const isOwnTeam = activeTeam !== null && activeTeam.teamNumber === teamNumber;
  const canEdit = isOwnTeam;
  const teamId = isOwnTeam ? activeTeam?.teamId ?? null : null;

  const { data: teams, loading: teamsLoading } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );
  const { data: matches } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );

  // Build epaMap (teamNumber → EnrichedTeam) for TeamCard
  const epaMap = useMemo(() => {
    const map = new Map<number, EnrichedTeam>();
    if (!teams) return map;
    for (const t of teams) map.set(t.team_number, t);
    return map;
  }, [teams]);

  // EPA rank for all event teams (1-based, sorted by epa.total descending)
  const epaRankMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!teams) return map;
    const sorted = [...teams]
      .filter((t) => t.epa?.total != null)
      .sort((a, b) => (b.epa?.total ?? 0) - (a.epa?.total ?? 0));
    sorted.forEach((t, i) => map.set(t.team_number, i + 1));
    return map;
  }, [teams]);

  // Rank analysis for all teams
  const rankAnalysisMap = useMemo(() => {
    if (!teams || !matches) return new Map<string, TeamRankAnalysis>();
    const teamInputs = teams
      .filter((t) => t.tbaRank != null && epaRankMap.has(t.team_number))
      .map((t) => ({
        teamKey: `frc${t.team_number}`,
        tbaRank: t.tbaRank!,
        epaRank: epaRankMap.get(t.team_number)!,
      }));
    const qualMatches = matches.filter((m) => m.comp_level === 'qm');
    const matchInputs = qualMatches.map((m) => ({
      key: m.key,
      matchNumber: m.match_number,
      redTeams: m.alliances.red.team_keys,
      blueTeams: m.alliances.blue.team_keys,
      redScore: m.alliances.red.score,
      blueScore: m.alliances.blue.score,
      winningAlliance: m.winning_alliance,
    }));
    const epaInputMap: Record<string, { total: number }> = {};
    for (const t of teams) {
      if (t.epa) epaInputMap[`frc${t.team_number}`] = t.epa;
    }
    return analyzeAllRankDiscrepancies(teamInputs, matchInputs, epaInputMap);
  }, [teams, matches, epaRankMap]);

  // Game adapter metrics for TeamCard
  const cardMetrics = useMemo(() => {
    let adapter: ReturnType<typeof getAdapter> | null = null;
    try {
      adapter = getAdapter(year);
    } catch {
      // No adapter registered for this year
    }
    return (adapter?.gameSpecificMetrics ?? []).filter(
      (m: GameMetricDefinition) =>
        m.renderLocation === 'team_card' || m.renderLocation === 'all',
    );
  }, [year]);

  // Compute team records from matches
  const teamRecords = useMemo(() => {
    const records = new Map<number, { wins: number; losses: number; ties: number }>();
    if (!matches) return records;
    const qualMatches = matches.filter((m) => m.comp_level === 'qm');
    for (const m of qualMatches) {
      for (const teamKey of [...m.alliances.red.team_keys, ...m.alliances.blue.team_keys]) {
        const num = parseInt(teamKey.replace('frc', ''), 10);
        if (!records.has(num)) records.set(num, { wins: 0, losses: 0, ties: 0 });
        const rec = records.get(num)!;
        const isRed = m.alliances.red.team_keys.includes(teamKey);
        if (m.winning_alliance === 'red' && isRed) rec.wins++;
        else if (m.winning_alliance === 'blue' && !isRed) rec.wins++;
        else if (m.winning_alliance === '') rec.ties++;
        else if (m.alliances.red.score >= 0) rec.losses++;
      }
    }
    return records;
  }, [matches]);

  // --- Picklist State ---
  const [search, setSearch] = useState('');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [hideExcluded, setHideExcluded] = useState(false);
  const [entries, setEntries] = useState<PicklistEntry[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sortState, setSortState] = useState<SortState>({ key: 'tbaRank', direction: 'asc' });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Track base entries (from EPA data) for merging
  const baseEntriesRef = useRef<PicklistEntry[]>([]);
  const loadAbortRef = useRef<AbortController | null>(null);

  // Async confirm dialog state for discarding unsaved changes on event switch
  const [discardConfirm, setDiscardConfirm] = useState<{ newKey: string } | null>(
    null,
  );

  const resetPicklistState = useCallback(() => {
    loadAbortRef.current?.abort();
    setEntries([]);
    baseEntriesRef.current = [];
    setInitialized(false);
    setDirty(false);
    setSaved(false);
    setSortState({ key: 'tbaRank', direction: 'asc' });
    setLastUpdated(null);
    setLoadError(null);
  }, []);

  // Track previous eventKey to detect changes and reset state
  const prevEventKeyRef = useRef(eventKey);
  useEffect(() => {
    if (prevEventKeyRef.current === eventKey) return;
    const oldKey = prevEventKeyRef.current;

    if (dirty) {
      // Revert to old event and show async confirm dialog
      setEventKey(oldKey);
      setDiscardConfirm({ newKey: eventKey });
      return;
    }

    prevEventKeyRef.current = eventKey;
    resetPicklistState();
  }, [eventKey, dirty, setEventKey, resetPicklistState]);

  const onDiscardConfirm = useCallback(() => {
    if (!discardConfirm) return;
    const newKey = discardConfirm.newKey;
    setDiscardConfirm(null);
    // Clear dirty first so the effect won't re-trigger the dialog
    setDirty(false);
    setEventKey(newKey);
  }, [discardConfirm, setEventKey]);

  const onDiscardCancel = useCallback(() => {
    setDiscardConfirm(null);
  }, []);

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

  // Re-rank entries by a given metric
  const rerank = useCallback(
    (by: RankByOption) => {
      updateEntries((prev) => rankEntries(prev, by));
      setSortState({ key: 'manualRank', direction: 'asc' });
    },
    [updateEntries],
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filtered = useMemo(() => {
    const filteredEntries = entries.filter((e) => {
      if (hideExcluded && e.excluded) return false;
      if (
        search &&
        !String(e.teamNumber).includes(search) &&
        !e.nickname.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (tagFilters.length > 0 && !tagFilters.some((t) => e.tags.includes(t))) return false;
      return true;
    });

    return [...filteredEntries].sort((a, b) => compareEntries(a, b, sortState));
  }, [entries, search, tagFilters, sortState, hideExcluded]);

  const onSort = useCallback((key: SortKey) => {
    setSortState((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: defaultDirectionForKey(key) };
    });
  }, []);

  return {
    // Context values
    eventKey,
    teamNumber,
    canEdit,
    user,
    activeTeam,

    // Loading
    teamsLoading,

    // Entries
    filtered,
    updateEntries,

    // Save state
    saving,
    saved,
    dirty,
    lastUpdated,
    loadError,
    handleSave,

    // Sort
    sortState,
    setSortState,
    onSort,

    // Filter
    search,
    setSearch,
    tagFilters,
    setTagFilters,
    hideExcluded,
    setHideExcluded,
    allTags,

    // Re-rank
    rerank,

    // Discard unsaved changes dialog
    discardConfirm,
    onDiscardConfirm,
    onDiscardCancel,

    // Modal data
    epaMap,
    epaRankMap,
    rankAnalysisMap,
    teamRecords,
    cardMetrics,
  };
}
