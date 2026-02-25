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
  { key: 'HUB_SCORER_1', label: 'Hub Scorer 1', description: 'Primary fuel scorer', category: 'teleop', epaRankKeys: ['teleop_fuel_count'] },
  { key: 'HUB_SCORER_2', label: 'Hub Scorer 2', description: 'Secondary fuel scorer', category: 'teleop', epaRankKeys: ['teleop_fuel_count'] },
  { key: 'TOWER_CLIMBER_1', label: 'Tower Climber 1', description: 'Primary tower climber', category: 'endgame', epaRankKeys: ['tower_climb_points'] },
  { key: 'TOWER_CLIMBER_2', label: 'Tower Climber 2', description: 'Secondary tower climber', category: 'endgame', epaRankKeys: ['tower_climb_points'] },
  { key: 'DEFENSE_ROLE', label: 'Defense', description: 'Defensive play coordinator', category: 'defense' },
  { key: 'FOUL_DISCIPLINE', label: 'Foul Discipline', description: 'Foul avoidance focus', category: 'discipline' },
];

const dutyTemplates: DutyTemplate[] = [
  {
    name: 'safe',
    label: 'Safe',
    description: 'Conservative — reliable hub scoring, one tower climb, no defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Most reliable auto — proven scoring path', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second most reliable auto path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Simple mobility only — avoid alliance path conflicts', strategy: 'skip' },
      HUB_SCORER_1: { hint: 'Best fuel scorer — steady hub cycles, avoid turnovers', strategy: 'strongest' },
      HUB_SCORER_2: { hint: 'Second best fuel scorer — focus on active hub only', strategy: 'strongest' },
      TOWER_CLIMBER_1: { hint: 'Most reliable tower climb — only attempt if consistent', strategy: 'strongest' },
      TOWER_CLIMBER_2: { hint: 'Skip tower climb — park for guaranteed points', strategy: 'skip' },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on scoring', strategy: 'skip' },
      FOUL_DISCIPLINE: { hint: 'All robots — stay clear of opponent loading and tower zones', strategy: 'all' },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — best-fit fuel scoring with light defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto scorer — maximize fuel placement', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second best auto — standard fuel path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Mobility + grab one fuel piece if safe', strategy: 'strongest' },
      HUB_SCORER_1: { hint: 'Best fuel scorer — coordinate hub and supercharge windows', strategy: 'strongest' },
      HUB_SCORER_2: { hint: 'Second best fuel scorer — fill gaps in hub rotation', strategy: 'strongest' },
      TOWER_CLIMBER_1: { hint: 'Best tower climber — aim for Level 2+', strategy: 'strongest' },
      TOWER_CLIMBER_2: { hint: 'Second best climber or Level 1 safe', strategy: 'strongest' },
      DEFENSE_ROLE: { hint: 'Weakest scorer plays light defense during opponent hub shift', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Defender — stay clear of opponent protected zones', strategy: 'all' },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — fastest fuel cycles, Level 3 tower climbs, dedicated defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto — go for max fuel count, contest shared field positions', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Aggressive auto — fast fuel cycling from opening', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Aggressive field positioning — deny opponent auto fuel', strategy: 'strongest' },
      HUB_SCORER_1: { hint: 'Fastest fuel cycles — target supercharged RP, never idle', strategy: 'strongest' },
      HUB_SCORER_2: { hint: 'Aggressive hub scoring + human player coordination for rapid feeds', strategy: 'strongest' },
      TOWER_CLIMBER_1: { hint: 'Level 3 tower climb — go for maximum endgame points', strategy: 'strongest', epaRankKeysOverride: ['tower_climb_points'] },
      TOWER_CLIMBER_2: { hint: 'Level 3 tower climb — both robots attempt max height', strategy: 'strongest', epaRankKeysOverride: ['tower_climb_points'] },
      DEFENSE_ROLE: { hint: 'Dedicated defender — disrupt opponent fuel cycles and hub access', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Accept calculated risk — aggressive positioning near opponent zones', strategy: 'all' },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  { key: 'auto_fuel_count', label: 'Auto Fuel', description: 'Fuel scored in autonomous', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'teleop_fuel_count', label: 'Teleop Fuel', description: 'Fuel scored in teleop', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'total_fuel_count', label: 'Total Fuel', description: 'Total fuel scored', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'hub_points', label: 'Hub Points', description: 'Total points from hub scoring', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'tower_climb_points', label: 'Tower Climb', description: 'Points from tower climbing', renderLocation: 'briefing', higherIsBetter: true },
  { key: 'foul_count', label: 'Fouls', description: 'Number of fouls committed', renderLocation: 'picklist', higherIsBetter: false },
];

const rebuilt2026: GameDefinition = {
  year: 2026,
  gameName: 'REBUILT',

  // TBA field names are best-guess based on conventions; update when real data is available
  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown {
    const autoPoints = num(raw['autoPoints']);
    const teleopPoints = num(raw['teleopPoints']);
    const endgamePoints = num(raw['endgamePoints']) || num(raw['towerClimbPoints']);
    const foulPoints = num(raw['foulPoints']);
    const totalPoints = num(raw['totalPoints']);
    const miscPoints = totalPoints - autoPoints - teleopPoints - endgamePoints - foulPoints;

    return {
      auto_points: autoPoints,
      teleop_points: teleopPoints,
      endgame_points: endgamePoints,
      penalty_points: foulPoints,
      misc_points: miscPoints,
      gameSpecific: {
        auto_fuel_count: num(raw['autoFuelCount']),
        teleop_fuel_count: num(raw['teleopFuelCount']),
        total_fuel_count: num(raw['autoFuelCount']) + num(raw['teleopFuelCount']),
        hub_points: num(raw['hubPoints']) || num(raw['autoHubPoints']) + num(raw['teleopHubPoints']),
        tower_climb_points: num(raw['towerClimbPoints']) || num(raw['endgamePoints']),
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(rebuilt2026);

export default rebuilt2026;
