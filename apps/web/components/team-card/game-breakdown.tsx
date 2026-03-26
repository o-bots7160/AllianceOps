import type { GameMetricDefinition } from '@allianceops/shared';
import { EpaBar } from './epa-bar';

const METRIC_COLOR = 'bg-cyan-500';

interface GameBreakdownProps {
  metrics: GameMetricDefinition[];
  breakdown: Record<string, number>;
  expanded: boolean;
  onToggle: () => void;
}

export function GameBreakdown({ metrics, breakdown, expanded, onToggle }: GameBreakdownProps) {
  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 w-full text-left"
      >
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium text-gray-500 dark:text-gray-400">Game Breakdown</span>
      </button>
      {expanded && (
        <div className="mt-2.5 space-y-2">
          {metrics.map(
            (m) =>
              breakdown[m.key] != null && (
                <div key={m.key} className="flex items-center gap-2">
                  <span className="w-16 truncate" title={m.description}>
                    {m.label}
                  </span>
                  <EpaBar value={Math.abs(breakdown[m.key])} max={6} color={METRIC_COLOR} />
                  <span className="w-8 text-right">{breakdown[m.key].toFixed(1)}</span>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}
