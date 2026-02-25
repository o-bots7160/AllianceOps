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
  DutyTemplateSlot,
  GameMetricDefinition,
} from './types/game-definition.js';

// Clients
export { TBAClient } from './clients/tba.js';
export { StatboticsClient } from './clients/statbotics.js';

// Adapters (side-effect imports register each adapter)
import './adapters/2016-stronghold.js';
import './adapters/2017-steamworks.js';
import './adapters/2018-power-up.js';
import './adapters/2019-deep-space.js';
import './adapters/2020-infinite-recharge.js';
import './adapters/2021-infinite-recharge.js';
import './adapters/2022-rapid-react.js';
import './adapters/2023-charged-up.js';
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
export type { AuthUser, UserRole, AuthProvider, SWAAuthProviderOptions } from './auth/index.js';
export { SWAAuthProvider, setAuthProvider, getAuthProvider } from './auth/index.js';
