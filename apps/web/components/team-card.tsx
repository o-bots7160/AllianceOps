'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { GameMetricDefinition, TeamRankAnalysis, ScoutingSummary, ScoutingFieldDefinition } from '@allianceops/shared';
import type { EnrichedTeam } from '../lib/types';
import { EpaBreakdown } from './team-card/epa-breakdown';
import { GameBreakdown } from './team-card/game-breakdown';
import { RankDeltaScale } from './picklist/rank-delta-scale';
import {
  DETERMINATION_LABELS,
  deltaColor,
  DeterminationBadge,
  RankStats,
} from './rank-analysis';

export { DETERMINATION_LABELS, deltaColor };

export function StrengthBar({ value, label }: { value: number; label: string }) {
  const pct = Math.min(Math.max(value / 2, 0), 1) * 100;
  const midpoint = 50;
  const barLeft = value < 1 ? pct : midpoint;
  const barWidth = Math.abs(pct - midpoint);
  const color = value >= 1 ? 'bg-green-500' : 'bg-red-500';

  const diffPct = Math.abs((value - 1) * 100).toFixed(0);
  const aboveBelow = value >= 1 ? 'above' : 'below';
  const tooltip =
    value === 1
      ? `${label} averaged exactly the field average EPA`
      : `${label} averaged ${diffPct}% ${aboveBelow} the field average EPA (${value.toFixed(2)}× field avg)`;

  return (
    <div className="flex items-center gap-2">
      <span className="w-[5.5rem] shrink-0 text-gray-500 dark:text-gray-400">{label}</span>
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
      <span
        className="w-10 shrink-0 text-right font-medium tabular-nums cursor-help"
        title={tooltip}
      >
        {value.toFixed(2)}×
      </span>
    </div>
  );
}

export interface SectionExpandState {
  rank: boolean;
  epa: boolean;
  game: boolean;
  scouting: boolean;
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
  scoutingSummary,
  scoutingFields,
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
  scoutingSummary?: ScoutingSummary | null;
  scoutingFields?: ScoutingFieldDefinition[];
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
  const [localScoutingExpanded, setLocalScoutingExpanded] = useState(false);

  const expanded = sectionState ? sectionState.game : localExpanded;
  const rankExpanded = sectionState ? sectionState.rank : localRankExpanded;
  const epaExpanded = sectionState ? sectionState.epa : localEpaExpanded;
  const scoutingExpanded = sectionState ? sectionState.scouting : localScoutingExpanded;

  const toggleExpanded = () =>
    onSectionToggle ? onSectionToggle('game') : setLocalExpanded((v) => !v);
  const toggleRankExpanded = () =>
    onSectionToggle ? onSectionToggle('rank') : setLocalRankExpanded((v) => !v);
  const toggleEpaExpanded = () =>
    onSectionToggle ? onSectionToggle('epa') : setLocalEpaExpanded((v) => !v);
  const toggleScoutingExpanded = () =>
    onSectionToggle ? onSectionToggle('scouting') : setLocalScoutingExpanded((v) => !v);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col h-full">
      <div className="space-y-5 flex-1">
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
              <RankStats
                tbaRank={data?.tbaRank}
                epaRank={epaRank}
                rankDelta={rankAnalysis.rankDelta}
                className="ml-auto"
              >
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
              </RankStats>
            </button>
            {rankExpanded && (
              <div className="space-y-3 text-xs mt-3">
                {allRankAnalyses && allRankAnalyses.length > 0 ? (
                  <RankDeltaScale
                    analysis={rankAnalysis}
                    allAnalyses={allRankAnalyses}
                    showRankStats={false}
                    alignBadgeToScale
                  />
                ) : (
                  <DeterminationBadge determination={rankAnalysis.determination} />
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

        {/* Scouting section — always shown when scoutingFields provided */}
        {scoutingFields && scoutingFields.length > 0 && (
          <div className="text-xs">
            <button
              type="button"
              onClick={toggleScoutingExpanded}
              className="flex items-center gap-1 w-full text-left"
            >
              <svg
                className={`h-3 w-3 text-gray-400 transition-transform shrink-0 ${scoutingExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-gray-500 dark:text-gray-400">Scouting</span>
            </button>
            {scoutingExpanded && (
              <div className="mt-2 space-y-2 pl-4">
                {scoutingSummary?.hasScouting ? (
                  <>
                    {scoutingSummary.notePreview && (
                      <p className="text-gray-600 dark:text-gray-300 leading-snug italic">
                        &ldquo;{scoutingSummary.notePreview}&rdquo;
                      </p>
                    )}
                    {scoutingSummary.data && (
                      <div className="space-y-1">
                        {scoutingFields
                          .filter((f) => f.showInTeamCard === true)
                          .filter((f) => {
                            const v = scoutingSummary.data[f.key];
                            if (v == null) return false;
                            if (Array.isArray(v)) return v.length > 0;
                            if (typeof v === 'string') return v.length > 0;
                            // Defensive: never render raw objects (e.g. legacy
                            // per-match maps written under an aggregate key).
                            if (typeof v === 'object') return false;
                            return true;
                          })
                          .map((f) => {
                            const v = scoutingSummary.data[f.key];
                            let display: string;
                            if (Array.isArray(v)) {
                              display = (v as string[]).join(', ');
                            } else if (typeof v === 'number') {
                              display = Number.isInteger(v) ? String(v) : v.toFixed(1);
                            } else {
                              display = String(v);
                            }
                            const stacked = f.type === 'text';
                            return (
                              <div
                                key={f.key}
                                className={stacked ? 'flex flex-col' : 'flex gap-1.5'}
                              >
                                <span className="text-gray-500 dark:text-gray-400 shrink-0">
                                  {f.label}:
                                </span>
                                <span className="text-gray-700 dark:text-gray-200 font-medium whitespace-pre-wrap break-words">
                                  {display}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    Scouting has not been completed for this team.
                  </p>
                )}
                <Link
                  href={`/scouting/?team=${num}`}
                  className="mt-1 inline-block text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {scoutingSummary?.hasScouting ? 'View Full Analysis →' : 'Start Scouting →'}
                </Link>
              </div>
            )}
          </div>
        )}

      </div>

      {/* External links footer — pinned to bottom */}
      <div className="flex items-center gap-3 pt-2 mt-5 border-t border-gray-200 dark:border-gray-700 text-xs">
        <a
          href={`https://www.thebluealliance.com/team/${num}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          The Blue Alliance ↗
        </a>
        <a
          href={`https://www.statbotics.io/team/${num}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Statbotics ↗
        </a>
      </div>
    </div>
  );
}
