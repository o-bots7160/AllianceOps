/**
 * Shared analysis utilities used across strategy engines.
 * Extracts common EPA aggregation patterns from briefing, path, and rank-analysis.
 */

/**
 * Compute the average total EPA for a set of team keys.
 * Teams missing from the map use the provided fallback value.
 * Returns `fallback` when `teamKeys` is empty.
 */
export function computeAllianceStrength(
  teamKeys: string[],
  epaMap: Record<string, { total: number }>,
  fallback = 0,
): number {
  if (teamKeys.length === 0) return fallback;
  const total = teamKeys.reduce((sum, t) => sum + (epaMap[t]?.total ?? fallback), 0);
  return total / teamKeys.length;
}

/**
 * Compute the field-wide average total EPA across all teams in the map.
 * Returns 1 when the map is empty (safe divisor for strength ratios).
 */
export function computeFieldAvgEpa(
  epaMap: Record<string, { total: number }>,
): number {
  const entries = Object.values(epaMap);
  if (entries.length === 0) return 1;
  return entries.reduce((sum, e) => sum + e.total, 0) / entries.length;
}
