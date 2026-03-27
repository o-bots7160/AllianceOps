'use client';

import { useState } from 'react';
import type { GameMetricDefinition, TeamRankAnalysis } from '@allianceops/shared';
import type { EnrichedTeam } from '../lib/types';
import { EpaBreakdown } from './team-card/epa-breakdown';
import { GameBreakdown } from './team-card/game-breakdown';
import { RankDeltaScale } from './picklist/rank-delta-scale';

export const DETERMINATION_LABELS: Record<string, { label: string; color: string }> = {
  accurate: {
    label: 'Accurate',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  carried: {
    label: 'Carried by Partners',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  },
  easy_schedule: {
    label: 'Easy Schedule',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  },
  favorable: {
    label: 'Favorable Outcomes',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  },
  underrated: {
    label: 'Underrated',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  tough_schedule: {
    label: 'Tough Schedule',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  unlucky: {
    label: 'Unlucky',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
};

export function deltaColor(delta: number): string {
  const abs = Math.abs(delta);
  if (abs <= 3) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  if (abs <= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
}

export function StrengthBar({ value, label }: { value: number; label: string }) {
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

export interface SectionExpandState {
  rank: boolean;
  epa: boolean;
  game: boolean;
}

export function TeamCard({
  teamKey,
  epaMap,
  record,
  epaRank,
  metrics,
  defaultExpanded = false,
  rankAnalysis,
  allRankAnalyses,
  sectionState,
  onSectionToggle,
}: {
  teamKey: string;
  epaMap: Map<number, EnrichedTeam>;
  record?: { wins: number; losses: number; ties: number };
  epaRank?: number | null;
  metrics?: GameMetricDefinition[];
  defaultExpanded?: boolean;
  rankAnalysis?: TeamRankAnalysis | null;
  allRankAnalyses?: TeamRankAnalysis[];
  sectionState?: SectionExpandState;
  onSectionToggle?: (section: keyof SectionExpandState) => void;
}) {
  const num = parseInt(teamKey.replace('frc', ''), 10);
  const data = epaMap.get(num);
  const bd = data?.epa?.breakdown;
  const displayRecord = record ?? data?.eventRecord;
  const hasBreakdown =
    bd && metrics && metrics.length > 0 && metrics.some((m) => bd[m.key] != null);

  // Support both controlled (sectionState/onSectionToggle) and uncontrolled modes
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const [localRankExpanded, setLocalRankExpanded] = useState(defaultExpanded);
  const [localEpaExpanded, setLocalEpaExpanded] = useState(defaultExpanded);

  const expanded = sectionState ? sectionState.game : localExpanded;
  const rankExpanded = sectionState ? sectionState.rank : localRankExpanded;
  const epaExpanded = sectionState ? sectionState.epa : localEpaExpanded;

  const toggleExpanded = () =>
    onSectionToggle ? onSectionToggle('game') : setLocalExpanded((v) => !v);
  const toggleRankExpanded = () =>
    onSectionToggle ? onSectionToggle('rank') : setLocalRankExpanded((v) => !v);
  const toggleEpaExpanded = () =>
    onSectionToggle ? onSectionToggle('epa') : setLocalEpaExpanded((v) => !v);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-5">
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
        <div className="text-xs">
          <button
            type="button"
            onClick={toggleRankExpanded}
            className="flex items-center gap-1 w-full text-left"
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
            <span className="font-medium text-gray-500 dark:text-gray-400">Rank Analysis</span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="text-gray-400 dark:text-gray-500">
                {data?.tbaRank != null && <>#{data.tbaRank}</>}
                {epaRank != null && <> · EPA #{epaRank}</>}
              </span>
              {rankAnalysis.rankDelta !== 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${deltaColor(rankAnalysis.rankDelta)}`}
                >
                  Δ{rankAnalysis.rankDelta > 0 ? '+' : ''}
                  {rankAnalysis.rankDelta}
                </span>
              )}
              {displayRecord && (
                <span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {displayRecord.wins}W
                  </span>{' '}
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
            </span>
          </button>
          {rankExpanded && (
            <div className="space-y-2 text-xs mt-2">
              {allRankAnalyses && allRankAnalyses.length > 0 ? (
                <RankDeltaScale
                  analysis={rankAnalysis}
                  allAnalyses={allRankAnalyses}
                />
              ) : (
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${DETERMINATION_LABELS[rankAnalysis.determination]?.color}`}
                >
                  {DETERMINATION_LABELS[rankAnalysis.determination]?.label}
                </span>
              )}
              <div className="space-y-1">
                <StrengthBar value={rankAnalysis.partnerStrength} label="Partners" />
                <StrengthBar value={rankAnalysis.opponentStrength} label="Opponents" />
              </div>
              {(rankAnalysis.strongPartnerRecord.wins + rankAnalysis.strongPartnerRecord.losses >
                0 ||
                rankAnalysis.weakPartnerRecord.wins + rankAnalysis.weakPartnerRecord.losses >
                  0) && (
                <div className="flex gap-3 text-gray-500 dark:text-gray-400">
                  <span>
                    Strong partners:{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {rankAnalysis.strongPartnerRecord.wins}-
                      {rankAnalysis.strongPartnerRecord.losses}
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
              </span>{' '}
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

      {/* EPA + Game Breakdowns */}
      {data?.epa?.total != null ? (
        <>
          <EpaBreakdown
            total={data.epa.total}
            auto={data.epa.auto ?? null}
            teleop={data.epa.teleop ?? null}
            endgame={data.epa.endgame ?? null}
            expanded={epaExpanded}
            onToggle={toggleEpaExpanded}
          />
          {hasBreakdown && (
            <GameBreakdown
              metrics={metrics!}
              breakdown={bd!}
              expanded={expanded}
              onToggle={toggleExpanded}
            />
          )}
        </>
      ) : (
        <p className="text-xs text-gray-400">No EPA data</p>
      )}
    </div>
  );
}
