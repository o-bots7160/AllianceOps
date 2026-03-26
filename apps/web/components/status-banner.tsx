'use client';

import { type ReactNode } from 'react';

const variantStyles = {
  error: {
    container:
      'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    dismiss:
      'text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300',
  },
  warning: {
    container:
      'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    dismiss:
      'text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300',
  },
  info: {
    container:
      'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    dismiss:
      'text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300',
  },
  success: {
    container:
      'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    dismiss:
      'text-green-400 hover:text-green-600 dark:text-green-500 dark:hover:text-green-300',
  },
} as const;

interface StatusBannerProps {
  variant: keyof typeof variantStyles;
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function StatusBanner({
  variant,
  children,
  className,
  dismissible = false,
  onDismiss,
}: StatusBannerProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role="status"
      className={`rounded-lg border px-4 py-2 text-sm ${styles.container}${className ? ` ${className}` : ''}`}
    >
      <div className={dismissible ? 'flex items-start justify-between gap-2' : undefined}>
        <div>{children}</div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={`shrink-0 p-0.5 rounded transition-colors ${styles.dismiss}`}
            aria-label="Dismiss"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
