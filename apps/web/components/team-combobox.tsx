'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

export interface TeamOption {
  teamId: string;
  teamNumber: number;
  name: string;
}

interface TeamComboboxProps {
  /** Currently displayed team number (may be a non-member team). */
  teamNumber: number | null;
  /** Teams the current user belongs to (shown in dropdown). */
  teams: TeamOption[];
  /** Called when a user picks a team from the dropdown. */
  onTeamSelect: (teamId: string, teamNumber: number) => void;
  /** Called when a user manually types a team number (may be non-member). */
  onManualEntry: (teamNumber: number) => void;
  compact?: boolean;
}

/**
 * A combo input that lets the user manually type any FRC team number OR
 * pick from their own teams in a dropdown. When the typed number matches
 * one of the user's teams the dropdown highlights it automatically.
 */
export function TeamCombobox({
  teamNumber,
  teams,
  onTeamSelect,
  onManualEntry,
  compact,
}: TeamComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(teamNumber ? String(teamNumber) : '');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external teamNumber changes into the input
  useEffect(() => {
    setInputValue(teamNumber ? String(teamNumber) : '');
  }, [teamNumber]);

  const filtered = useMemo(() => {
    if (!inputValue) return teams;
    const lower = inputValue.toLowerCase();
    return teams.filter(
      (t) =>
        String(t.teamNumber).includes(lower) || t.name.toLowerCase().includes(lower),
    );
  }, [teams, inputValue]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, open]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const commitManualEntry = useCallback(
    (value: string) => {
      const num = parseInt(value, 10);
      if (!num || num <= 0) return;

      // If the number matches one of the user's teams, treat it as a team select
      const match = teams.find((t) => t.teamNumber === num);
      if (match) {
        onTeamSelect(match.teamId, match.teamNumber);
      } else {
        onManualEntry(num);
      }
    },
    [teams, onTeamSelect, onManualEntry],
  );

  const debouncedCommit = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => commitManualEntry(value), 400);
    },
    [commitManualEntry],
  );

  function handleSelect(team: TeamOption) {
    setInputValue(String(team.teamNumber));
    onTeamSelect(team.teamId, team.teamNumber);
    setOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown') {
        if (teams.length > 0) setOpen(true);
        e.preventDefault();
      }
      if (e.key === 'Enter') {
        commitManualEntry(inputValue);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex]);
        } else {
          commitManualEntry(inputValue);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          setOpen(false);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  }

  const showDropdown = open && teams.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={inputValue}
        placeholder="Team #"
        onChange={(e) => {
          setInputValue(e.target.value);
          if (!open && teams.length > 0) setOpen(true);
          debouncedCommit(e.target.value);
        }}
        onFocus={() => {
          if (teams.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 ${compact ? 'px-2 py-1' : 'px-3 py-2'} text-sm`}
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        autoComplete="off"
      />
      {showDropdown && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-10 mt-1 max-h-60 w-max min-w-full overflow-auto rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 text-sm shadow-lg"
          role="listbox"
        >
          {filtered.map((team, i) => (
            <li
              key={team.teamId}
              role="option"
              aria-selected={teamNumber === team.teamNumber}
              className={`cursor-pointer px-3 py-2 whitespace-nowrap ${
                i === highlightIndex
                  ? 'bg-primary-100 dark:bg-primary-900'
                  : teamNumber === team.teamNumber
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(team);
              }}
            >
              <span className="font-medium">{team.teamNumber}</span>
              <span className="text-gray-500 dark:text-gray-400"> — {team.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
