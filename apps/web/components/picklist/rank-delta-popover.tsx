'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { TeamRankAnalysis } from '@allianceops/shared';
import { DETERMINATION_LABELS } from '@/components/team-card';
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
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Calculate fixed position relative to viewport
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const preferAbove = rect.top >= 200;
      setAbove(preferAbove);
      setPos({
        top: preferAbove ? rect.top : rect.bottom,
        left: rect.left + rect.width / 2,
      });
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const cancelHide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const detLabel = DETERMINATION_LABELS[analysis.determination];
  const colorClass =
    analysis.determination === 'accurate'
      ? 'text-green-600 dark:text-green-400'
      : analysis.determination === 'carried' ||
          analysis.determination === 'easy_schedule' ||
          analysis.determination === 'favorable'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-blue-600 dark:text-blue-400';

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={onClick}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`text-[10px] font-semibold leading-tight cursor-pointer hover:underline ${colorClass}`}
      >
        {detLabel?.label ?? analysis.determination}
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={cancelHide}
            onMouseLeave={hide}
            style={{
              position: 'fixed',
              top: above ? undefined : pos.top + 8,
              bottom: above ? `calc(100vh - ${pos.top}px + 8px)` : undefined,
              left: pos.left,
              transform: 'translateX(-50%)',
            }}
            className="z-50 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 space-y-2"
          >
            {/* Arrow pointing toward the trigger */}
            <span
              className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${
                above
                  ? '-bottom-[7px] border-t-0 border-l-0'
                  : '-top-[7px] border-b-0 border-r-0'
              }`}
            />
            <RankDeltaScale analysis={analysis} allAnalyses={allAnalyses} />
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
              {analysis.explanation}
            </p>
          </div>,
          document.body,
        )}
    </span>
  );
}
