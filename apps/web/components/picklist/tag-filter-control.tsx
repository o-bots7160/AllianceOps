'use client';

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';

const SUGGESTED_TAGS = [
  'Fast Cycle',
  'Fragile Bot',
  'Good Defense',
  'High Scorer',
  'Penalty Risk',
  'Reliable Auton',
  'Reliable Bot',
  'Strong Endgame',
];

/** Inline multi-select tag dropdown for a single picklist row. */
export function TagDropdown({
  tags,
  allTags,
  disabled,
  onChange,
}: {
  tags: string[];
  allTags: string[];
  disabled: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (tag: string) => {
    if (tags.includes(tag)) {
      onChange(tags.filter((t) => t !== tag));
    } else {
      onChange([...tags, tag]);
    }
  };

  const addNew = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setNewTag('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNew();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex flex-wrap items-center gap-1 min-w-[6rem] min-h-[1.75rem] rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        {tags.length === 0 && <span className="text-gray-400">+ tags</span>}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 text-[10px] leading-tight"
          >
            {tag}
          </span>
        ))}
      </button>
      {open && !disabled && (
        <div className="absolute right-0 lg:right-auto lg:left-0 z-50 mt-1 w-44 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 text-xs max-h-48 overflow-y-auto">
          {allTags.map((tag) => (
            <label
              key={tag}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 select-none"
            >
              <input
                type="checkbox"
                checked={tags.includes(tag)}
                onChange={() => toggle(tag)}
                className="h-4 w-4 accent-primary-600"
              />
              {tag}
            </label>
          ))}
          {(() => {
            const suggestions = SUGGESTED_TAGS.filter(
              (s) => !allTags.includes(s) && !tags.includes(s),
            );
            if (suggestions.length === 0) return null;
            return (
              <>
                {allTags.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 mt-1" />
                )}
                <div className="px-2 pt-1.5 pb-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">
                    Suggestions
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 px-2 pb-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChange([...tags, s])}
                      className="rounded-full border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-[10px] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
          <div className="border-t border-gray-200 dark:border-gray-700 px-2 pt-1.5 pb-1 mt-1">
            <div className="flex gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="New tag…"
                className="flex-1 min-w-0 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1.5 py-1 text-xs"
              />
              <button
                type="button"
                onClick={addNew}
                disabled={!newTag.trim()}
                className="px-1.5 py-1 rounded bg-primary-600 text-white text-xs disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Multi-select tag filter for the toolbar. */
export function TagFilterControl({
  allTags,
  selected,
  onChange,
}: {
  allTags: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  if (allTags.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        className="flex flex-wrap items-center gap-1 min-w-[8rem] h-[38px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-left cursor-pointer"
      >
        {selected.length === 0 && <span className="text-gray-400">Filter by tags</span>}
        {selected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 text-xs leading-tight"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(tag);
              }}
              className="cursor-pointer hover:text-primary-900 dark:hover:text-primary-100"
              aria-label={`Remove ${tag} filter`}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-48 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 text-sm max-h-48 overflow-y-auto">
          {allTags.map((tag) => (
            <label
              key={tag}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 select-none"
            >
              <input
                type="checkbox"
                checked={selected.includes(tag)}
                onChange={() => toggle(tag)}
                className="h-4 w-4 accent-primary-600"
              />
              {tag}
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
