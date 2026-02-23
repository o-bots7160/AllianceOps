'use client';

import { useState } from 'react';

interface InfoBoxProps {
  title?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function InfoBox({ title = 'About this page', children, defaultOpen = false }: InfoBoxProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>ℹ️</span>
          <span>{title}</span>
        </span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-blue-700 dark:text-blue-300 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
