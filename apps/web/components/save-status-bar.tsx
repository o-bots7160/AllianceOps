'use client';

type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

interface SaveStatusBarProps {
  status: SaveStatus;
  errorMessage?: string;
  lastSavedAt?: Date;
  className?: string;
}

export function SaveStatusBar({ status, errorMessage, lastSavedAt, className }: SaveStatusBarProps) {
  if (status === 'clean') return null;

  return (
    <div
      role="status"
      className={`sticky bottom-0 z-10 flex items-center gap-2 border-t px-4 py-1.5 text-xs backdrop-blur-sm ${statusStyles[status]}${className ? ` ${className}` : ''}`}
    >
      {status === 'dirty' && (
        <span className="font-medium text-amber-600 dark:text-amber-400">Unsaved changes</span>
      )}

      {status === 'saving' && (
        <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
          <svg
            className="h-3.5 w-3.5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Saving…
        </span>
      )}

      {status === 'saved' && (
        <span className="font-medium text-green-600 dark:text-green-400">&#10003; Saved</span>
      )}

      {status === 'error' && (
        <span className="font-medium text-red-600 dark:text-red-400">
          {errorMessage ?? 'Save failed'}
        </span>
      )}

      {lastSavedAt && status !== 'saving' && (
        <span className="ml-auto text-gray-400">
          Last saved {lastSavedAt.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

const statusStyles: Record<SaveStatus, string> = {
  clean: '',
  dirty:
    'border-amber-200 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/80',
  saving:
    'border-blue-200 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/80',
  saved:
    'border-green-200 dark:border-green-800 bg-green-50/90 dark:bg-green-950/80',
  error:
    'border-red-200 dark:border-red-800 bg-red-50/90 dark:bg-red-950/80',
};
