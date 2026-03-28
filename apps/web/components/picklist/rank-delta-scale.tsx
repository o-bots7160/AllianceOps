'use client';

import type { TeamRankAnalysis } from '@allianceops/shared';
import { DETERMINATION_LABELS } from '@/components/team-card';

interface RankDeltaScaleProps {
  /** The team to highlight on the scale. */
  analysis: TeamRankAnalysis;
  /** All teams' analyses — used to plot dots on the scale. */
  allAnalyses: TeamRankAnalysis[];
  /** Whether to show legend labels beneath the scale. */
  showLabels?: boolean;
}

/** Map determination → dot color class. */
function dotColor(determination: string): string {
  if (determination === 'accurate') return 'bg-green-500';
  if (
    determination === 'carried' ||
    determination === 'easy_schedule' ||
    determination === 'favorable'
  )
    return 'bg-amber-500';
  return 'bg-blue-500';
}

/**
 * Horizontal linear scale showing where a team sits among all teams by rankDelta.
 *
 * rankDelta = tbaRank − epaRank
 *   negative → overperforming (TBA rank better than EPA predicts)
 *   positive → underperforming (TBA rank worse than EPA predicts)
 */
export function RankDeltaScale({ analysis, allAnalyses, showLabels = true }: RankDeltaScaleProps) {
  if (allAnalyses.length === 0) return null;

  const deltas = allAnalyses.map((a) => a.rankDelta);
  const minDelta = Math.min(...deltas);
  const maxDelta = Math.max(...deltas);

  // Ensure the range always covers at least ±3 (the accurate zone)
  const rangeMin = Math.min(minDelta, -4);
  const rangeMax = Math.max(maxDelta, 4);
  const range = rangeMax - rangeMin || 1;

  const toPercent = (delta: number) => ((delta - rangeMin) / range) * 100;

  const accurateLeftPct = toPercent(-3);
  const accurateRightPct = toPercent(3);
  const accurateWidthPct = accurateRightPct - accurateLeftPct;
  const zeroPct = toPercent(0);

  const detLabel = DETERMINATION_LABELS[analysis.determination];

  return (
    <div className="w-full space-y-1">
      {/* Determination badge + delta stat */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${detLabel?.color ?? ''}`}
        >
          {detLabel?.label ?? analysis.determination}
        </span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
          TBA #{analysis.tbaRank} · EPA #{analysis.epaRank} · Δ
          {analysis.rankDelta > 0 ? '+' : ''}
          {analysis.rankDelta}
        </span>
      </div>

      {/* Scale track */}
      <div className="relative h-6">
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full" />

        {/* Accurate zone (±3) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-green-200 dark:bg-green-900/50 rounded-full"
          style={{ left: `${accurateLeftPct}%`, width: `${accurateWidthPct}%` }}
        />

        {/* Center line (0) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-gray-400 dark:bg-gray-500"
          style={{ left: `${zeroPct}%` }}
        />

        {/* All team dots */}
        {allAnalyses.map((a) => {
          const isCurrentTeam = a.teamKey === analysis.teamKey;
          if (isCurrentTeam) return null;
          const pct = toPercent(a.rankDelta);
          return (
            <div
              key={a.teamKey}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 opacity-50"
              style={{ left: `${pct}%` }}
            />
          );
        })}

        {/* Highlighted team dot */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${dotColor(analysis.determination)} z-10`}
          style={{ left: `${toPercent(analysis.rankDelta)}%` }}
        />
      </div>

      {/* Legend labels */}
      {showLabels && (
        <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-500">
          <span>← Overperforming</span>
          <span>Underperforming →</span>
        </div>
      )}
    </div>
  );
}
