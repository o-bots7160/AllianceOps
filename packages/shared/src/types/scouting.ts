/** Allowed scouting status values */
export type ScoutingStatus = 'not_scouted' | 'in_progress' | 'scouted';

export const SCOUTING_STATUS_OPTIONS: { value: ScoutingStatus; label: string }[] = [
  { value: 'not_scouted', label: 'Not Scouted' },
  { value: 'in_progress', label: 'Scouting In Progress' },
  { value: 'scouted', label: 'Scouted' },
];

/** Full scouting entry for one analyzed team at an event */
export interface ScoutingEntry {
  /** Freeform notes about this team */
  notes: string;
  /** Game-specific scouting data keyed by ScoutingFieldDefinition.key */
  data: Record<string, unknown>;
  /** Workflow status of this scouting entry */
  scoutingStatus: ScoutingStatus;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Display name of the user who last saved */
  updatedByName?: string;
}

/** Lightweight scouting summary for list views */
export interface ScoutingSummary {
  /** The team number being analyzed */
  targetTeamNumber: number;
  /** Whether any scouting data has been captured */
  hasScouting: boolean;
  /** Truncated notes preview */
  notePreview: string;
  /** Game-specific field data (same shape as ScoutingEntry.data) */
  data: Record<string, unknown>;
  /** Workflow status */
  scoutingStatus: ScoutingStatus;
}
