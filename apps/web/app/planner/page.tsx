'use client';

import { useState } from 'react';
import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { InfoBox } from '../../components/info-box';

interface TBAMatch {
  key: string;
  comp_level: string;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
}

const DUTY_SLOTS = [
  { key: 'AUTO_ROLE_1', label: 'Auto Role 1', category: 'auto' },
  { key: 'AUTO_ROLE_2', label: 'Auto Role 2', category: 'auto' },
  { key: 'AUTO_ROLE_3', label: 'Auto Role 3', category: 'auto' },
  { key: 'CORAL_SCORER', label: 'Coral Scorer', category: 'teleop' },
  { key: 'ALGAE_HANDLER', label: 'Algae Handler', category: 'teleop' },
  { key: 'CLIMBER_1', label: 'Climber 1', category: 'endgame' },
  { key: 'CLIMBER_2', label: 'Climber 2', category: 'endgame' },
  { key: 'DEFENSE_ROLE', label: 'Defense', category: 'defense' },
  { key: 'FOUL_DISCIPLINE', label: 'Foul Discipline', category: 'discipline' },
];

const CATEGORY_COLORS: Record<string, string> = {
  auto: 'border-l-green-500',
  teleop: 'border-l-blue-500',
  endgame: 'border-l-purple-500',
  defense: 'border-l-orange-500',
  discipline: 'border-l-red-500',
};

const TEMPLATES: Record<string, string> = {
  safe: 'Safe — conservative, max reliable points',
  balanced: 'Balanced — scoring + light defense',
  aggressive: 'Aggressive — max scoring + active defense',
};

export default function PlannerPage() {
  const { eventKey, teamNumber } = useEventSetup();
  const myTeamKey = `frc${teamNumber}`;

  const { data: matches } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );

  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<string>('');
  const [saved, setSaved] = useState(false);

  if (!eventKey) {
    return <p className="text-gray-500">Select an event on the Event page first.</p>;
  }

  const qualMatches = matches
    ?.filter((m) => m.comp_level === 'qm')
    .sort((a, b) => a.match_number - b.match_number);

  const myMatches = qualMatches?.filter(
    (m) =>
      m.alliances.red.team_keys.includes(myTeamKey) ||
      m.alliances.blue.team_keys.includes(myTeamKey),
  );

  const currentMatch = myMatches?.find((m) => m.key === selectedMatch) ?? myMatches?.[0];
  const isRed = currentMatch?.alliances.red.team_keys.includes(myTeamKey);
  const allianceTeams = currentMatch
    ? isRed
      ? currentMatch.alliances.red.team_keys
      : currentMatch.alliances.blue.team_keys
    : [];

  const teamNumbers = allianceTeams.map((t) => parseInt(t.replace('frc', ''), 10));

  const handleSave = async () => {
    if (!currentMatch) return;
    const duties = Object.entries(assignments)
      .filter(([, v]) => v !== null)
      .map(([slotKey, teamNumber]) => ({
        slotKey,
        teamNumber: teamNumber!,
        notes: notes[slotKey] || undefined,
      }));

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071/api';
      await fetch(
        `${API_BASE}/event/${eventKey}/match/${currentMatch.key}/plan`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duties }),
        },
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handle error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Duty Planner</h2>
        {saved && (
          <span className="text-green-600 text-sm font-medium">✓ Saved</span>
        )}
      </div>

      <InfoBox>
        <p>
          <strong>Duty Planner</strong> lets you assign specific roles to each alliance partner for an
          upcoming match. Select a match, then assign teams to duties like Coral Scorer, Algae Handler,
          Climber, or Defense.
        </p>
        <p>
          Use <strong>Templates</strong> to quickly apply a pre-built strategy: <strong>Safe</strong>{' '}
          (conservative, max reliable points), <strong>Balanced</strong> (scoring + light defense), or{' '}
          <strong>Aggressive</strong> (max scoring + active defense). You can customize assignments after
          applying a template.
        </p>
        <p>
          Add <strong>notes</strong> to any duty slot for match-specific instructions. Click{' '}
          <strong>Save Plan</strong> to store the plan. Duty categories are color-coded: green (auto),
          blue (teleop), purple (endgame), orange (defense), red (discipline).
        </p>
      </InfoBox>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Match
          </label>
          <select
            value={selectedMatch || currentMatch?.key || ''}
            onChange={(e) => {
              setSelectedMatch(e.target.value);
              setAssignments({});
              setNotes({});
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {myMatches?.map((m) => (
              <option key={m.key} value={m.key}>
                Q{m.match_number}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Template
          </label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="">Manual</option>
            {Object.entries(TEMPLATES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {currentMatch && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Alliance teams: {teamNumbers.join(', ')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DUTY_SLOTS.map((slot) => (
              <div
                key={slot.key}
                className={`rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${
                  CATEGORY_COLORS[slot.category] || ''
                } p-3 space-y-2`}
              >
                <div className="font-medium text-sm">{slot.label}</div>
                <select
                  value={assignments[slot.key] ?? ''}
                  onChange={(e) =>
                    setAssignments((a) => ({
                      ...a,
                      [slot.key]: e.target.value ? parseInt(e.target.value, 10) : null,
                    }))
                  }
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                >
                  <option value="">Unassigned</option>
                  {teamNumbers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Notes..."
                  value={notes[slot.key] || ''}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [slot.key]: e.target.value }))
                  }
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
          >
            Save Plan
          </button>
        </div>
      )}
    </div>
  );
}
