'use client';

import type { TeamRankAnalysis } from '@allianceops/shared';
import { DeterminationBadge } from '@/components/rank-analysis';
import { RankStats } from '@/components/rank-analysis';

interface RankDeltaScaleProps {
  /** The team to highlight on the scale. */
  analysis: TeamRankAnalysis;
  /** All teams' analyses — used to plot dots on the scale. */
  allAnalyses: TeamRankAnalysis[];
  /** Whether to show legend labels beneath the scale. */
  showLabels?: boolean;
  /** Whether to show the rank stats line (TBA/EPA/Δ). Defaults to true. */
  showRankStats?: boolean;
  /** Position the badge horizontally to align with the team dot on the scale. */
  alignBadgeToScale?: boolean;
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

/** Map determination → CSS color for the tail arrow. */
function arrowColor(determination: string): string {
  if (determination === 'accurate') return 'rgb(34 197 94)';
  if (
    determination === 'carried' ||
    determination === 'easy_schedule' ||
    determination === 'favorable'
  )
    return 'rgb(245 158 11)';
  return 'rgb(59 130 246)';
}

/**
 * Horizontal linear scale showing where a team sits among all teams by rankDelta.
 *
 * rankDelta = tbaRank − epaRank
 *   negative → overperforming (TBA rank better than EPA predicts)
 *   positive → underperforming (TBA rank worse than EPA predicts)
 */
export function RankDeltaScale({ analysis, allAnalyses, showLabels = true, showRankStats = true, alignBadgeToScale = false }: RankDeltaScaleProps) {
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

  // For alignBadgeToScale: shift translateX from 0% (left edge) to -100% (right edge)
  const badgePct = toPercent(analysis.rankDelta);
  const badgeTx = -(badgePct / 100) * 100;

  return (
    <div className="w-full space-y-1">
      {/* Determination badge + optional rank stats */}
      {alignBadgeToScale ? (
        <div className="relative" style={{ height: '1.875rem' }}>
          <div
            className="absolute whitespace-nowrap"
            style={{
              left: `${badgePct}%`,
              transform: `translateX(${badgeTx}%)`,
            }}
          >
            <DeterminationBadge determination={analysis.determination} />
          </div>
          {/* Tail arrow pointing down to the dot */}
          <div
            className="absolute -translate-x-1/2"
            style={{ left: `${badgePct}%`, bottom: 0 }}
          >
            <div
              className="w-0 h-0 mx-auto"
              style={{
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: `5px solid ${arrowColor(analysis.determination)}`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <DeterminationBadge determination={analysis.determination} />
          {showRankStats && (
            <RankStats
              tbaRank={analysis.tbaRank}
              epaRank={analysis.epaRank}
              rankDelta={analysis.rankDelta}
              className="ml-auto"
            />
          )}
        </div>
      )}

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
