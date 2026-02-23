// Types
export type { TBAEvent, TBAMatch, TBATeam, TBARanking, TBAScoreBreakdown } from './types/tba.js';
export type {
  StatboticsTeamYear,
  StatboticsTeamEvent,
  StatboticsMatch,
} from './types/statbotics.js';
export type {
  GameDefinition,
  GenericBreakdown,
  DutySlotDefinition,
  DutyAssignment,
  DutyTemplate,
  GameMetricDefinition,
} from './types/game-definition.js';

// Adapters
export { getAdapter, registerAdapter } from './adapters/registry.js';
