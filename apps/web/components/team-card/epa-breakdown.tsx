import { EpaBar } from './epa-bar';

const MAX_EPA = 40;

interface EpaBreakdownProps {
  total: number;
  auto: number | null;
  teleop: number | null;
  endgame: number | null;
  expanded: boolean;
  onToggle: () => void;
}

export function EpaBreakdown({
  total,
  auto,
  teleop,
  endgame,
  expanded,
  onToggle,
}: EpaBreakdownProps) {
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
        <span className="font-medium text-gray-500 dark:text-gray-400">EPA Breakdown</span>
      </button>
      {expanded && (
        <div className="mt-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0">Total</span>
            <EpaBar value={total} max={MAX_EPA} color="bg-primary-500" />
            <span className="w-12 shrink-0 text-right">{total.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0">Auto</span>
            <EpaBar value={auto ?? 0} max={MAX_EPA / 2} color="bg-green-500" />
            <span className="w-12 shrink-0 text-right">{(auto ?? 0).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0">Teleop</span>
            <EpaBar value={teleop ?? 0} max={MAX_EPA / 2} color="bg-blue-500" />
            <span className="w-12 shrink-0 text-right">{(teleop ?? 0).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0">Endgame</span>
            <EpaBar value={endgame ?? 0} max={MAX_EPA / 3} color="bg-purple-500" />
            <span className="w-12 shrink-0 text-right">{(endgame ?? 0).toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
