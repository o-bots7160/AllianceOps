/** Full scouting entry for one analyzed team at an event */
export interface ScoutingEntry {
  /** Freeform notes about this team */
  notes: string;
  /** Game-specific scouting data keyed by ScoutingFieldDefinition.key */
  data: Record<string, unknown>;
  /** ISO timestamp of last update */
  updatedAt: string;
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
}
