'use client';

import type { TeamRankAnalysis } from '@allianceops/shared';
import { DETERMINATION_LABELS } from '@/components/team-card';
import { HoverPopover } from '@/components/hover-popover';
import { RankDeltaScale } from './rank-delta-scale';

interface RankDeltaPopoverProps {
  /** The team's rank analysis. */
  analysis: TeamRankAnalysis;
  /** All teams' analyses for plotting on the scale. */
  allAnalyses: TeamRankAnalysis[];
  /** Click handler (e.g., open team detail modal). */
  onClick?: () => void;
}

/**
 * Hover-triggered popover that wraps the analysis determination label.
 * Shows a RankDeltaScale and explanation on hover/focus.
 */
export function RankDeltaPopover({ analysis, allAnalyses, onClick }: RankDeltaPopoverProps) {
  const detLabel = DETERMINATION_LABELS[analysis.determination];
  const colorClass =
    analysis.determination === 'accurate'
      ? 'text-green-600 dark:text-green-400'
      : analysis.determination === 'carried' ||
        analysis.determination === 'easy_schedule' ||
        analysis.determination === 'favorable'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-blue-600 dark:text-blue-400';

  const triggerContent = (
    <button
      type="button"
      onClick={onClick}
      className={`text-[10px] font-semibold leading-tight cursor-pointer hover:underline ${colorClass}`}
    >
      {detLabel?.label ?? analysis.determination}
    </button>
  );

  return (
    <HoverPopover trigger={triggerContent}>
      <RankDeltaScale analysis={analysis} allAnalyses={allAnalyses} />
      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
        {analysis.explanation}
      </p>
    </HoverPopover>
  );
}
