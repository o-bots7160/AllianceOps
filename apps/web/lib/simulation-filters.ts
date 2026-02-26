import { sortMatches } from './match-utils';

interface SimMatch {
  comp_level: string;
  set_number?: number;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  winning_alliance: string;
}

/**
 * Filter matches to only those up to the cursor position.
 * Cursor is a 1-based index into the competition-order sorted match list.
 * Matches beyond the cursor appear as unplayed (score = -1).
 * Returns all matches unmodified if cursor is null.
 */
export function filterMatchesByCursor<T extends SimMatch>(
  matches: T[],
  cursor: number | null,
): T[] {
  if (cursor === null) return matches;

  const sorted = sortMatches(matches);
  const playedKeys = new Set(
    sorted.slice(0, cursor).map((m) => `${m.comp_level}-${m.set_number ?? 0}-${m.match_number}`),
  );

  return matches.map((m) => {
    const key = `${m.comp_level}-${m.set_number ?? 0}-${m.match_number}`;
    if (playedKeys.has(key)) return m;
    // Matches beyond cursor appear as unplayed
    return {
      ...m,
      alliances: {
        red: { ...m.alliances.red, score: -1 },
        blue: { ...m.alliances.blue, score: -1 },
      },
      winning_alliance: '',
    };
  });
}

/**
 * Find the next unplayed match for a team, respecting cursor.
 * Searches across all match types in competition order.
 */
export function getNextMatch<T extends SimMatch>(
  matches: T[],
  teamKey: string,
  cursor: number | null,
): T | undefined {
  const filtered = filterMatchesByCursor(matches, cursor);
  const sorted = sortMatches(filtered);

  return sorted.find(
    (m) =>
      (m.alliances.red.team_keys.includes(teamKey) ||
        m.alliances.blue.team_keys.includes(teamKey)) &&
      m.alliances.red.score < 0,
  );
}

/**
 * Calculate a team's W-L record up to the cursor position.
 * Includes all match types (quals + playoffs).
 */
export function getTeamRecord<T extends SimMatch>(
  matches: T[],
  teamKey: string,
  cursor: number | null,
): { wins: number; losses: number; ties: number } {
  const filtered = filterMatchesByCursor(matches, cursor);
  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const m of filtered) {
    if (m.alliances.red.score < 0) continue;

    const isRed = m.alliances.red.team_keys.includes(teamKey);
    const isBlue = m.alliances.blue.team_keys.includes(teamKey);
    if (!isRed && !isBlue) continue;

    const myAlliance = isRed ? 'red' : 'blue';
    if (m.winning_alliance === myAlliance) wins++;
    else if (m.winning_alliance === '') ties++;
    else losses++;
  }

  return { wins, losses, ties };
}

interface SimEpa {
  total: number;
  auto: number;
  teleop: number;
  endgame: number;
  breakdown?: Record<string, number>;
}

/**
 * Scale an EPA breakdown proportionally using a start-of-event total.
 * Returns an adjusted EPA where each component is scaled by (startTotal / finalTotal).
 */
export function scaleEpaToStart(epa: SimEpa, startTotal: number): SimEpa {
  if (!epa.total || epa.total === 0) return { ...epa, total: startTotal };
  const scale = startTotal / epa.total;
  const scaled: SimEpa = {
    total: startTotal,
    auto: epa.auto * scale,
    teleop: epa.teleop * scale,
    endgame: epa.endgame * scale,
  };
  if (epa.breakdown) {
    scaled.breakdown = {};
    for (const [k, v] of Object.entries(epa.breakdown)) {
      scaled.breakdown[k] = v * scale;
    }
  }
  return scaled;
}
