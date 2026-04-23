/**
 * Utilities for the per-match scouting UI.
 *
 * Per-match numeric scouting fields store their values as a nested object
 * keyed by TBA match key (e.g. `{ "2026misjo_qm12": 5 }`). The aggregate
 * field that declares `derivedFromKey` against one of these per-match fields
 * displays the average of the numeric entries; blanks are excluded.
 */

/**
 * Compute the rounded-to-2-decimals average of the numeric values in a
 * per-match map. Non-numeric/non-finite values are ignored. Returns `null`
 * when there are no numeric values (callers should leave the aggregate
 * unchanged in that case — see ADR 034).
 */
export function computePerMatchAverage(map: Record<string, unknown>): number | null {
  const numericValues = Object.values(map).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  if (numericValues.length === 0) return null;
  const sum = numericValues.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / numericValues.length) * 100) / 100;
}

/**
 * Given a per-match field's current value (from `ScoutingNote.data[fieldKey]`),
 * return an updated map reflecting the supplied cell change. Passing `null`
 * or `NaN` removes the entry for that match.
 */
export function applyPerMatchCellChange(
  previous: unknown,
  matchKey: string,
  value: number | null,
): Record<string, unknown> {
  const base =
    previous && typeof previous === 'object' && !Array.isArray(previous)
      ? { ...(previous as Record<string, unknown>) }
      : {};
  if (value === null || Number.isNaN(value)) {
    delete base[matchKey];
  } else {
    base[matchKey] = value;
  }
  return base;
}
