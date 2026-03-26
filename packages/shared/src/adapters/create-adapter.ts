import type {
  GameDefinition,
  GenericBreakdown,
  DutySlotDefinition,
  DutyTemplate,
  GameMetricDefinition,
} from '../types/game-definition.js';
import type { TBAScoreBreakdown } from '../types/tba.js';
import { registerAdapter } from './registry.js';

/**
 * Safely extract a numeric value from a TBA score breakdown field.
 * Returns 0 for non-numeric values.
 */
export function num(val: unknown): number {
  return typeof val === 'number' ? val : 0;
}

/** Configuration for the adapter factory — all season-specific data */
export interface CreateAdapterConfig {
  year: number;
  gameName: string;
  dutySlots: DutySlotDefinition[];
  dutyTemplates: DutyTemplate[];
  gameSpecificMetrics?: GameMetricDefinition[];
  mapScoreBreakdown: (raw: TBAScoreBreakdown) => GenericBreakdown;
}

/**
 * Create a GameDefinition adapter and automatically register it.
 * Reduces boilerplate in per-season adapter files.
 */
export function createAdapter(config: CreateAdapterConfig): GameDefinition {
  const adapter: GameDefinition = {
    year: config.year,
    gameName: config.gameName,
    mapScoreBreakdown: config.mapScoreBreakdown,
    dutySlots: config.dutySlots,
    dutyTemplates: config.dutyTemplates,
    ...(config.gameSpecificMetrics && { gameSpecificMetrics: config.gameSpecificMetrics }),
  };
  registerAdapter(adapter);
  return adapter;
}
