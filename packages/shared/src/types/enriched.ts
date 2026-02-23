import type { TBATeam } from './tba.js';
import type { StatboticsEPA, StatboticsRecord, StatboticsMatchPrediction } from './statbotics.js';
import type { TBAMatch } from './tba.js';

/** TBA team info enriched with Statbotics EPA data */
export interface EnrichedTeam extends TBATeam {
  epa: StatboticsEPA | null;
  eventRecord: StatboticsRecord | null;
  winrate: number | null;
}

/** TBA match enriched with Statbotics prediction data */
export interface EnrichedMatch extends TBAMatch {
  prediction: StatboticsMatchPrediction | null;
}
