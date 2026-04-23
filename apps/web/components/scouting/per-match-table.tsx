'use client';

import { useMemo } from 'react';
import type { ScoutingFieldDefinition } from '@allianceops/shared';
import { matchLabel, sortMatches } from '@/lib/match-utils';

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

export function PerMatchTable({
    fields,
    matches,
    targetTeamNumber,
    data,
    disabled,
    onChange,
}: {
    fields: ScoutingFieldDefinition[];
    matches: TBAMatchLike[];
    targetTeamNumber: number;
    data: Record<string, unknown>;
    disabled: boolean;
    onChange: (fieldKey: string, matchKey: string, value: number | null) => void;
}) {
    const teamKey = `frc${targetTeamNumber}`;

    const rows = useMemo(() => {
        const filtered = matches.filter(
            (m) =>
                m.alliances.red.team_keys.includes(teamKey) ||
                m.alliances.blue.team_keys.includes(teamKey),
        );
        return sortMatches(filtered);
    }, [matches, teamKey]);

    if (fields.length === 0) return null;

    if (rows.length === 0) {
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No matches scheduled for team {targetTeamNumber} yet.
            </p>
        );
    }

    const getCellValue = (fieldKey: string, matchKey: string): number | '' => {
        const raw = data[fieldKey];
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
        const v = (raw as Record<string, unknown>)[matchKey];
        return typeof v === 'number' && Number.isFinite(v) ? v : '';
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-2 py-1.5 text-left font-medium text-gray-700 dark:text-gray-300">
                            Match
                        </th>
                        {fields.map((f) => (
                            <th
                                key={f.key}
                                className="px-2 py-1.5 text-left font-medium text-gray-700 dark:text-gray-300"
                                title={f.description}
                            >
                                {f.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((match) => {
                        const alliance = match.alliances.red.team_keys.includes(teamKey) ? 'red' : 'blue';
                        return (
                            <tr
                                key={match.key}
                                className="border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                            >
                                <td className="px-2 py-1.5 whitespace-nowrap">
                                    <span
                                        className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${alliance === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}
                                        aria-label={alliance}
                                    />
                                    {matchLabel(match)}
                                </td>
                                {fields.map((f) => {
                                    const current = getCellValue(f.key, match.key);
                                    return (
                                        <td key={f.key} className="px-2 py-1.5">
                                            <input
                                                type="number"
                                                value={current}
                                                disabled={disabled}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    onChange(
                                                        f.key,
                                                        match.key,
                                                        raw === '' ? null : Number(raw),
                                                    );
                                                }}
                                                className="w-20 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm disabled:opacity-50"
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
