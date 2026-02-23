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

// Clients
export { TBAClient } from './clients/tba.js';
export { StatboticsClient } from './clients/statbotics.js';

// Adapters
export { getAdapter, registerAdapter } from './adapters/registry.js';

// Strategy
export { generateBriefing } from './strategy/briefing.js';
export type { MatchBriefing, TeamBriefingData, WinCondition, Risk } from './strategy/briefing.js';
export { analyzePath } from './strategy/path.js';
export type { PathAnalysis, PathMatch } from './strategy/path.js';
export { generatePicklist, exportPicklistCSV } from './strategy/picklist.js';
export type { PicklistTeam, PicklistSignals, PicklistWeights } from './strategy/picklist.js';
