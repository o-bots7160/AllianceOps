import type { TBAScoreBreakdown } from './tba.js';

/** Generic score breakdown — season-agnostic buckets */
export interface GenericBreakdown {
  auto_points: number;
  teleop_points: number;
  endgame_points: number;
  /** Penalty points received (negative impact on opponent) */
  penalty_points: number;
  misc_points: number;
  /** Season-specific metrics defined by the adapter */
  gameSpecific?: Record<string, number>;
}

/** A duty slot that can be assigned to a team member */
export interface DutySlotDefinition {
  key: string;
  label: string;
  description: string;
  category: 'auto' | 'teleop' | 'endgame' | 'defense' | 'discipline';
}

/** Assignment of a team to a duty slot */
export interface DutyAssignment {
  slotKey: string;
  teamNumber: number;
  notes?: string;
}

/** Named duty template */
export interface DutyTemplate {
  name: 'safe' | 'balanced' | 'aggressive';
  label: string;
  description: string;
  /** Slot key → assignment hint (e.g. "strongest auto scorer") */
  assignments: Record<string, string>;
}

/** A game-specific metric that the adapter defines */
export interface GameMetricDefinition {
  key: string;
  label: string;
  description: string;
  /** Where this metric renders in the UI */
  renderLocation: 'team_card' | 'briefing' | 'picklist' | 'all';
  /** Higher is better? Used for trend arrows */
  higherIsBetter: boolean;
}

/** Per-season game definition adapter */
export interface GameDefinition {
  year: number;
  gameName: string;

  /** Map a TBA score_breakdown into generic buckets */
  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown;

  /** Duty slots available for this game */
  dutySlots: DutySlotDefinition[];

  /** Pre-built duty templates */
  dutyTemplates: DutyTemplate[];

  /** Optional game-specific metrics beyond the generic buckets */
  gameSpecificMetrics?: GameMetricDefinition[];
}
