'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TeamCard } from '@/components/team-card';
import type { EnrichedTeam } from './types';
import type { TeamRankAnalysis, GameMetricDefinition } from '@allianceops/shared';

export function TeamDetailModal({
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
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
