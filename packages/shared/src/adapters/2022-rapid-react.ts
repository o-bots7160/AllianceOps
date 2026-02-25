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
  { key: 'UPPER_HUB_SCORER', label: 'Upper Hub Scorer', description: 'Primary upper hub cargo scorer', category: 'teleop', epaRankKeys: ['teleop_cargo_upper'] },
  { key: 'LOWER_HUB_SCORER', label: 'Lower Hub Scorer', description: 'Lower hub cargo scorer', category: 'teleop', epaRankKeys: ['teleop_cargo_lower'] },
  { key: 'HANGAR_CLIMBER_1', label: 'Hangar Climber 1', description: 'Primary hangar climber', category: 'endgame', epaRankKeys: ['endgame_points'] },
  { key: 'HANGAR_CLIMBER_2', label: 'Hangar Climber 2', description: 'Secondary hangar climber', category: 'endgame', epaRankKeys: ['endgame_points'] },
  { key: 'DEFENSE_ROLE', label: 'Defense', description: 'Defensive play coordinator', category: 'defense' },
  { key: 'FOUL_DISCIPLINE', label: 'Foul Discipline', description: 'Foul avoidance focus', category: 'discipline' },
];

const dutyTemplates: DutyTemplate[] = [
  {
    name: 'safe',
    label: 'Safe',
    description: 'Conservative — lower hub cargo, one reliable hangar climb, no defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Most reliable auto — taxi + consistent cargo placement', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second most reliable auto path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Taxi only — stay out of alliance paths', strategy: 'skip' },
      UPPER_HUB_SCORER: { hint: 'Best cargo scorer — focus on upper hub for points', strategy: 'strongest', epaRankKeysOverride: ['teleop_cargo_upper'] },
      LOWER_HUB_SCORER: { hint: 'Steady lower hub scoring — reliable and fast cycles', strategy: 'strongest', epaRankKeysOverride: ['teleop_cargo_lower'] },
      HANGAR_CLIMBER_1: { hint: 'Most reliable hangar climb — attempt Mid or High if consistent', strategy: 'strongest' },
      HANGAR_CLIMBER_2: { hint: 'Low rung or park — skip risky high climbs', strategy: 'skip' },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on cargo scoring', strategy: 'skip' },
      FOUL_DISCIPLINE: { hint: 'All robots — stay clear of opponent loading zones and launchpad', strategy: 'all' },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — upper hub focus, two hangar climbs, light defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto scorer — taxi + 2 cargo shots', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second best auto — standard cargo path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Taxi + attempt one cargo shot if clean', strategy: 'strongest' },
      UPPER_HUB_SCORER: { hint: 'Best cargo scorer — prioritize upper hub cycles', strategy: 'strongest', epaRankKeysOverride: ['teleop_cargo_upper'] },
      LOWER_HUB_SCORER: { hint: 'Support scorer — mix of upper/lower based on traffic', strategy: 'strongest' },
      HANGAR_CLIMBER_1: { hint: 'Best climber — attempt High or Traversal rung', strategy: 'strongest' },
      HANGAR_CLIMBER_2: { hint: 'Second climber — Mid rung or Low rung', strategy: 'strongest' },
      DEFENSE_ROLE: { hint: 'Weakest scorer plays light defense — disrupt opponent cargo cycles', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Defender stays clear of launchpad and terminal', strategy: 'all' },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — upper hub quintet, Traversal climbs, active defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto — 2 cargo + quintet setup for hangar RP', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Aggressive auto — push for 5-cargo quintet achievement', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Aggressive — contest terminal cargo and quintet count', strategy: 'strongest' },
      UPPER_HUB_SCORER: { hint: 'Fastest upper hub cycles — push for cargo RP threshold', strategy: 'strongest', epaRankKeysOverride: ['teleop_cargo_upper'] },
      LOWER_HUB_SCORER: { hint: 'Aggressive upper scoring as well — maximize match cargo total', strategy: 'strongest', epaRankKeysOverride: ['teleop_cargo_upper', 'teleop_cargo_lower'] },
      HANGAR_CLIMBER_1: { hint: 'Traversal rung — go for maximum hangar points', strategy: 'strongest', epaRankKeysOverride: ['endgame_points'] },
      HANGAR_CLIMBER_2: { hint: 'Traversal or High rung — both robots attempt high climb', strategy: 'strongest', epaRankKeysOverride: ['endgame_points'] },
      DEFENSE_ROLE: { hint: 'Dedicated defender — disrupt opponent cargo cycles and terminal access', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Accept calculated risk — aggressive positioning near opponent cargo lanes', strategy: 'all' },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  { key: 'auto_cargo', label: 'Auto Cargo', description: 'Cargo scored in autonomous', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'teleop_cargo_upper', label: 'Upper Hub', description: 'Cargo scored in upper hub', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'teleop_cargo_lower', label: 'Lower Hub', description: 'Cargo scored in lower hub', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'teleop_cargo_total', label: 'Teleop Cargo', description: 'Total cargo scored in teleop', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'match_cargo_total', label: 'Total Cargo', description: 'Total cargo scored all periods', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'foul_count', label: 'Fouls', description: 'Number of fouls committed', renderLocation: 'picklist', higherIsBetter: false },
];

const rapidReact2022: GameDefinition = {
  year: 2022,
  gameName: 'Rapid React',

  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown {
    const autoPoints = num(raw['autoPoints']);
    const teleopPoints = num(raw['teleopCargoPoints']);
    const endgamePoints = num(raw['endgamePoints']);
    const foulPoints = num(raw['foulPoints']);
    const totalPoints = num(raw['totalPoints']);
    const miscPoints = totalPoints - autoPoints - teleopPoints - endgamePoints - foulPoints;

    const autoCargoUpper =
      num(raw['autoCargoUpperNear']) +
      num(raw['autoCargoUpperFar']) +
      num(raw['autoCargoUpperBlue']) +
      num(raw['autoCargoUpperRed']);
    const autoCargoLower =
      num(raw['autoCargoLowerNear']) +
      num(raw['autoCargoLowerFar']) +
      num(raw['autoCargoLowerBlue']) +
      num(raw['autoCargoLowerRed']);
    const teleopCargoUpper =
      num(raw['teleopCargoUpperNear']) +
      num(raw['teleopCargoUpperFar']) +
      num(raw['teleopCargoUpperBlue']) +
      num(raw['teleopCargoUpperRed']);
    const teleopCargoLower =
      num(raw['teleopCargoLowerNear']) +
      num(raw['teleopCargoLowerFar']) +
      num(raw['teleopCargoLowerBlue']) +
      num(raw['teleopCargoLowerRed']);

    return {
      auto_points: autoPoints,
      teleop_points: teleopPoints,
      endgame_points: endgamePoints,
      penalty_points: foulPoints,
      misc_points: miscPoints,
      gameSpecific: {
        auto_cargo: autoCargoUpper + autoCargoLower || num(raw['autoCargoTotal']),
        teleop_cargo_upper: teleopCargoUpper,
        teleop_cargo_lower: teleopCargoLower,
        teleop_cargo_total: num(raw['teleopCargoTotal']),
        match_cargo_total: num(raw['matchCargoTotal']),
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(rapidReact2022);

export default rapidReact2022;
