'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ScoutingFieldDefinition } from '@allianceops/shared';
import { ScoutingField } from './scouting-field';
import { PerMatchTable } from './per-match-table';
import { TagDropdown } from '../picklist/tag-filter-control';

const CATEGORIES = ['general', 'auto', 'teleop', 'endgame'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  auto: 'Autonomous',
  teleop: 'Teleop',
  endgame: 'Endgame',
};

interface TBAMatchLike {
  key: string;
  comp_level: string;
  set_number?: number;
  match_number: number;
  alliances: {
    red: { team_keys: string[] };
    blue: { team_keys: string[] };
  };
}

export function ScoutingForm({
  fields,
  notes,
  data,
  disabled,
  onNotesChange,
  onFieldChange,
  onPerMatchChange,
  matches,
  targetTeamNumber,
  tags,
  allTags,
  onTagsChange,
}: {
  fields: ScoutingFieldDefinition[];
  notes: string;
  data: Record<string, unknown>;
  disabled: boolean;
  onNotesChange: (notes: string) => void;
  onFieldChange: (key: string, value: unknown) => void;
  onPerMatchChange: (fieldKey: string, matchKey: string, value: number | null) => void;
  matches: TBAMatchLike[];
  targetTeamNumber: number;
  tags: string[];
  allTags: string[];
  onTagsChange: (tags: string[]) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Per-match fields are rendered collectively in a dedicated table, not
  // within their category sections.
  const perMatchFields = fields.filter((f) => f.type === 'per-match-number');
  const standardFields = fields.filter((f) => f.type !== 'per-match-number');

  const groupedFields = CATEGORIES.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    fields: standardFields.filter((f) => f.category === cat),
  })).filter((g) => g.fields.length > 0);

  const allSectionKeys: string[] = [
    'picklist',
    ...groupedFields.map((g) => g.category),
    ...(perMatchFields.length > 0 ? ['per-match'] : []),
  ];
  const allCollapsed = allSectionKeys.every((k) => collapsed[k]);
  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsed({});
    } else {
      setCollapsed(Object.fromEntries(allSectionKeys.map((k) => [k, true])));
    }
  };

  return (
    <div className="space-y-5">
      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes
          </label>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        </div>
        <textarea
          value={notes}
          disabled={disabled}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="General observations, strengths, weaknesses..."
          rows={3}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm disabled:opacity-50 resize-y"
        />
      </div>

      {/* Picklist */}
      <div>
        <button
          type="button"
          onClick={() => toggleSection('picklist')}
          className="flex items-center gap-1.5 w-full text-left mb-2"
        >
          <svg
            className={`h-3.5 w-3.5 text-gray-400 transition-transform shrink-0 ${collapsed['picklist'] ? '' : 'rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Picklist
          </span>
        </button>
        {!collapsed['picklist'] && (
          <div className="pl-5 space-y-2">
            <TagDropdown
              tags={tags}
              allTags={allTags}
              disabled={disabled}
              onChange={onTagsChange}
            />
            <Link
              href="/picklist/"
              className="inline-block text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View in Picklist →
            </Link>
          </div>
        )}
      </div>

      {/* Game-specific fields grouped by category */}
      {groupedFields.map((group) => (
        <div key={group.category}>
          <button
            type="button"
            onClick={() => toggleSection(group.category)}
            className="flex items-center gap-1.5 w-full text-left mb-2"
          >
            <svg
              className={`h-3.5 w-3.5 text-gray-400 transition-transform shrink-0 ${collapsed[group.category] ? '' : 'rotate-90'
                }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {group.label}
            </span>
            <span className="text-xs text-gray-400">({group.fields.length})</span>
          </button>
          {!collapsed[group.category] && (
            <div className="space-y-4 pl-5">
              {group.fields.map((field) => (
                <ScoutingField
                  key={field.key}
                  field={field}
                  value={data[field.key]}
                  disabled={disabled}
                  onChange={(v) => onFieldChange(field.key, v)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Per-Match Observations */}
      {perMatchFields.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => toggleSection('per-match')}
            className="flex items-center gap-1.5 w-full text-left mb-2"
          >
            <svg
              className={`h-3.5 w-3.5 text-gray-400 transition-transform shrink-0 ${collapsed['per-match'] ? '' : 'rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Per-Match Observations
            </span>
            <span className="text-xs text-gray-400">({perMatchFields.length})</span>
          </button>
          {!collapsed['per-match'] && (
            <div className="pl-5">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Enter values per match. Averages above update automatically.
              </p>
              <PerMatchTable
                fields={perMatchFields}
                matches={matches}
                targetTeamNumber={targetTeamNumber}
                data={data}
                disabled={disabled}
                onChange={onPerMatchChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
