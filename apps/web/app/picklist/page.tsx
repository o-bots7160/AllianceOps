'use client';

import { useState, useMemo } from 'react';
import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { InfoBox } from '../../components/info-box';
import { LoadingSpinner } from '../../components/loading-spinner';

interface EnrichedTeam {
  team_number: number;
  nickname?: string;
  epa: { total: number; auto: number; teleop: number; endgame: number } | null;
  eventRecord: { wins: number; losses: number; ties: number } | null;
}

interface PicklistEntry {
  teamNumber: number;
  nickname: string;
  score: number;
  epaTotal: number;
  epaAuto: number;
  epaTeleop: number;
  epaEndgame: number;
  rank: number;
  excluded: boolean;
  tags: string[];
  notes: string;
}

function generatePicklist(teams: EnrichedTeam[]): PicklistEntry[] {
  if (!teams.length) return [];

  const maxEpa = Math.max(...teams.map((t) => t.epa?.total ?? 0), 1);

  return teams
    .map((t) => ({
      teamNumber: t.team_number,
      nickname: t.nickname ?? `Team ${t.team_number}`,
      score: (t.epa?.total ?? 0) / maxEpa,
      epaTotal: t.epa?.total ?? 0,
      epaAuto: t.epa?.auto ?? 0,
      epaTeleop: t.epa?.teleop ?? 0,
      epaEndgame: t.epa?.endgame ?? 0,
      rank: 0,
      excluded: false,
      tags: [] as string[],
      notes: '',
    }))
    .sort((a, b) => b.score - a.score)
    .map((t, i) => ({ ...t, rank: i + 1 }));
}

function downloadCSV(entries: PicklistEntry[]) {
  const header = 'Rank,Team,Name,Score,EPA Total,Auto,Teleop,Endgame,Tags,Notes';
  const rows = entries
    .filter((e) => !e.excluded)
    .map(
      (e) =>
        `${e.rank},${e.teamNumber},"${e.nickname}",${e.score.toFixed(3)},${e.epaTotal.toFixed(1)},${e.epaAuto.toFixed(1)},${e.epaTeleop.toFixed(1)},${e.epaEndgame.toFixed(1)},"${e.tags.join(';')}","${e.notes}"`,
    );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'picklist.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function PicklistPage() {
  const { eventKey } = useEventSetup();
  const { data: teams, loading: teamsLoading } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [entries, setEntries] = useState<PicklistEntry[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize picklist when teams load
  if (teams && !initialized) {
    setEntries(generatePicklist(teams));
    setInitialized(true);
  }

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [entries]);

  const filtered = entries.filter((e) => {
    if (search && !String(e.teamNumber).includes(search) && !e.nickname.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (tagFilter && !e.tags.includes(tagFilter)) return false;
    return true;
  });

  if (!eventKey) {
    return <p className="text-gray-500">Select an event on the Event page first.</p>;
  }

  if (teamsLoading) {
    return <LoadingSpinner message="Loading team data..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Picklist</h2>
        <button
          onClick={() => downloadCSV(entries)}
          className="px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
        >
          Export CSV
        </button>
      </div>

      <InfoBox>
        <p>
          <strong>Picklist</strong> ranks all teams at the event by a composite score based on Statbotics
          EPA ratings — auto, teleop, and endgame. Use this during alliance selection to identify the
          strongest available partners.
        </p>
        <p>
          <strong>Tags</strong> let you categorize teams (e.g., &quot;strong auto&quot;, &quot;good
          defense&quot;). <strong>Notes</strong> are free-form observations. <strong>Exclude</strong> teams
          you don&apos;t want to consider. All annotations are local to your browser.
        </p>
        <p>
          Use <strong>Export CSV</strong> to download the picklist for sharing or printing. Search by team
          number or name, and filter by tag.
        </p>
      </InfoBox>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search team # or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
              <th className="py-2 px-2 w-12">#</th>
              <th className="py-2 px-2">Team</th>
              <th className="py-2 px-2">Score</th>
              <th className="py-2 px-2">Auto</th>
              <th className="py-2 px-2">Teleop</th>
              <th className="py-2 px-2">Endgame</th>
              <th className="py-2 px-2">Tags</th>
              <th className="py-2 px-2">Notes</th>
              <th className="py-2 px-2 w-16">Excl</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr
                key={entry.teamNumber}
                className={`border-b border-gray-100 dark:border-gray-800 ${
                  entry.excluded ? 'opacity-40 line-through' : ''
                }`}
              >
                <td className="py-2 px-2 font-mono text-gray-500">{entry.rank}</td>
                <td className="py-2 px-2">
                  <span className="font-bold">{entry.teamNumber}</span>
                  <span className="ml-2 text-gray-500 text-xs">{entry.nickname}</span>
                </td>
                <td className="py-2 px-2 font-mono">{entry.epaTotal.toFixed(1)}</td>
                <td className="py-2 px-2 font-mono text-green-600">{entry.epaAuto.toFixed(1)}</td>
                <td className="py-2 px-2 font-mono text-blue-600">{entry.epaTeleop.toFixed(1)}</td>
                <td className="py-2 px-2 font-mono text-purple-600">{entry.epaEndgame.toFixed(1)}</td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    placeholder="tag1;tag2"
                    value={entry.tags.join(';')}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((p) =>
                          p.teamNumber === entry.teamNumber
                            ? { ...p, tags: e.target.value.split(';').filter(Boolean) }
                            : p,
                        ),
                      )
                    }
                    className="w-24 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs"
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    placeholder="Notes..."
                    value={entry.notes}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((p) =>
                          p.teamNumber === entry.teamNumber
                            ? { ...p, notes: e.target.value }
                            : p,
                        ),
                      )
                    }
                    className="w-32 rounded border border-gray-300 dark:border-gray-700 bg-transparent px-1 py-0.5 text-xs"
                  />
                </td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={entry.excluded}
                    onChange={() =>
                      setEntries((prev) =>
                        prev.map((p) =>
                          p.teamNumber === entry.teamNumber
                            ? { ...p, excluded: !p.excluded }
                            : p,
                        ),
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
