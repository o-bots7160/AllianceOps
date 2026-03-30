'use client';

import { useState, useMemo } from 'react';
import type { EnrichedTeam } from '@/lib/types';
import type { ScoutingSummary } from '@allianceops/shared';

type SortKey = 'team' | 'tbaRank' | 'epaTotal' | 'status';
type SortDir = 'asc' | 'desc';

export function ScoutingTeamList({
  teams,
  summaryMap,
  onTeamSelect,
}: {
  teams: EnrichedTeam[];
  summaryMap: Map<number, ScoutingSummary>;
  onTeamSelect: (teamNumber: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('team');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let list = [...teams];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => String(t.team_number).includes(q) || t.nickname?.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'team':
          return (a.team_number - b.team_number) * dir;
        case 'tbaRank':
          return ((a.tbaRank ?? 999) - (b.tbaRank ?? 999)) * dir;
        case 'epaTotal':
          return ((a.epa?.total ?? 0) - (b.epa?.total ?? 0)) * dir;
        case 'status': {
          const aS = summaryMap.has(a.team_number) ? 0 : 1;
          const bS = summaryMap.has(b.team_number) ? 0 : 1;
          return (aS - bS) * dir || a.team_number - b.team_number;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [teams, search, sortKey, sortDir, summaryMap]);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
      onClick={() => handleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search team # or name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <SortHeader label="Team" k="team" />
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                Name
              </th>
              <SortHeader label="TBA Rank" k="tbaRank" />
              <SortHeader label="EPA Total" k="epaTotal" />
              <SortHeader label="Scouted" k="status" />
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((t) => {
              const summary = summaryMap.get(t.team_number);
              return (
                <tr
                  key={t.team_number}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => onTeamSelect(t.team_number)}
                >
                  <td className="px-3 py-2 font-bold text-primary-600 dark:text-primary-400">
                    {t.team_number}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 truncate max-w-[12rem] hidden sm:table-cell">
                    {t.nickname}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{t.tbaRank ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{t.epa?.total?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2">
                    {summary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 text-xs font-medium">
                        ✓ Scouted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 text-xs">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs truncate max-w-[12rem] hidden lg:table-cell">
                    {summary?.notePreview || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        {filtered.length} team{filtered.length !== 1 ? 's' : ''}
        {summaryMap.size > 0 && ` · ${summaryMap.size} scouted`}
      </p>
    </div>
  );
}
