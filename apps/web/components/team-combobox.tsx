'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

export interface TeamOption {
    teamId: string;
    teamNumber: number;
    name: string;
}

export interface RecentSearch {
    teamNumber: number;
    name?: string;
    lastSearchedAt: string;
}

interface TeamComboboxProps {
    /** Currently displayed team number (may be a non-member team). */
    teamNumber: number | null;
    /** Teams the current user belongs to (shown in dropdown). */
    teams: TeamOption[];
    /** Recent team number searches (most recent first, max 5). */
    recentSearches: RecentSearch[];
    /** Called when a user picks a team from the dropdown. */
    onTeamSelect: (teamId: string, teamNumber: number) => void;
    /** Called when a user manually types a team number (may be non-member). */
    onManualEntry: (teamNumber: number) => void;
    compact?: boolean;
}

/** localStorage key for recent team searches. */
const RECENT_KEY = 'allianceops-recent-teams';
const MAX_RECENT = 5;

/** Read recent searches from localStorage, sorted most-recent first. */
export function loadRecentSearches(): RecentSearch[] {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(
                (r: unknown): r is RecentSearch =>
                    typeof r === 'object' &&
                    r !== null &&
                    typeof (r as RecentSearch).teamNumber === 'number' &&
                    typeof (r as RecentSearch).lastSearchedAt === 'string',
            )
            .sort((a, b) => b.lastSearchedAt.localeCompare(a.lastSearchedAt))
            .slice(0, MAX_RECENT);
    } catch {
        return [];
    }
}

/**
 * Add or update a team number in the recent searches list.
 * If the team already exists, its lastSearchedAt is updated to now
 * (moving it to the top) without removing other entries.
 * Keeps at most 5 entries, dropping the oldest when full.
 */
export function addRecentSearch(teamNumber: number, name?: string): RecentSearch[] {
    const now = new Date().toISOString();
    const current = loadRecentSearches();
    const existing = current.find((r) => r.teamNumber === teamNumber);
    let updated: RecentSearch[];
    if (existing) {
        // Update timestamp and name (if provided), keep all others
        updated = current.map((r) =>
            r.teamNumber === teamNumber
                ? { ...r, lastSearchedAt: now, ...(name !== undefined ? { name } : {}) }
                : r,
        );
    } else {
        // Add new entry, drop oldest if over limit
        updated = [{ teamNumber, name, lastSearchedAt: now }, ...current].slice(0, MAX_RECENT);
    }
    // Re-sort descending by lastSearchedAt
    updated.sort((a, b) => b.lastSearchedAt.localeCompare(a.lastSearchedAt));
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
        // Ignore storage errors
    }
    return updated;
}

/**
 * A combo input that lets the user manually type any FRC team number OR
 * pick from their own teams in a dropdown. When the typed number matches
 * one of the user's teams the dropdown highlights it automatically.
 *
 * Also shows recent searches below a divider when available.
 */
export function TeamCombobox({
    teamNumber,
    teams,
    recentSearches,
    onTeamSelect,
    onManualEntry,
    compact,
}: TeamComboboxProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(teamNumber ? String(teamNumber) : '');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Sync external teamNumber changes into the input
    useEffect(() => {
        setInputValue(teamNumber ? String(teamNumber) : '');
    }, [teamNumber]);

    // Filter teams by input
    const filteredTeams = useMemo(() => {
        if (!inputValue) return teams;
        const lower = inputValue.toLowerCase();
        return teams.filter(
            (t) =>
                String(t.teamNumber).includes(lower) || t.name.toLowerCase().includes(lower),
        );
    }, [teams, inputValue]);

    // Recent searches excluding any that match a team membership (always show full list)
    const filteredRecent = useMemo(() => {
        const memberNumbers = new Set(teams.map((t) => t.teamNumber));
        return recentSearches.filter((r) => !memberNumbers.has(r.teamNumber));
    }, [recentSearches, teams]);

    // Total selectable items count (teams + recents)
    const totalItems = filteredTeams.length + filteredRecent.length;

    useEffect(() => {
        setHighlightIndex(0);
    }, [filteredTeams, filteredRecent]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (open && listRef.current) {
            const item = listRef.current.querySelector(`[data-idx="${highlightIndex}"]`) as HTMLElement | undefined;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIndex, open]);

    // Clear debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

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

    function handleSelectTeam(team: TeamOption) {
        setInputValue(String(team.teamNumber));
        onTeamSelect(team.teamId, team.teamNumber);
        setOpen(false);
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }

    function handleSelectRecent(recent: RecentSearch) {
        setInputValue(String(recent.teamNumber));
        // Check if this recent search matches a team membership
        const match = teams.find((t) => t.teamNumber === recent.teamNumber);
        if (match) {
            onTeamSelect(match.teamId, match.teamNumber);
        } else {
            onManualEntry(recent.teamNumber);
        }
        setOpen(false);
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }

    // Whether the dropdown has any content to show
    const hasDropdownContent = teams.length > 0 || recentSearches.length > 0;

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!open) {
            if (e.key === 'ArrowDown') {
                if (hasDropdownContent) setOpen(true);
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
                setHighlightIndex((i) => Math.min(i + 1, totalItems - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightIndex((i) => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightIndex < filteredTeams.length) {
                    handleSelectTeam(filteredTeams[highlightIndex]);
                } else if (highlightIndex - filteredTeams.length < filteredRecent.length) {
                    handleSelectRecent(filteredRecent[highlightIndex - filteredTeams.length]);
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

    const showDropdown = open && hasDropdownContent && totalItems > 0;

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                placeholder="Team #"
                onChange={(e) => {
                    setInputValue(e.target.value);
                    if (!open && hasDropdownContent) setOpen(true);
                    debouncedCommit(e.target.value);
                }}
                onFocus={() => {
                    if (hasDropdownContent) setOpen(true);
                }}
                onClick={() => {
                    if (hasDropdownContent && !open) setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                className={`w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 ${compact ? (hasDropdownContent ? 'px-2 py-1 pr-6' : 'px-2 py-1') : (hasDropdownContent ? 'px-3 py-2 pr-8' : 'px-3 py-2')} text-sm`}
                role="combobox"
                aria-expanded={showDropdown}
                aria-haspopup="listbox"
                autoComplete="off"
            />
            {hasDropdownContent && (
                <svg
                    className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            )}
            {showDropdown && (
                <ul
                    ref={listRef}
                    className="absolute z-10 mt-1 max-h-60 w-max min-w-full overflow-auto rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 text-sm shadow-lg"
                    role="listbox"
                >
                    {filteredTeams.map((team, i) => (
                        <li
                            key={`team-${team.teamId}`}
                            data-idx={i}
                            role="option"
                            aria-selected={teamNumber === team.teamNumber}
                            className={`cursor-pointer px-3 py-2 whitespace-nowrap ${i === highlightIndex
                                ? 'bg-primary-100 dark:bg-primary-900'
                                : teamNumber === team.teamNumber
                                    ? 'bg-gray-100 dark:bg-gray-700'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            onMouseEnter={() => setHighlightIndex(i)}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectTeam(team);
                            }}
                        >
                            <span className="font-medium">{team.teamNumber}</span>
                            <span className="text-gray-500 dark:text-gray-400"> — {team.name}</span>
                        </li>
                    ))}
                    {filteredTeams.length > 0 && filteredRecent.length > 0 && (
                        <li className="border-t border-gray-200 dark:border-gray-700 my-1" role="separator">
                            <span className="block px-3 py-1 text-xs text-gray-400 dark:text-gray-500">
                                Recent
                            </span>
                        </li>
                    )}
                    {filteredTeams.length === 0 && filteredRecent.length > 0 && (
                        <li className="mb-1" role="separator">
                            <span className="block px-3 py-1 text-xs text-gray-400 dark:text-gray-500">
                                Recent
                            </span>
                        </li>
                    )}
                    {filteredRecent.map((recent, i) => {
                        const idx = filteredTeams.length + i;
                        return (
                            <li
                                key={`recent-${recent.teamNumber}`}
                                data-idx={idx}
                                role="option"
                                aria-selected={teamNumber === recent.teamNumber}
                                className={`cursor-pointer px-3 py-2 whitespace-nowrap ${idx === highlightIndex
                                    ? 'bg-primary-100 dark:bg-primary-900'
                                    : teamNumber === recent.teamNumber
                                        ? 'bg-gray-100 dark:bg-gray-700'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                onMouseEnter={() => setHighlightIndex(idx)}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectRecent(recent);
                                }}
                            >
                                <span className="font-medium">{recent.teamNumber}</span>
                                {recent.name && (
                                    <span className="text-gray-500 dark:text-gray-400"> — {recent.name}</span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
