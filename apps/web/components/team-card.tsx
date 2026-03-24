'use client';

import { useState } from 'react';
import type { GameMetricDefinition } from '@allianceops/shared';
import type { EnrichedTeam } from '../lib/types';

function EpaBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

const METRIC_COLOR = 'bg-cyan-500';

export function TeamCard({
    teamKey,
    epaMap,
    record,
    epaRank,
    metrics,
    defaultExpanded = false,
}: {
    teamKey: string;
    epaMap: Map<number, EnrichedTeam>;
    record?: { wins: number; losses: number; ties: number };
    epaRank?: number | null;
    metrics?: GameMetricDefinition[];
    defaultExpanded?: boolean;
}) {
    const num = parseInt(teamKey.replace('frc', ''), 10);
    const data = epaMap.get(num);
    const maxEpa = 40;
    const bd = data?.epa?.breakdown;
    const displayRecord = record ?? data?.eventRecord;
    const hasBreakdown = bd && metrics && metrics.length > 0 && metrics.some((m) => bd[m.key] != null);
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
            {/* Header: team number + nickname */}
            <div className="flex justify-between items-center">
                <span className="font-bold text-lg">{num}</span>
                {data?.nickname && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate ml-2">
                        {data.nickname}
                    </span>
                )}
            </div>

            {/* Metadata: rank, EPA rank, W-L record */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {data?.tbaRank != null && <span>Rank #{data.tbaRank}</span>}
                {epaRank != null && <span>EPA #{epaRank}</span>}
                {displayRecord && (
                    <span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                            {displayRecord.wins}W
                        </span>
                        {' '}
                        <span className="text-red-600 dark:text-red-400 font-medium">
                            {displayRecord.losses}L
                        </span>
                        {displayRecord.ties > 0 && (
                            <>
                                {' '}
                                <span className="font-medium">{displayRecord.ties}T</span>
                            </>
                        )}
                        {!record && data?.winrate != null && (
                            <span className="text-gray-500"> ({(data.winrate * 100).toFixed(0)}%)</span>
                        )}
                    </span>
                )}
            </div>

            {/* EPA bars */}
            {data?.epa?.total != null ? (
                <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-16">Total</span>
                        <EpaBar value={data.epa.total} max={maxEpa} color="bg-primary-500" />
                        <span className="w-8 text-right">{data.epa.total.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-16">Auto</span>
                        <EpaBar value={data.epa.auto ?? 0} max={maxEpa / 2} color="bg-green-500" />
                        <span className="w-8 text-right">{(data.epa.auto ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-16">Teleop</span>
                        <EpaBar value={data.epa.teleop ?? 0} max={maxEpa / 2} color="bg-blue-500" />
                        <span className="w-8 text-right">{(data.epa.teleop ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-16">Endgame</span>
                        <EpaBar value={data.epa.endgame ?? 0} max={maxEpa / 3} color="bg-purple-500" />
                        <span className="w-8 text-right">{(data.epa.endgame ?? 0).toFixed(1)}</span>
                    </div>

                    {/* Game Breakdown — collapsible */}
                    {hasBreakdown && (
                        <>
                            <button
                                type="button"
                                onClick={() => setExpanded((v) => !v)}
                                className="flex items-center gap-1 border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 w-full text-left"
                            >
                                <svg
                                    className={`h-3 w-3 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Game Breakdown</span>
                            </button>
                            {expanded &&
                                metrics!.map(
                                    (m) =>
                                        bd![m.key] != null && (
                                            <div key={m.key} className="flex items-center gap-2">
                                                <span className="w-16 truncate" title={m.description}>
                                                    {m.label}
                                                </span>
                                                <EpaBar value={Math.abs(bd![m.key])} max={6} color={METRIC_COLOR} />
                                                <span className="w-8 text-right">{bd![m.key].toFixed(1)}</span>
                                            </div>
                                        ),
                                )}
                        </>
                    )}
                </div>
            ) : (
                <p className="text-xs text-gray-400">No EPA data</p>
            )}
        </div>
    );
}
