'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ScoutingFieldDefinition } from '@allianceops/shared';
import { ScoutingField } from './scouting-field';
import { TagDropdown } from '../picklist/tag-filter-control';

const CATEGORIES = ['auto', 'teleop', 'endgame'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  auto: 'Autonomous',
  teleop: 'Teleop',
  endgame: 'Endgame',
};

export function ScoutingForm({
  fields,
  notes,
  data,
  disabled,
  onNotesChange,
  onFieldChange,
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
  tags: string[];
  allTags: string[];
  onTagsChange: (tags: string[]) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const groupedFields = CATEGORIES.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    fields: fields.filter((f) => f.category === cat),
  })).filter((g) => g.fields.length > 0);

  return (
    <div className="space-y-5">
      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
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
    </div>
  );
}
