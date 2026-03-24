'use client';

import { useState, useMemo, useEffect, useCallback, useRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useEventSetup } from '../../components/use-event-setup';
import { useAuth } from '../../components/use-auth';
import { useApi } from '../../components/use-api';
import { InfoBox } from '../../components/info-box';
import { LoadingSpinner } from '../../components/loading-spinner';
import { TeamCard } from '../../components/team-card';
import { DETERMINATION_LABELS } from '../../components/team-card';
import { getApiBase } from '../../lib/api-base';
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard';
import { getAdapter, analyzeAllRankDiscrepancies } from '@allianceops/shared';
import type { TeamRankAnalysis, GameMetricDefinition } from '@allianceops/shared';
import type { EnrichedTeam as BaseEnrichedTeam } from '../../lib/types';

interface EnrichedTeam extends BaseEnrichedTeam {
  qualAverage: number | null;
}

interface PicklistEntry {
  teamNumber: number;
  nickname: string;
  score: number;
  epaTotal: number;
  epaAuto: number;
  epaTeleop: number;
  epaEndgame: number;
  epaRank: number;
  tbaRank: number | null;
  qualAverage: number | null;
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

const POLL_INTERVAL_MS = 30_000;

type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'manualRank'
  | 'team'
  | 'tbaRank'
  | 'epaRank'
  | 'epaTotal'
  | 'epaAuto'
  | 'epaTeleop'
  | 'epaEndgame'
  | 'tags'
  | 'notes'
  | 'excluded';

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

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
      epaRank: 0,
      tbaRank: t.tbaRank,
      qualAverage: t.qualAverage,
      rank: 0,
      excluded: false,
      tags: [] as string[],
      notes: '',
    }))
    .sort((a, b) => b.score - a.score || a.teamNumber - b.teamNumber)
    .map((t, i) => ({ ...t, rank: i + 1, epaRank: i + 1 }));
}

function defaultDirectionForKey(key: SortKey): SortDirection {
  switch (key) {
    case 'manualRank':
    case 'team':
    case 'tbaRank':
    case 'epaRank':
      return 'asc';
    case 'epaTotal':
    case 'epaAuto':
    case 'epaTeleop':
    case 'epaEndgame':
      return 'desc';
    case 'tags':
    case 'notes':
    case 'excluded':
      return 'asc';
    default:
      return 'asc';
  }
}

function compareNullableNumber(a: number | null, b: number | null, direction: SortDirection): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function compareEntries(a: PicklistEntry, b: PicklistEntry, sortState: SortState): number {
  const direction = sortState.direction;
  const textFactor = direction === 'asc' ? 1 : -1;

  switch (sortState.key) {
    case 'manualRank': {
      const cmp = direction === 'asc' ? a.rank - b.rank : b.rank - a.rank;
      if (cmp !== 0) return cmp;
      return a.teamNumber - b.teamNumber;
    }
    case 'team':
      return direction === 'asc' ? a.teamNumber - b.teamNumber : b.teamNumber - a.teamNumber;
    case 'tbaRank': {
      const cmp = compareNullableNumber(a.tbaRank, b.tbaRank, direction);
      if (cmp !== 0) return cmp;
      return a.epaRank - b.epaRank;
    }
    case 'epaRank': {
      const cmp = direction === 'asc' ? a.epaRank - b.epaRank : b.epaRank - a.epaRank;
      if (cmp !== 0) return cmp;
      return a.teamNumber - b.teamNumber;
    }
    case 'epaTotal':
      return direction === 'asc' ? a.epaTotal - b.epaTotal : b.epaTotal - a.epaTotal;
    case 'epaAuto':
      return direction === 'asc' ? a.epaAuto - b.epaAuto : b.epaAuto - a.epaAuto;
    case 'epaTeleop':
      return direction === 'asc' ? a.epaTeleop - b.epaTeleop : b.epaTeleop - a.epaTeleop;
    case 'epaEndgame':
      return direction === 'asc' ? a.epaEndgame - b.epaEndgame : b.epaEndgame - a.epaEndgame;
    case 'tags': {
      const cmp = a.tags.join(';').localeCompare(b.tags.join(';'));
      if (cmp !== 0) return cmp * textFactor;
      return a.teamNumber - b.teamNumber;
    }
    case 'notes': {
      const cmp = a.notes.localeCompare(b.notes);
      if (cmp !== 0) return cmp * textFactor;
      return a.teamNumber - b.teamNumber;
    }
    case 'excluded': {
      const aValue = a.excluded ? 1 : 0;
      const bValue = b.excluded ? 1 : 0;
      const cmp = direction === 'asc' ? aValue - bValue : bValue - aValue;
      if (cmp !== 0) return cmp;
      return a.teamNumber - b.teamNumber;
    }
    default:
      return a.teamNumber - b.teamNumber;
  }
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

type RankByOption = 'tbaRank' | 'epaTotal' | 'epaAuto' | 'epaTeleop' | 'epaEndgame';

const RANK_BY_OPTIONS: { value: RankByOption; label: string }[] = [
  { value: 'tbaRank', label: 'TBA Rank' },
  { value: 'epaTotal', label: 'EPA Total' },
  { value: 'epaAuto', label: 'EPA Auto' },
  { value: 'epaTeleop', label: 'EPA Teleop' },
  { value: 'epaEndgame', label: 'EPA Endgame' },
];

function rankEntries(entries: PicklistEntry[], by: RankByOption): PicklistEntry[] {
  const getValue = (e: PicklistEntry): number | null => {
    switch (by) {
      case 'tbaRank': return e.tbaRank;
      case 'epaTotal': return e.epaTotal;
      case 'epaAuto': return e.epaAuto;
      case 'epaTeleop': return e.epaTeleop;
      case 'epaEndgame': return e.epaEndgame;
    }
  };

  // For TBA rank lower is better (asc); for EPA metrics higher is better (desc)
  const ascending = by === 'tbaRank';

  const sorted = [...entries].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    if (va === null && vb === null) return a.teamNumber - b.teamNumber;
    if (va === null) return 1;
    if (vb === null) return -1;
    const cmp = ascending ? va - vb : vb - va;
    return cmp !== 0 ? cmp : a.teamNumber - b.teamNumber;
  });

  return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
}

const SUGGESTED_TAGS = [
  'Fast Cycle',
  'Fragile Bot',
  'Good Defense',
  'High Scorer',
  'Penalty Risk',
  'Reliable Auton',
  'Reliable Bot',
  'Strong Endgame',
];

/** Inline multi-select tag dropdown for a single picklist row. */
function TagDropdown({
  tags,
  allTags,
  disabled,
  onChange,
}: {
  tags: string[];
  allTags: string[];
  disabled: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (tag: string) => {
    if (tags.includes(tag)) {
      onChange(tags.filter((t) => t !== tag));
    } else {
      onChange([...tags, tag]);
    }
  };

  const addNew = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setNewTag('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNew();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex flex-wrap items-center gap-1 min-w-[6rem] min-h-[1.75rem] rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        {tags.length === 0 && <span className="text-gray-400">+ tags</span>}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 text-[10px] leading-tight"
          >
            {tag}
          </span>
        ))}
      </button>
      {open && !disabled && (
        <div className="absolute right-0 lg:right-auto lg:left-0 z-50 mt-1 w-44 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 text-xs max-h-48 overflow-y-auto">
          {allTags.map((tag) => (
            <label
              key={tag}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 select-none"
            >
              <input
                type="checkbox"
                checked={tags.includes(tag)}
                onChange={() => toggle(tag)}
                className="h-4 w-4 accent-primary-600"
              />
              {tag}
            </label>
          ))}
          {(() => {
            const suggestions = SUGGESTED_TAGS.filter((s) => !allTags.includes(s) && !tags.includes(s));
            if (suggestions.length === 0) return null;
            return (
              <>
                {allTags.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 mt-1" />
                )}
                <div className="px-2 pt-1.5 pb-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">Suggestions</span>
                </div>
                <div className="flex flex-wrap gap-1 px-2 pb-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChange([...tags, s])}
                      className="rounded-full border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-[10px] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
          <div className="border-t border-gray-200 dark:border-gray-700 px-2 pt-1.5 pb-1 mt-1">
            <div className="flex gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="New tag…"
                className="flex-1 min-w-0 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1.5 py-1 text-xs"
              />
              <button
                type="button"
                onClick={addNew}
                disabled={!newTag.trim()}
                className="px-1.5 py-1 rounded bg-primary-600 text-white text-xs disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Multi-select tag filter for the toolbar. */
function TagFilterControl({
  allTags,
  selected,
  onChange,
}: {
  allTags: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  if (allTags.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        className="flex flex-wrap items-center gap-1 min-w-[8rem] h-[38px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-left cursor-pointer"
      >
        {selected.length === 0 && <span className="text-gray-400">Filter by tags</span>}
        {selected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 text-xs leading-tight"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(tag);
              }}
              className="cursor-pointer hover:text-primary-900 dark:hover:text-primary-100"
              aria-label={`Remove ${tag} filter`}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-48 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 text-sm max-h-48 overflow-y-auto">
          {allTags.map((tag) => (
            <label
              key={tag}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 select-none"
            >
              <input
                type="checkbox"
                checked={selected.includes(tag)}
                onChange={() => toggle(tag)}
                className="h-4 w-4 accent-primary-600"
              />
              {tag}
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TeamDetailModal({
  teamNumber,
  epaMap,
  epaRankMap,
  rankAnalysisMap,
  teamRecords,
  cardMetrics,
  onClose,
}: {
  teamNumber: number;
  epaMap: Map<number, EnrichedTeam>;
  epaRankMap: Map<number, number>;
  rankAnalysisMap: Map<string, TeamRankAnalysis>;
  teamRecords: Map<number, { wins: number; losses: number; ties: number }>;
  cardMetrics: GameMetricDefinition[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const teamKey = `frc${teamNumber}`;
  const team = epaMap.get(teamNumber);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {team ? (
          <TeamCard
            teamKey={teamKey}
            epaMap={epaMap}
            epaRank={epaRankMap.get(teamNumber)}
            metrics={cardMetrics}
            record={teamRecords.get(teamNumber)}
            rankAnalysis={rankAnalysisMap.get(teamKey)}
            defaultExpanded
          />
        ) : (
          <p className="text-sm text-gray-500">No data available for team {teamNumber}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default function PicklistPage() {
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
    if (!teams || !matches)
      return new Map<string, TeamRankAnalysis>();
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
  let adapter: ReturnType<typeof getAdapter> | null = null;
  try {
    adapter = getAdapter(year);
  } catch {
    // No adapter registered for this year
  }
  const cardMetrics = (adapter?.gameSpecificMetrics ?? []).filter(
    (m) => m.renderLocation === 'team_card' || m.renderLocation === 'all',
  );

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
  const [modalTeam, setModalTeam] = useState<number | null>(null);
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
    setSortState({ key: 'tbaRank', direction: 'asc' });
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

  const ariaSortFor = useCallback(
    (key: SortKey): 'none' | 'ascending' | 'descending' => {
      if (sortState.key !== key) return 'none';
      return sortState.direction === 'asc' ? 'ascending' : 'descending';
    },
    [sortState],
  );

  const sortLabelFor = useCallback(
    (key: SortKey): string => {
      if (sortState.key !== key) return '';
      return sortState.direction === 'asc' ? ' (asc)' : ' (desc)';
    },
    [sortState],
  );

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
          EPA ratings — auto, teleop, and endgame — with Blue Alliance event ranking included for
          side-by-side comparison. Use this during alliance selection to identify the strongest
          available partners.
        </p>
        <p>
          <strong>Tags</strong> let you categorize teams (e.g., &quot;strong auto&quot;, &quot;good
          defense&quot;). <strong>Notes</strong> are free-form observations. <strong>Exclude</strong> teams
          you don&apos;t want to consider. Changes are shared with your team when you save.
        </p>
        <p>
          Search by team number or name, and filter by tag. Click any table header to sort by that
          column. The picklist auto-refreshes every 30 seconds to pick up changes from teammates.
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
        <TagFilterControl allTags={allTags} selected={tagFilters} onChange={setTagFilters} />
        <div className="flex items-center gap-3 lg:ml-auto shrink-0">
          {canEdit && (
            <select
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value as RankByOption;
                if (!value) return;
                if (!window.confirm(`Overwrite manual ranks with ${RANK_BY_OPTIONS.find((o) => o.value === value)?.label}?`)) {
                  e.target.value = '';
                  return;
                }
                updateEntries((prev) => rankEntries(prev, value));
                setSortState({ key: 'manualRank', direction: 'asc' });
                e.target.value = '';
              }}
              className="h-[38px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">Rank by…</option>
              {RANK_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleSave}
            disabled={!canEdit || saving}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${canEdit
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              } disabled:opacity-60`}
          >
            {!canEdit ? (!user ? 'Log In to Save' : !activeTeam ? 'Join Team to Save' : 'Read Only') : saving ? 'Saving...' : 'Save Picklist'}
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
        <label className="flex items-center gap-2 ml-auto px-2 py-1 rounded-md text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800">
          <input
            type="checkbox"
            checked={hideExcluded}
            onChange={(e) => setHideExcluded(e.target.checked)}
            className="h-5 w-5 cursor-pointer accent-primary-600"
          />
          Hide excluded
        </label>
      </div>

      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-center">
              <th className="py-2 px-2 w-16" aria-sort={ariaSortFor('excluded')}>
                <button type="button" onClick={() => onSort('excluded')} className="font-semibold">
                  Excl{sortLabelFor('excluded')}
                </button>
              </th>
              <th className="hidden lg:table-cell py-2 px-2 w-20 text-center" aria-sort={ariaSortFor('manualRank')}>
                <button type="button" onClick={() => onSort('manualRank')} className="font-semibold">
                  Manual#{sortLabelFor('manualRank')}
                </button>
              </th>
              <th className="py-2 px-2" aria-sort={ariaSortFor('team')}>
                <button type="button" onClick={() => onSort('team')} className="font-semibold">
                  Team{sortLabelFor('team')}
                </button>
              </th>
              <th className="py-2 px-2 text-center" aria-sort={ariaSortFor('tbaRank')}>
                <button type="button" onClick={() => onSort('tbaRank')} className="font-semibold">
                  TBA Rank{sortLabelFor('tbaRank')}
                </button>
              </th>
              <th className="hidden lg:table-cell py-2 px-2">
                <span className="font-semibold">Analysis</span>
              </th>
              <th className="py-2 px-2 text-center" aria-sort={ariaSortFor('epaRank')}>
                <button type="button" onClick={() => onSort('epaRank')} className="font-semibold">
                  EPA Rank{sortLabelFor('epaRank')}
                </button>
              </th>
              <th className="hidden lg:table-cell py-2 px-2 text-center" aria-sort={ariaSortFor('epaTotal')}>
                <button type="button" onClick={() => onSort('epaTotal')} className="font-semibold">
                  EPA Total{sortLabelFor('epaTotal')}
                </button>
              </th>
              <th className="hidden lg:table-cell py-2 px-2 text-center" aria-sort={ariaSortFor('epaAuto')}>
                <button type="button" onClick={() => onSort('epaAuto')} className="font-semibold">
                  Auto{sortLabelFor('epaAuto')}
                </button>
              </th>
              <th className="hidden lg:table-cell py-2 px-2 text-center" aria-sort={ariaSortFor('epaTeleop')}>
                <button type="button" onClick={() => onSort('epaTeleop')} className="font-semibold">
                  Teleop{sortLabelFor('epaTeleop')}
                </button>
              </th>
              <th className="hidden lg:table-cell py-2 px-2 text-center" aria-sort={ariaSortFor('epaEndgame')}>
                <button type="button" onClick={() => onSort('epaEndgame')} className="font-semibold">
                  Endgame{sortLabelFor('epaEndgame')}
                </button>
              </th>
              <th className="py-2 px-2" aria-sort={ariaSortFor('tags')}>
                <button type="button" onClick={() => onSort('tags')} className="font-semibold">
                  Tags{sortLabelFor('tags')}
                </button>
              </th>
              <th className="hidden lg:table-cell py-2 px-2" aria-sort={ariaSortFor('notes')}>
                <button type="button" onClick={() => onSort('notes')} className="font-semibold">
                  Notes{sortLabelFor('notes')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const isMyTeam = entry.teamNumber === teamNumber;
              const analysis = rankAnalysisMap.get(`frc${entry.teamNumber}`);
              return (
                <tr
                  key={entry.teamNumber}
                  className={`border-b border-gray-100 dark:border-gray-800 ${entry.excluded ? 'opacity-40 line-through' : ''} ${isMyTeam ? 'bg-primary-50 dark:bg-primary-900/30 ring-1 ring-inset ring-primary-300 dark:ring-primary-700' : ''}`}
                >
                  <td className="py-2 px-2 text-center">
                    <label className="inline-flex items-center justify-center w-8 h-8 cursor-pointer">
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
                        className="h-5 w-5 cursor-pointer accent-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </label>
                  </td>
                  <td className="hidden lg:table-cell py-2 px-2 font-mono text-gray-500 text-center">
                    {canEdit ? (
                      <input
                        type="number"
                        min={1}
                        value={entry.rank}
                        onChange={(e) => {
                          const parsed = Number.parseInt(e.target.value, 10);
                          if (Number.isNaN(parsed) || parsed < 1) return;
                          setSortState({ key: 'manualRank', direction: 'asc' });
                          updateEntries((prev) =>
                            prev.map((p) =>
                              p.teamNumber === entry.teamNumber
                                ? { ...p, rank: parsed }
                                : p,
                            ),
                          );
                        }}
                        className="w-14 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs"
                      />
                    ) : (
                      entry.rank
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => setModalTeam(entry.teamNumber)}
                      className="font-bold hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                    >
                      {entry.teamNumber}
                    </button>
                    <span className="hidden lg:inline ml-2 text-gray-500 text-xs">{entry.nickname}</span>
                  </td>
                  <td className="py-2 px-2 font-mono text-center">{entry.tbaRank ?? '-'}</td>
                  <td className="hidden lg:table-cell py-2 px-2 text-center">
                    {analysis && (
                      <button
                        type="button"
                        onClick={() => setModalTeam(entry.teamNumber)}
                        className={`text-[10px] font-semibold leading-tight cursor-pointer hover:underline ${analysis.determination === 'accurate'
                          ? 'text-green-600 dark:text-green-400'
                          : analysis.determination === 'carried' || analysis.determination === 'easy_schedule' || analysis.determination === 'favorable'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-blue-600 dark:text-blue-400'
                          }`}
                        title={analysis.explanation}
                      >
                        {DETERMINATION_LABELS[analysis.determination]?.label ?? analysis.determination}
                      </button>
                    )}
                  </td>
                  <td className="py-2 px-2 font-mono text-center">{entry.epaRank}</td>
                  <td className="hidden lg:table-cell py-2 px-2 font-mono text-center">{entry.epaTotal.toFixed(1)}</td>
                  <td className="hidden lg:table-cell py-2 px-2 font-mono text-center text-green-600">{entry.epaAuto.toFixed(1)}</td>
                  <td className="hidden lg:table-cell py-2 px-2 font-mono text-center text-blue-600">{entry.epaTeleop.toFixed(1)}</td>
                  <td className="hidden lg:table-cell py-2 px-2 font-mono text-center text-purple-600">{entry.epaEndgame.toFixed(1)}</td>
                  <td className="py-2 px-2">
                    <TagDropdown
                      tags={entry.tags}
                      allTags={allTags}
                      disabled={!canEdit}
                      onChange={(newTags) =>
                        updateEntries((prev) =>
                          prev.map((p) =>
                            p.teamNumber === entry.teamNumber
                              ? { ...p, tags: newTags }
                              : p,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="hidden lg:table-cell py-2 px-2">
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Team Detail Modal */}
      {modalTeam !== null && (
        <TeamDetailModal
          teamNumber={modalTeam}
          epaMap={epaMap}
          epaRankMap={epaRankMap}
          rankAnalysisMap={rankAnalysisMap}
          teamRecords={teamRecords}
          cardMetrics={cardMetrics}
          onClose={() => setModalTeam(null)}
        />
      )}
    </div>
  );
}
