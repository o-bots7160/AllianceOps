import type { GenericBreakdown } from '../types/game-definition.js';
import type { StatboticsEPA } from '../types/statbotics.js';

export interface TeamBriefingData {
  teamNumber: number;
  nickname: string;
  epa: StatboticsEPA | null;
  record: { wins: number; losses: number; ties: number } | null;
  avgBreakdown: GenericBreakdown | null;
  trend: 'improving' | 'declining' | 'stable';
}

export interface WinCondition {
  label: string;
  detail: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface Risk {
  label: string;
  detail: string;
  severity: 'high' | 'medium';
}

export interface MatchBriefing {
  matchKey: string;
  ourAlliance: 'red' | 'blue';
  ourTeams: TeamBriefingData[];
  opponentTeams: TeamBriefingData[];
  winConditions: WinCondition[];
  risks: Risk[];
  predictedWinProb: number | null;
}

function avgEpa(teams: TeamBriefingData[]): StatboticsEPA | null {
  const withEpa = teams.filter((t) => t.epa);
  if (withEpa.length === 0) return null;
  const sum = withEpa.reduce(
    (acc, t) => ({
      total: acc.total + (t.epa?.total ?? 0),
      auto: acc.auto + (t.epa?.auto ?? 0),
      teleop: acc.teleop + (t.epa?.teleop ?? 0),
      endgame: acc.endgame + (t.epa?.endgame ?? 0),
      unitless: acc.unitless + (t.epa?.unitless ?? 0),
    }),
    { total: 0, auto: 0, teleop: 0, endgame: 0, unitless: 0 },
  );
  const n = withEpa.length;
  return {
    total: sum.total / n,
    auto: sum.auto / n,
    teleop: sum.teleop / n,
    endgame: sum.endgame / n,
    unitless: sum.unitless / n,
  };
}

function avgBreakdown(teams: TeamBriefingData[]): GenericBreakdown | null {
  const withBd = teams.filter((t) => t.avgBreakdown);
  if (withBd.length === 0) return null;
  const sum = withBd.reduce(
    (acc, t) => ({
      auto_points: acc.auto_points + (t.avgBreakdown?.auto_points ?? 0),
      teleop_points: acc.teleop_points + (t.avgBreakdown?.teleop_points ?? 0),
      endgame_points: acc.endgame_points + (t.avgBreakdown?.endgame_points ?? 0),
      penalty_points: acc.penalty_points + (t.avgBreakdown?.penalty_points ?? 0),
      misc_points: acc.misc_points + (t.avgBreakdown?.misc_points ?? 0),
    }),
    { auto_points: 0, teleop_points: 0, endgame_points: 0, penalty_points: 0, misc_points: 0 },
  );
  const n = withBd.length;
  return {
    auto_points: sum.auto_points / n,
    teleop_points: sum.teleop_points / n,
    endgame_points: sum.endgame_points / n,
    penalty_points: sum.penalty_points / n,
    misc_points: sum.misc_points / n,
  };
}

export function generateBriefing(
  ourTeams: TeamBriefingData[],
  opponentTeams: TeamBriefingData[],
  matchKey: string,
  ourAlliance: 'red' | 'blue',
  predictedWinProb: number | null,
): MatchBriefing {
  const winConditions: WinCondition[] = [];
  const risks: Risk[] = [];

  const ourEpa = avgEpa(ourTeams);
  const oppEpa = avgEpa(opponentTeams);
  const ourBd = avgBreakdown(ourTeams);
  const oppBd = avgBreakdown(opponentTeams);

  // Auto advantage
  if (ourEpa && oppEpa) {
    const autoDiff = ourEpa.auto - oppEpa.auto;
    if (autoDiff > 3) {
      winConditions.push({
        label: 'Auto Advantage',
        detail: `Our alliance averages +${autoDiff.toFixed(1)} auto EPA over opponents`,
        confidence: autoDiff > 8 ? 'high' : 'medium',
      });
    } else if (autoDiff < -3) {
      risks.push({
        label: 'Auto Deficit',
        detail: `Opponents average +${(-autoDiff).toFixed(1)} auto EPA over us`,
        severity: autoDiff < -8 ? 'high' : 'medium',
      });
    }
  }

  // Teleop advantage
  if (ourEpa && oppEpa) {
    const teleopDiff = ourEpa.teleop - oppEpa.teleop;
    if (teleopDiff > 5) {
      winConditions.push({
        label: 'Teleop Scoring Edge',
        detail: `Our alliance averages +${teleopDiff.toFixed(1)} teleop EPA`,
        confidence: teleopDiff > 12 ? 'high' : 'medium',
      });
    } else if (teleopDiff < -5) {
      risks.push({
        label: 'Teleop Deficit',
        detail: `Opponents average +${(-teleopDiff).toFixed(1)} teleop EPA`,
        severity: teleopDiff < -12 ? 'high' : 'medium',
      });
    }
  }

  // Endgame advantage
  if (ourEpa && oppEpa) {
    const endgameDiff = ourEpa.endgame - oppEpa.endgame;
    if (endgameDiff > 2) {
      winConditions.push({
        label: 'Endgame Edge',
        detail: `Our alliance averages +${endgameDiff.toFixed(1)} endgame EPA`,
        confidence: endgameDiff > 5 ? 'high' : 'medium',
      });
    }
  }

  // Overall EPA advantage
  if (ourEpa && oppEpa) {
    const totalDiff = ourEpa.total - oppEpa.total;
    if (totalDiff > 10) {
      winConditions.push({
        label: 'Overall Strength',
        detail: `Our alliance averages +${totalDiff.toFixed(1)} total EPA — clear favorites`,
        confidence: 'high',
      });
    } else if (totalDiff < -10) {
      risks.push({
        label: 'Underdog Match',
        detail: `Opponents average +${(-totalDiff).toFixed(1)} total EPA — need strong execution`,
        severity: 'high',
      });
    }
  }

  // Penalty risk from breakdown data
  if (ourBd && ourBd.penalty_points > 10) {
    risks.push({
      label: 'Foul Discipline',
      detail: `Our alliance averages ${ourBd.penalty_points.toFixed(0)} penalty points given to opponents`,
      severity: ourBd.penalty_points > 20 ? 'high' : 'medium',
    });
  }

  // Improving team advantage
  const improvingTeams = ourTeams.filter((t) => t.trend === 'improving');
  if (improvingTeams.length >= 2) {
    winConditions.push({
      label: 'Momentum',
      detail: `${improvingTeams.length} of our teams trending upward`,
      confidence: 'medium',
    });
  }

  // Limit to spec
  const finalWinConditions = winConditions.slice(0, 4);
  const finalRisks = risks.slice(0, 2);

  return {
    matchKey,
    ourAlliance,
    ourTeams,
    opponentTeams,
    winConditions: finalWinConditions,
    risks: finalRisks,
    predictedWinProb,
  };
}
