import type {
  GameDefinition,
  GenericBreakdown,
  DutySlotDefinition,
  DutyTemplate,
  GameMetricDefinition,
} from '../types/game-definition.js';
import type { TBAScoreBreakdown } from '../types/tba.js';
import { registerAdapter } from './registry.js';

function num(val: unknown): number {
  return typeof val === 'number' ? val : 0;
}

const dutySlots: DutySlotDefinition[] = [
  { key: 'AUTO_ROLE_1', label: 'Auto Role 1', description: 'Primary autonomous scorer', category: 'auto', epaRankKeys: ['auto_points'] },
  { key: 'AUTO_ROLE_2', label: 'Auto Role 2', description: 'Secondary autonomous scorer', category: 'auto', epaRankKeys: ['auto_points'] },
  { key: 'AUTO_ROLE_3', label: 'Auto Role 3', description: 'Tertiary autonomous role', category: 'auto', epaRankKeys: ['auto_points'] },
  { key: 'BOULDER_SHOOTER', label: 'Boulder Shooter', description: 'Primary boulder high goal shooter', category: 'teleop', epaRankKeys: ['teleop_boulder_points'] },
  { key: 'DEFENSE_CROSSER', label: 'Defense Crosser', description: 'Defense crossing specialist', category: 'teleop', epaRankKeys: ['teleop_points'] },
  { key: 'TOWER_SCALER_1', label: 'Tower Scaler 1', description: 'Primary tower challenge/scale robot', category: 'endgame', epaRankKeys: ['teleop_points'] },
  { key: 'TOWER_SCALER_2', label: 'Tower Scaler 2', description: 'Secondary tower challenge/scale robot', category: 'endgame', epaRankKeys: ['teleop_points'] },
  { key: 'DEFENSE_ROLE', label: 'Defense', description: 'Defensive play coordinator', category: 'defense' },
  { key: 'FOUL_DISCIPLINE', label: 'Foul Discipline', description: 'Foul avoidance focus', category: 'discipline' },
];

const dutyTemplates: DutyTemplate[] = [
  {
    name: 'safe',
    label: 'Safe',
    description: 'Conservative — low goal boulders, defense breach, one tower challenge, no defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Most reliable auto — reach + cross one defense + boulder', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second most reliable auto path — reach or cross', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Reach only — stay out of alliance paths', strategy: 'skip' },
      BOULDER_SHOOTER: { hint: 'Best shooter — low goal for consistent points', strategy: 'strongest', epaRankKeysOverride: ['teleop_boulder_points'] },
      DEFENSE_CROSSER: { hint: 'Reliable defense crosser — complete breach for RP', strategy: 'strongest' },
      TOWER_SCALER_1: { hint: 'Most reliable tower robot — attempt challenge or scale', strategy: 'strongest' },
      TOWER_SCALER_2: { hint: 'Skip tower — focus on boulders instead', strategy: 'skip' },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on scoring', strategy: 'skip' },
      FOUL_DISCIPLINE: { hint: 'All robots — stay clear of opponent secret passage and courtyard', strategy: 'all' },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — high goal shooting, breach attempt, two tower challenges, light defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto scorer — cross + high boulder shot', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second best auto — cross one defense', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Cross + collect and deliver boulder', strategy: 'strongest' },
      BOULDER_SHOOTER: { hint: 'Best shooter — high goal cycles for capture RP', strategy: 'strongest', epaRankKeysOverride: ['teleop_boulder_points'] },
      DEFENSE_CROSSER: { hint: 'Fast crosser — 2 crossings per defense for breach RP', strategy: 'strongest' },
      TOWER_SCALER_1: { hint: 'Best tower robot — attempt scale for full endgame points', strategy: 'strongest' },
      TOWER_SCALER_2: { hint: 'Second tower robot — challenge at minimum', strategy: 'strongest' },
      DEFENSE_ROLE: { hint: 'Weakest scorer plays light defense — block opponent key defense crossings', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Defender stays clear of opponent courtyard and secret passage', strategy: 'all' },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — high goal focus, full breach RP, tower scale + capture, active defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto — cross + 3 high goal shots, set up breach count', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Aggressive auto — cross a defense and deliver boulder', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Aggressive auto — reach + cross, deny opponent defenses', strategy: 'strongest' },
      BOULDER_SHOOTER: { hint: 'High goal specialist — push for capture RP with rapid boulder cycling', strategy: 'strongest', epaRankKeysOverride: ['teleop_boulder_points'] },
      DEFENSE_CROSSER: { hint: 'Breach specialist — ensure 8 defense crossings for breach RP', strategy: 'strongest' },
      TOWER_SCALER_1: { hint: 'Tower scale — maximum endgame + capture RP setup', strategy: 'strongest' },
      TOWER_SCALER_2: { hint: 'Tower scale or challenge — both robots at tower for capture attempt', strategy: 'strongest' },
      DEFENSE_ROLE: { hint: 'Dedicated defender — deny opponent breach and tower access', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Accept calculated risk — aggressive positioning near opponent low bar and courtyard', strategy: 'all' },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  { key: 'auto_boulder_points', label: 'Auto Boulders', description: 'Points from boulders in autonomous', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'teleop_boulder_points', label: 'Teleop Boulders', description: 'Points from boulders in teleop', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'boulder_high', label: 'High Goal', description: 'Boulders scored in high goal', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'boulder_low', label: 'Low Goal', description: 'Boulders scored in low goal', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'crossing_points', label: 'Crossing', description: 'Points from defense crossings', renderLocation: 'briefing', higherIsBetter: true },
  { key: 'foul_count', label: 'Fouls', description: 'Number of fouls committed', renderLocation: 'picklist', higherIsBetter: false },
];

const stronghold2016: GameDefinition = {
  year: 2016,
  gameName: 'FIRST Stronghold',

  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown {
    const autoPoints = num(raw['autoPoints']);
    const teleopCrossingPoints = num(raw['teleopCrossingPoints']);
    const teleopBoulderPoints = num(raw['teleopBoulderPoints']);
    const teleopChallengePoints = num(raw['teleopChallengePoints']);
    const teleopScalePoints = num(raw['teleopScalePoints']);
    const breachPoints = num(raw['breachPoints']);
    const capturePoints = num(raw['capturePoints']);
    const teleopPoints = num(raw['teleopPoints']) ||
      teleopCrossingPoints + teleopBoulderPoints + teleopChallengePoints + teleopScalePoints;
    const endgamePoints = teleopChallengePoints + teleopScalePoints;
    const foulPoints = num(raw['foulPoints']);
    const totalPoints = num(raw['totalPoints']);
    const miscPoints = totalPoints - autoPoints - teleopPoints - breachPoints - capturePoints - foulPoints;

    return {
      auto_points: autoPoints,
      teleop_points: teleopPoints,
      endgame_points: endgamePoints,
      penalty_points: foulPoints,
      misc_points: miscPoints < 0 ? 0 : miscPoints,
      gameSpecific: {
        auto_boulder_points: num(raw['autoBoulderPoints']),
        teleop_boulder_points: teleopBoulderPoints,
        boulder_high: num(raw['autoBouldersHigh']) + num(raw['teleopBouldersHigh']),
        boulder_low: num(raw['autoBouldersLow']) + num(raw['teleopBouldersLow']),
        crossing_points: num(raw['autoCrossingPoints']) + teleopCrossingPoints,
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(stronghold2016);

export default stronghold2016;
