'use client';

import { useState, useRef, useEffect } from 'react';

interface SaveComboButtonProps {
  /** Whether the user can edit */
  canEdit: boolean;
  /** Whether there's an authenticated user */
  hasUser: boolean;
  /** Whether the user has an active team */
  hasTeam: boolean;
  /** Whether a save is in progress */
  saving: boolean;
  /** Whether autosave is enabled */
  autosaveEnabled: boolean;
  /** Toggle autosave */
  onToggleAutosave: () => void;
  /** Trigger a manual save */
  onSave: () => void;
  /** Button label override (default: 'Save') */
  label?: string;
}

/**
 * Split/combo save button with autosave toggle dropdown.
 *
 * Primary action: manual save (unchanged from existing behavior).
 * Dropdown: checkbox to enable/disable autosave.
 */
export function SaveComboButton({
  canEdit,
  hasUser,
  hasTeam,
  saving,
  autosaveEnabled,
  onToggleAutosave,
  onSave,
  label = 'Save',
}: SaveComboButtonProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const buttonText = !canEdit
    ? !hasUser
      ? 'Log In to Save'
      : !hasTeam
        ? 'Join Team to Save'
        : 'Read Only'
    : saving
      ? 'Saving...'
      : autosaveEnabled
        ? 'Auto-saving'
        : label;

  return (
    <div ref={containerRef} className="relative inline-flex">
      {/* Primary save button */}
      <button
        onClick={onSave}
        disabled={!canEdit || saving}
        className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
          canEdit && !saving
            ? 'rounded-l-md bg-primary-600 text-white hover:bg-primary-700'
            : canEdit
              ? 'rounded-l-md bg-primary-600 text-white opacity-60'
              : 'rounded-md bg-gray-400 text-gray-200 cursor-not-allowed'
        } disabled:opacity-60`}
      >
        {buttonText}
      </button>

      {/* Dropdown toggle */}
      {canEdit && (
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className={`px-1.5 py-1.5 rounded-r-md border-l border-primary-700 text-sm font-medium ${
            'bg-primary-600 text-white hover:bg-primary-700'
          }`}
          aria-label="Save options"
        >
          <svg
            className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
            <input
              type="checkbox"
              checked={autosaveEnabled}
              onChange={onToggleAutosave}
              className="h-4 w-4 cursor-pointer accent-primary-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Auto-save</span>
          </label>
        </div>
      )}
    </div>
  );
}
