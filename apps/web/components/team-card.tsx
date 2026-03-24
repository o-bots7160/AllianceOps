'use client';

import { useState } from 'react';
import type { GameMetricDefinition, TeamRankAnalysis } from '@allianceops/shared';
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

const DETERMINATION_LABELS: Record<string, { label: string; color: string }> = {
    accurate: { label: 'Accurate', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    carried: { label: 'Carried by Partners', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
    easy_schedule: { label: 'Easy Schedule', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
    favorable: { label: 'Favorable Outcomes', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
    underrated: { label: 'Underrated', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    tough_schedule: { label: 'Tough Schedule', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    unlucky: { label: 'Unlucky', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
};

function deltaColor(delta: number): string {
    const abs = Math.abs(delta);
    if (abs <= 3) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    if (abs <= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
}

function StrengthBar({ value, label }: { value: number; label: string }) {
    const pct = Math.min(Math.max(value / 2, 0), 1) * 100;
    const midpoint = 50;
    const barLeft = value < 1 ? pct : midpoint;
    const barWidth = Math.abs(pct - midpoint);
    const color = value >= 1 ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className="flex items-center gap-2">
            <span className="w-20 text-gray-500 dark:text-gray-400">{label}</span>
            <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                    className="absolute top-0 h-2 w-px bg-gray-400 dark:bg-gray-500"
                    style={{ left: `${midpoint}%` }}
                />
                <div
                    className={`absolute top-0 h-2 rounded-full ${color}`}
                    style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                />
            </div>
            <span className="w-10 text-right font-medium">{value.toFixed(2)}×</span>
        </div>
    );
}

export function TeamCard({
    teamKey,
    epaMap,
    record,
    epaRank,
    metrics,
    defaultExpanded = false,
    rankAnalysis,
}: {
    teamKey: string;
    epaMap: Map<number, EnrichedTeam>;
    record?: { wins: number; losses: number; ties: number };
    epaRank?: number | null;
    metrics?: GameMetricDefinition[];
    defaultExpanded?: boolean;
    rankAnalysis?: TeamRankAnalysis | null;
}) {
    const num = parseInt(teamKey.replace('frc', ''), 10);
    const data = epaMap.get(num);
    const maxEpa = 40;
    const bd = data?.epa?.breakdown;
    const displayRecord = record ?? data?.eventRecord;
    const hasBreakdown = bd && metrics && metrics.length > 0 && metrics.some((m) => bd[m.key] != null);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [rankExpanded, setRankExpanded] = useState(false);

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

            {/* Metadata: rank, EPA rank, W-L record — collapsible when analysis available */}
            {rankAnalysis ? (
                <div className="space-y-1">
                    <button
                        type="button"
                        onClick={() => setRankExpanded((v) => !v)}
                        className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 w-full text-left"
                    >
                        <svg
                            className={`h-3 w-3 text-gray-400 transition-transform shrink-0 ${rankExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        {data?.tbaRank != null && <span>Rank #{data.tbaRank}</span>}
                        {epaRank != null && <span>EPA #{epaRank}</span>}
                        {rankAnalysis.rankDelta !== 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${deltaColor(rankAnalysis.rankDelta)}`}>
                                Δ{rankAnalysis.rankDelta > 0 ? '+' : ''}{rankAnalysis.rankDelta}
                            </span>
                        )}
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
                    </button>
                    {rankExpanded && (
                        <div className="ml-5 space-y-2 text-xs border-l-2 border-gray-200 dark:border-gray-700 pl-3 mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${DETERMINATION_LABELS[rankAnalysis.determination]?.color}`}>
                                {DETERMINATION_LABELS[rankAnalysis.determination]?.label}
                            </span>
                            <div className="space-y-1">
                                <StrengthBar value={rankAnalysis.partnerStrength} label="Partners" />
                                <StrengthBar value={rankAnalysis.opponentStrength} label="Opponents" />
                            </div>
                            {(rankAnalysis.strongPartnerRecord.wins + rankAnalysis.strongPartnerRecord.losses > 0 ||
                                rankAnalysis.weakPartnerRecord.wins + rankAnalysis.weakPartnerRecord.losses > 0) && (
                                    <div className="flex gap-3 text-gray-500 dark:text-gray-400">
                                        <span>
                                            Strong partners:{' '}
                                            <span className="font-medium text-gray-700 dark:text-gray-200">
                                                {rankAnalysis.strongPartnerRecord.wins}-{rankAnalysis.strongPartnerRecord.losses}
                                            </span>
                                        </span>
                                        <span>
                                            Weak partners:{' '}
                                            <span className="font-medium text-gray-700 dark:text-gray-200">
                                                {rankAnalysis.weakPartnerRecord.wins}-{rankAnalysis.weakPartnerRecord.losses}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            <p className="text-gray-500 dark:text-gray-400 leading-snug">
                                {rankAnalysis.explanation}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
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
            )}

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
