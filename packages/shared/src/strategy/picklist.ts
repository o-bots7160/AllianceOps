import type { StatboticsEPA } from '../types/statbotics.js';
import type { GenericBreakdown } from '../types/game-definition.js';

export interface PicklistSignals {
  epaTotal: number;
  epaAuto: number;
  epaTeleop: number;
  epaEndgame: number;
  eventDelta: number;
  penaltyRisk: number;
}

export interface PicklistTeam {
  teamNumber: number;
  nickname: string;
  compositeScore: number;
  signals: PicklistSignals;
  rank: number;
}

export interface PicklistWeights {
  epaTotal: number;
  epaAuto: number;
  epaTeleop: number;
  epaEndgame: number;
  eventDelta: number;
  penaltyRisk: number;
}

const DEFAULT_WEIGHTS: PicklistWeights = {
  epaTotal: 0.35,
  epaAuto: 0.15,
  epaTeleop: 0.15,
  epaEndgame: 0.15,
  eventDelta: 0.15,
  penaltyRisk: -0.05,
};

interface TeamInput {
  teamNumber: number;
  nickname: string;
  seasonEpa: StatboticsEPA | null;
  eventEpa: StatboticsEPA | null;
  avgBreakdown: GenericBreakdown | null;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function generatePicklist(
  teams: TeamInput[],
  weights: PicklistWeights = DEFAULT_WEIGHTS,
): PicklistTeam[] {
  if (teams.length === 0) return [];

  const signals = teams.map((t) => {
    const epaTotal = t.eventEpa?.total ?? t.seasonEpa?.total ?? 0;
    const epaAuto = t.eventEpa?.auto ?? t.seasonEpa?.auto ?? 0;
    const epaTeleop = t.eventEpa?.teleop ?? t.seasonEpa?.teleop ?? 0;
    const epaEndgame = t.eventEpa?.endgame ?? t.seasonEpa?.endgame ?? 0;

    const eventDelta =
      t.eventEpa && t.seasonEpa
        ? t.eventEpa.total - t.seasonEpa.total
        : 0;

    const penaltyRisk = t.avgBreakdown?.penalty_points ?? 0;

    return {
      teamNumber: t.teamNumber,
      nickname: t.nickname,
      signals: { epaTotal, epaAuto, epaTeleop, epaEndgame, eventDelta, penaltyRisk },
    };
  });

  // Find min/max for normalization
  const mins: PicklistSignals = { ...signals[0].signals };
  const maxs: PicklistSignals = { ...signals[0].signals };
  for (const s of signals) {
    for (const key of Object.keys(mins) as (keyof PicklistSignals)[]) {
      if (s.signals[key] < mins[key]) mins[key] = s.signals[key];
      if (s.signals[key] > maxs[key]) maxs[key] = s.signals[key];
    }
  }

  const scored = signals.map((s) => {
    let compositeScore = 0;
    for (const key of Object.keys(weights) as (keyof PicklistWeights)[]) {
      const norm = normalize(s.signals[key], mins[key], maxs[key]);
      compositeScore += norm * weights[key];
    }

    return {
      teamNumber: s.teamNumber,
      nickname: s.nickname,
      compositeScore,
      signals: s.signals,
      rank: 0,
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  scored.forEach((t, idx) => { t.rank = idx + 1; });

  return scored;
}

export function exportPicklistCSV(teams: PicklistTeam[]): string {
  const header = 'Rank,Team,Name,Score,EPA Total,EPA Auto,EPA Teleop,EPA Endgame,Event Delta,Penalty Risk';
  const rows = teams.map(
    (t) =>
      `${t.rank},${t.teamNumber},"${t.nickname}",${t.compositeScore.toFixed(3)},${t.signals.epaTotal.toFixed(1)},${t.signals.epaAuto.toFixed(1)},${t.signals.epaTeleop.toFixed(1)},${t.signals.epaEndgame.toFixed(1)},${t.signals.eventDelta.toFixed(1)},${t.signals.penaltyRisk.toFixed(1)}`,
  );
  return [header, ...rows].join('\n');
}
