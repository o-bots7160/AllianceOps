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
    description: 'Conservative plan — maximize reliable points, avoid penalties',
    assignments: {
      AUTO_ROLE_1: 'Most reliable auto scorer',
      AUTO_ROLE_2: 'Second most reliable auto scorer',
      AUTO_ROLE_3: 'Stay out of the way / simple auto',
      HUB_SCORER_1: 'Best fuel scorer — focus on active hub',
      HUB_SCORER_2: 'Second best fuel scorer',
      TOWER_CLIMBER_1: 'Most reliable tower climber',
      TOWER_CLIMBER_2: 'Second most reliable tower climber',
      DEFENSE_ROLE: 'No defense — focus on scoring',
      FOUL_DISCIPLINE: 'All robots — avoid contact fouls',
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Mix of offense and light defense',
    assignments: {
      AUTO_ROLE_1: 'Best auto scorer',
      AUTO_ROLE_2: 'Second best auto scorer',
      AUTO_ROLE_3: 'Mobility + simple score',
      HUB_SCORER_1: 'Best fuel scorer',
      HUB_SCORER_2: 'Second best fuel scorer',
      TOWER_CLIMBER_1: 'Best climber — aim for Level 3',
      TOWER_CLIMBER_2: 'Second best climber or Level 1 safe',
      DEFENSE_ROLE: 'Weakest scorer plays light defense during opponent hub shift',
      FOUL_DISCIPLINE: 'Defender — stay clear of protected zones',
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Maximum scoring + active defense',
    assignments: {
      AUTO_ROLE_1: 'Best auto scorer — go for max fuel',
      AUTO_ROLE_2: 'Second best — aggressive fuel cycling',
      AUTO_ROLE_3: 'Aggressive positioning',
      HUB_SCORER_1: 'Fastest fuel cycles — target supercharged RP',
      HUB_SCORER_2: 'Aggressive fuel scoring + human player coordination',
      TOWER_CLIMBER_1: 'Level 3 tower climb',
      TOWER_CLIMBER_2: 'Level 3 tower climb',
      DEFENSE_ROLE: 'Dedicated defender — disrupt opponent fuel cycles',
      FOUL_DISCIPLINE: 'Accept some risk for high reward',
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
