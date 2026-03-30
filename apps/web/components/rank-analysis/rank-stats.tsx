import type { ReactNode } from 'react';
import { deltaColor } from './constants';

interface RankStatsProps {
  tbaRank?: number | null;
  epaRank?: number | null;
  rankDelta: number;
  children?: ReactNode;
  className?: string;
}

export function RankStats({
  tbaRank,
  epaRank,
  rankDelta,
  children,
  className = '',
}: RankStatsProps) {
  return (
    <span className={`flex items-center gap-1.5 text-[10px] ${className}`}>
      <span className="text-gray-400 dark:text-gray-500 font-mono">
        {tbaRank != null && <>TBA #{tbaRank}</>}
        {tbaRank != null && epaRank != null && ' · '}
        {epaRank != null && <>EPA #{epaRank}</>}
      </span>
      {rankDelta !== 0 && (
        <span className={`px-1.5 py-0.5 rounded-full font-medium ${deltaColor(rankDelta)}`}>
          Δ{rankDelta > 0 ? '+' : ''}
          {rankDelta}
        </span>
      )}
      {children}
    </span>
  );
}
