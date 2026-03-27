import type { TeamRankAnalysis } from '@allianceops/shared';
import type {
  EnrichedTeam,
  PicklistEntry,
  SavedPicklistEntry,
  SortKey,
  SortDirection,
  SortState,
  RankByOption,
} from './types';

export function generatePicklist(teams: EnrichedTeam[]): PicklistEntry[] {
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

export function defaultDirectionForKey(key: SortKey): SortDirection {
  switch (key) {
    case 'manualRank':
    case 'team':
    case 'tbaRank':
    case 'epaRank':
    case 'analysis':
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

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: SortDirection,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

export function compareEntries(
  a: PicklistEntry,
  b: PicklistEntry,
  sortState: SortState,
  rankAnalysisMap?: Map<string, TeamRankAnalysis>,
): number {
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
    case 'analysis': {
      const aAnalysis = rankAnalysisMap?.get(`frc${a.teamNumber}`);
      const bAnalysis = rankAnalysisMap?.get(`frc${b.teamNumber}`);
      const aDelta = aAnalysis?.rankDelta ?? null;
      const bDelta = bAnalysis?.rankDelta ?? null;
      const cmp = compareNullableNumber(aDelta, bDelta, direction);
      if (cmp !== 0) return cmp;
      return a.teamNumber - b.teamNumber;
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
export function mergePicklist(
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

export function rankEntries(entries: PicklistEntry[], by: RankByOption): PicklistEntry[] {
  const getValue = (e: PicklistEntry): number | null => {
    switch (by) {
      case 'tbaRank':
        return e.tbaRank;
      case 'epaTotal':
        return e.epaTotal;
      case 'epaAuto':
        return e.epaAuto;
      case 'epaTeleop':
        return e.epaTeleop;
      case 'epaEndgame':
        return e.epaEndgame;
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
