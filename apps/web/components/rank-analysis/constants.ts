export const DETERMINATION_LABELS: Record<string, { label: string; color: string }> = {
  accurate: {
    label: 'Accurate',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  carried: {
    label: 'Carried by Partners',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  },
  easy_schedule: {
    label: 'Easy Schedule',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  },
  favorable: {
    label: 'Favorable Outcomes',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  },
  underrated: {
    label: 'Underrated',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  tough_schedule: {
    label: 'Tough Schedule',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  unlucky: {
    label: 'Unlucky',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
};

export function deltaColor(delta: number): string {
  const abs = Math.abs(delta);
  if (abs <= 3) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  if (abs <= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
}
