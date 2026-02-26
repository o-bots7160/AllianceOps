/**
 * Utilities for match labeling and sorting across all comp levels
 * (qualifications, quarterfinals, semifinals, and finals).
 */

type CompLevel = 'qm' | 'ef' | 'qf' | 'sf' | 'f';

interface MatchLike {
  comp_level: string;
  set_number?: number;
  match_number: number;
}

const COMP_LEVEL_ORDER: Record<string, number> = {
  qm: 0,
  ef: 1,
  qf: 2,
  sf: 3,
  f: 4,
};

const COMP_LEVEL_PREFIX: Record<string, string> = {
  qm: 'Q',
  ef: 'EF',
  qf: 'QF',
  sf: 'SF',
  f: 'F',
};

const COMP_LEVEL_NAME: Record<string, string> = {
  qm: 'Qualifications',
  ef: 'Eighth-Finals',
  qf: 'Quarterfinals',
  sf: 'Semifinals',
  f: 'Finals',
};

/**
 * Generate a human-readable label for a match.
 * - Quals: "Q1", "Q2", etc.
 * - Playoffs: "SF1-1" (set 1, match 1), "F1-1", etc.
 */
export function matchLabel(match: MatchLike): string {
  const prefix = COMP_LEVEL_PREFIX[match.comp_level] ?? match.comp_level.toUpperCase();
  if (match.comp_level === 'qm') {
    return `${prefix}${match.match_number}`;
  }
  const set = match.set_number ?? 1;
  return `${prefix}${set}-${match.match_number}`;
}

/**
 * Get the display name for a comp level phase.
 */
export function compLevelName(compLevel: string): string {
  return COMP_LEVEL_NAME[compLevel] ?? compLevel;
}

/**
 * Sort matches in competition order: quals by match_number,
 * then playoffs by comp_level → set_number → match_number.
 */
export function sortMatches<T extends MatchLike>(matches: T[]): T[] {
  return [...matches].sort((a, b) => {
    const levelDiff =
      (COMP_LEVEL_ORDER[a.comp_level] ?? 99) - (COMP_LEVEL_ORDER[b.comp_level] ?? 99);
    if (levelDiff !== 0) return levelDiff;
    const setDiff = (a.set_number ?? 0) - (b.set_number ?? 0);
    if (setDiff !== 0) return setDiff;
    return a.match_number - b.match_number;
  });
}

/**
 * Group matches by comp_level in competition order.
 * Returns an array of [compLevel, matches[]] tuples.
 */
export function groupMatchesByPhase<T extends MatchLike>(matches: T[]): [string, T[]][] {
  const sorted = sortMatches(matches);
  const groups = new Map<string, T[]>();
  for (const m of sorted) {
    const existing = groups.get(m.comp_level);
    if (existing) {
      existing.push(m);
    } else {
      groups.set(m.comp_level, [m]);
    }
  }
  return Array.from(groups.entries());
}

/**
 * Check if a comp level is a playoff match (not qualification).
 */
export function isPlayoff(compLevel: string): boolean {
  return compLevel !== 'qm';
}
