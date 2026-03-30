// Types
export type {
  TBAEvent,
  TBAMatch,
  TBATeam,
  TBARanking,
  TBARankingEntry,
  TBAScoreBreakdown,
} from './types/tba.js';
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
  DutyTemplateSlot,
  GameMetricDefinition,
  ScoutingFieldDefinition,
} from './types/game-definition.js';
export type { ScoutingEntry, ScoutingSummary } from './types/scouting.js';
export type {
  AdminStats,
  AdminUserListItem,
  AdminUserListResponse,
  AdminUserTeam,
} from './types/admin.js';

// Clients
export { TBAClient } from './clients/tba.js';
export { StatboticsClient } from './clients/statbotics.js';

// Adapters — single init import registers all game-definition adapters
import './adapters/init.js';
export {
  getAdapter,
  registerAdapter,
  getAvailableYears,
  initAdapters,
} from './adapters/registry.js';
export { createAdapter, num } from './adapters/create-adapter.js';
export type { CreateAdapterConfig } from './adapters/create-adapter.js';

// Strategy
export { generateBriefing } from './strategy/briefing.js';
export type { MatchBriefing, TeamBriefingData, WinCondition, Risk } from './strategy/briefing.js';
export { analyzePath } from './strategy/path.js';
export type { PathAnalysis, PathMatch } from './strategy/path.js';
export { generatePicklist } from './strategy/picklist.js';
export type { PicklistTeam, PicklistSignals, PicklistWeights } from './strategy/picklist.js';
export { analyzeRankDiscrepancy, analyzeAllRankDiscrepancies } from './strategy/rank-analysis.js';
export type { TeamRankAnalysis, RankDetermination } from './strategy/rank-analysis.js';
export { computeAllianceStrength, computeFieldAvgEpa } from './strategy/analysis-utils.js';

// Auth
export type { AuthUser, UserRole, AuthProvider, SWAAuthProviderOptions } from './auth/index.js';
export { SWAAuthProvider, setAuthProvider, getAuthProvider } from './auth/index.js';
