'use client';

import { useMemo } from 'react';
import { matchLabel } from '../../lib/match-utils';
import { SaveComboButton } from '../save-combo-button';
import type { DutyTemplate } from '@allianceops/shared';
import type { SaveStatus } from '../../hooks/use-match-plan';

interface TBAMatch {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  winning_alliance: string;
}

export interface MatchSelectorProps {
  myMatches: TBAMatch[];
  currentMatchKey: string | undefined;
  selectedMatch: string;
  onMatchChange: (key: string) => void;
  template: string;
  onTemplateChange: (name: string) => void;
  dutyTemplates: DutyTemplate[];
  canEdit: boolean;
  saveStatus: SaveStatus;
  user: unknown;
  activeTeam: { teamId: string; teamNumber: number } | null;
  onSave: () => void;
  autosaveEnabled: boolean;
  onToggleAutosave: () => void;
}

export function MatchSelector({
  myMatches,
  currentMatchKey,
  selectedMatch,
  onMatchChange,
  template,
  onTemplateChange,
  dutyTemplates,
  canEdit,
  saveStatus,
  user,
  activeTeam,
  onSave,
  autosaveEnabled,
  onToggleAutosave,
}: MatchSelectorProps) {
  const currentIdx = useMemo(() => {
    const key = selectedMatch || currentMatchKey;
    return myMatches.findIndex((m) => m.key === key);
  }, [myMatches, selectedMatch, currentMatchKey]);

  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < myMatches.length - 1;

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
      <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[8rem]">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Match
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => hasPrev && onMatchChange(myMatches[currentIdx - 1].key)}
            className="h-[38px] px-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-30"
            aria-label="Previous match"
          >
            ◀
          </button>
          <select
            value={selectedMatch || currentMatchKey || ''}
            onChange={(e) => onMatchChange(e.target.value)}
            className="w-full h-[38px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {myMatches.map((m) => (
              <option key={m.key} value={m.key}>
                {matchLabel(m)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => hasNext && onMatchChange(myMatches[currentIdx + 1].key)}
            className="h-[38px] px-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-30"
            aria-label="Next match"
          >
            ▶
          </button>
        </div>
      </div>

      {dutyTemplates.length > 0 && (
        <div className="w-full sm:w-auto min-w-0 sm:max-w-[16rem] md:max-w-xs">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Template
          </label>
          <select
            value={template}
            onChange={(e) => onTemplateChange(e.target.value)}
            disabled={!canEdit}
            className="w-full h-[38px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm truncate disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Manual</option>
            {dutyTemplates.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label} — {t.description}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3 sm:ml-auto shrink-0">
        <SaveComboButton
          canEdit={canEdit}
          hasUser={!!user}
          hasTeam={!!activeTeam}
          saving={saveStatus === 'saving'}
          autosaveEnabled={autosaveEnabled}
          onToggleAutosave={onToggleAutosave}
          onSave={onSave}
          label="Save Plan"
        />
      </div>
    </div>
  );
}
