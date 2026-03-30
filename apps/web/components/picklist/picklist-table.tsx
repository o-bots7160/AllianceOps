'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { TagDropdown } from './tag-filter-control';
import { RankDeltaPopover } from './rank-delta-popover';
import type { PicklistEntry, SortKey, SortState } from './types';
import type { TeamRankAnalysis, ScoutingSummary } from '@allianceops/shared';

interface PicklistTableProps {
  entries: PicklistEntry[];
  sortState: SortState;
  onSort: (key: SortKey) => void;
  canEdit: boolean;
  teamNumber: number;
  allTags: string[];
  rankAnalysisMap: Map<string, TeamRankAnalysis>;
  scoutingSummaryMap: Map<number, ScoutingSummary>;
  updateEntries: (updater: (prev: PicklistEntry[]) => PicklistEntry[]) => void;
  setSortState: (state: SortState) => void;
  onTeamClick: (teamNumber: number) => void;
}

export function PicklistTable({
  entries,
  sortState,
  onSort,
  canEdit,
  teamNumber,
  allTags,
  rankAnalysisMap,
  scoutingSummaryMap,
  updateEntries,
  setSortState,
  onTeamClick,
}: PicklistTableProps) {
  const ariaSortFor = useCallback(
    (key: SortKey): 'none' | 'ascending' | 'descending' => {
      if (sortState.key !== key) return 'none';
      return sortState.direction === 'asc' ? 'ascending' : 'descending';
    },
    [sortState],
  );

  const sortLabelFor = useCallback(
    (key: SortKey): string => {
      if (sortState.key !== key) return '';
      return sortState.direction === 'asc' ? ' (asc)' : ' (desc)';
    },
    [sortState],
  );

  const allAnalyses = useMemo(
    () => Array.from(rankAnalysisMap.values()),
    [rankAnalysisMap],
  );

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-center">
            <th className="py-2 px-2 w-16" aria-sort={ariaSortFor('excluded')}>
              <button type="button" onClick={() => onSort('excluded')} className="font-semibold">
                Excl{sortLabelFor('excluded')}
              </button>
            </th>
            <th
              className="hidden lg:table-cell py-2 px-2 w-20 text-center"
              aria-sort={ariaSortFor('manualRank')}
            >
              <button
                type="button"
                onClick={() => onSort('manualRank')}
                className="font-semibold"
              >
                Manual#{sortLabelFor('manualRank')}
              </button>
            </th>
            <th className="py-2 px-2" aria-sort={ariaSortFor('team')}>
              <button type="button" onClick={() => onSort('team')} className="font-semibold">
                Team{sortLabelFor('team')}
              </button>
            </th>
            <th className="py-2 px-2 text-center" aria-sort={ariaSortFor('tbaRank')}>
              <button type="button" onClick={() => onSort('tbaRank')} className="font-semibold">
                TBA Rank{sortLabelFor('tbaRank')}
              </button>
            </th>
            <th
              className="hidden lg:table-cell py-2 px-2"
              aria-sort={ariaSortFor('analysis')}
            >
              <button
                type="button"
                onClick={() => onSort('analysis')}
                className="font-semibold"
              >
                Analysis{sortLabelFor('analysis')}
              </button>
            </th>
            <th className="py-2 px-2 text-center" aria-sort={ariaSortFor('epaRank')}>
              <button type="button" onClick={() => onSort('epaRank')} className="font-semibold">
                EPA Rank{sortLabelFor('epaRank')}
              </button>
            </th>
            <th
              className="hidden lg:table-cell py-2 px-2 text-center"
              aria-sort={ariaSortFor('epaTotal')}
            >
              <button type="button" onClick={() => onSort('epaTotal')} className="font-semibold">
                EPA Total{sortLabelFor('epaTotal')}
              </button>
            </th>
            <th
              className="hidden lg:table-cell py-2 px-2 text-center"
              aria-sort={ariaSortFor('epaAuto')}
            >
              <button type="button" onClick={() => onSort('epaAuto')} className="font-semibold">
                Auto{sortLabelFor('epaAuto')}
              </button>
            </th>
            <th
              className="hidden lg:table-cell py-2 px-2 text-center"
              aria-sort={ariaSortFor('epaTeleop')}
            >
              <button type="button" onClick={() => onSort('epaTeleop')} className="font-semibold">
                Teleop{sortLabelFor('epaTeleop')}
              </button>
            </th>
            <th
              className="hidden lg:table-cell py-2 px-2 text-center"
              aria-sort={ariaSortFor('epaEndgame')}
            >
              <button
                type="button"
                onClick={() => onSort('epaEndgame')}
                className="font-semibold"
              >
                Endgame{sortLabelFor('epaEndgame')}
              </button>
            </th>
            <th className="py-2 px-2" aria-sort={ariaSortFor('tags')}>
              <button type="button" onClick={() => onSort('tags')} className="font-semibold">
                Tags{sortLabelFor('tags')}
              </button>
            </th>
            <th className="py-2 px-2 text-center">
              <span className="font-semibold">Scouted</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isMyTeam = entry.teamNumber === teamNumber;
            const analysis = rankAnalysisMap.get(`frc${entry.teamNumber}`);
            return (
              <tr
                key={entry.teamNumber}
                className={`border-b border-gray-100 dark:border-gray-800 ${entry.excluded ? 'opacity-40 line-through' : ''} ${isMyTeam ? 'bg-primary-50 dark:bg-primary-900/30 ring-1 ring-inset ring-primary-300 dark:ring-primary-700' : ''}`}
              >
                <td className="py-2 px-2 text-center">
                  <label className="inline-flex items-center justify-center w-8 h-8 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={entry.excluded}
                      disabled={!canEdit}
                      onChange={() =>
                        updateEntries((prev) =>
                          prev.map((p) =>
                            p.teamNumber === entry.teamNumber
                              ? { ...p, excluded: !p.excluded }
                              : p,
                          ),
                        )
                      }
                      className="h-5 w-5 cursor-pointer accent-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </label>
                </td>
                <td className="hidden lg:table-cell py-2 px-2 font-mono text-gray-500 text-center">
                  {canEdit ? (
                    <input
                      type="number"
                      min={1}
                      value={entry.rank}
                      onChange={(e) => {
                        const parsed = Number.parseInt(e.target.value, 10);
                        if (Number.isNaN(parsed) || parsed < 1) return;
                        setSortState({ key: 'manualRank', direction: 'asc' });
                        updateEntries((prev) =>
                          prev.map((p) =>
                            p.teamNumber === entry.teamNumber ? { ...p, rank: parsed } : p,
                          ),
                        );
                      }}
                      className="w-14 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs"
                    />
                  ) : (
                    entry.rank
                  )}
                </td>
                <td className="py-2 px-2">
                  <button
                    type="button"
                    onClick={() => onTeamClick(entry.teamNumber)}
                    className="font-bold hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                  >
                    {entry.teamNumber}
                  </button>
                  <span className="hidden lg:inline ml-2 text-gray-500 text-xs">
                    {entry.nickname}
                  </span>
                </td>
                <td className="py-2 px-2 font-mono text-center">{entry.tbaRank ?? '-'}</td>
                <td className="hidden lg:table-cell py-2 px-2 text-center">
                  {analysis && (
                    <RankDeltaPopover
                      analysis={analysis}
                      allAnalyses={allAnalyses}
                      onClick={() => onTeamClick(entry.teamNumber)}
                    />
                  )}
                </td>
                <td className="py-2 px-2 font-mono text-center">{entry.epaRank}</td>
                <td className="hidden lg:table-cell py-2 px-2 font-mono text-center">
                  {entry.epaTotal.toFixed(1)}
                </td>
                <td className="hidden lg:table-cell py-2 px-2 font-mono text-center text-green-600">
                  {entry.epaAuto.toFixed(1)}
                </td>
                <td className="hidden lg:table-cell py-2 px-2 font-mono text-center text-blue-600">
                  {entry.epaTeleop.toFixed(1)}
                </td>
                <td className="hidden lg:table-cell py-2 px-2 font-mono text-center text-purple-600">
                  {entry.epaEndgame.toFixed(1)}
                </td>
                <td className="py-2 px-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <TagDropdown
                      tags={entry.tags}
                      allTags={allTags}
                      disabled={!canEdit}
                      onChange={(newTags) =>
                        updateEntries((prev) =>
                          prev.map((p) =>
                            p.teamNumber === entry.teamNumber ? { ...p, tags: newTags } : p,
                          ),
                        )
                      }
                    />
                  </div>
                </td>
                <td className="py-2 px-2 text-center">
                  <Link
                    href={`/scouting/${entry.teamNumber}/`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {scoutingSummaryMap.has(entry.teamNumber) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors">
                        ✓ Scouted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        —
                      </span>
                    )}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
