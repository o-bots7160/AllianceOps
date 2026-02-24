// Types
export type { TBAEvent, TBAMatch, TBATeam, TBARanking, TBAScoreBreakdown } from './types/tba.js';
export type {
  StatboticsTeamYear,
  StatboticsTeamEvent,
  StatboticsMatch,
  StatboticsEPA,
  StatboticsRecord,
  StatboticsMatchPrediction,
  StatboticsTeamSiteEvent,
} from './types/statbotics.js';
export type { EnrichedTeam, EnrichedMatch } from './types/enriched.js';
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

// Adapters (side-effect imports register each adapter)
import './adapters/2024-crescendo.js';
import './adapters/2025-reefscape.js';
import './adapters/2026-rebuilt.js';
export { getAdapter, registerAdapter, getAvailableYears } from './adapters/registry.js';

// Strategy
export { generateBriefing } from './strategy/briefing.js';
export type { MatchBriefing, TeamBriefingData, WinCondition, Risk } from './strategy/briefing.js';
export { analyzePath } from './strategy/path.js';
export type { PathAnalysis, PathMatch } from './strategy/path.js';
export { generatePicklist, exportPicklistCSV } from './strategy/picklist.js';
export type { PicklistTeam, PicklistSignals, PicklistWeights } from './strategy/picklist.js';

// Auth
export type { AuthUser, UserRole, AuthProvider } from './auth/index.js';
export { SWAAuthProvider, setAuthProvider, getAuthProvider } from './auth/index.js';
