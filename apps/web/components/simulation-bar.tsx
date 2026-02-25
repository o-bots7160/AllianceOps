'use client';

import { useSimulation } from './simulation-context';

export function SimulationBar() {
  const { isSimulating, cursor, eventKey, setCursor, stopSimulation } = useSimulation();

  if (!isSimulating) return null;

  return (
    <div className="bg-amber-100 dark:bg-amber-900 border-b border-amber-300 dark:border-amber-700">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4 text-sm">
        <span className="font-medium text-amber-800 dark:text-amber-200">
          ⏱ Simulating
        </span>
        <span className="text-amber-700 dark:text-amber-300">
          {eventKey} — Match {cursor}
        </span>
        <button
          onClick={() => setCursor(Math.max(1, cursor - 1))}
          className="px-2 py-0.5 rounded border border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800"
        >
          ◀
        </button>
        <button
          onClick={() => setCursor(cursor + 1)}
          className="px-2 py-0.5 rounded border border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800"
        >
          ▶
        </button>
        <a
          href="/simulation/"
          className="px-2 py-0.5 rounded border border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800 text-xs"
        >
          Full Controls
        </a>
        <button
          onClick={stopSimulation}
          className="px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700 text-xs"
        >
          Exit Sim
        </button>
      </div>
    </div>
  );
}
