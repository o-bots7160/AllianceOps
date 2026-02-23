'use client';

import { useState } from 'react';

interface InfoBoxProps {
  heading: string;
  headingExtra?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function InfoBox({ heading, headingExtra, children, defaultOpen = false }: InfoBoxProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setOpen(!open)}
            className="text-2xl font-bold truncate text-left"
          >
            {heading}
          </button>
          {headingExtra}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={open ? 'Hide page info' : 'Show page info'}
          title="About this page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-4 py-3 text-sm text-blue-700 dark:text-blue-300 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
