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
  { key: 'CORAL_SCORER', label: 'Coral Scorer', description: 'Primary coral placement', category: 'teleop', epaRankKeys: ['coral_l1', 'coral_l2', 'coral_l3', 'coral_l4'] },
  { key: 'ALGAE_HANDLER', label: 'Algae Handler', description: 'Algae processor/net scorer', category: 'teleop', epaRankKeys: ['net_algae', 'processor_algae'] },
  { key: 'CLIMBER_1', label: 'Climber 1', description: 'Primary cage climber', category: 'endgame', epaRankKeys: ['barge_points'] },
  { key: 'CLIMBER_2', label: 'Climber 2', description: 'Secondary cage climber', category: 'endgame', epaRankKeys: ['barge_points'] },
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
      CORAL_SCORER: 'Best coral accuracy',
      ALGAE_HANDLER: 'Best algae handler',
      CLIMBER_1: 'Most reliable climber',
      CLIMBER_2: 'Second most reliable climber',
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
      CORAL_SCORER: 'Best coral scorer',
      ALGAE_HANDLER: 'Best algae handler',
      CLIMBER_1: 'Best climber',
      CLIMBER_2: 'Second best climber or barge park',
      DEFENSE_ROLE: 'Weakest scorer plays light defense in teleop',
      FOUL_DISCIPLINE: 'Defender — stay clear of protected zones',
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Maximum scoring + active defense',
    assignments: {
      AUTO_ROLE_1: 'Best auto scorer — go for max',
      AUTO_ROLE_2: 'Second best — risky high-point auto',
      AUTO_ROLE_3: 'Aggressive positioning',
      CORAL_SCORER: 'Fastest coral cycle — prioritize L4',
      ALGAE_HANDLER: 'Aggressive algae + net scoring',
      CLIMBER_1: 'Deep cage climb',
      CLIMBER_2: 'Deep cage climb',
      DEFENSE_ROLE: 'Dedicated defender — disrupt opponent cycles',
      FOUL_DISCIPLINE: 'Accept some risk for high reward',
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  { key: 'coral_l1', label: 'Coral L1', description: 'Coral scored on Level 1', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'coral_l2', label: 'Coral L2', description: 'Coral scored on Level 2', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'coral_l3', label: 'Coral L3', description: 'Coral scored on Level 3', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'coral_l4', label: 'Coral L4', description: 'Coral scored on Level 4', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'net_algae', label: 'Algae Net', description: 'Algae scored in net', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'processor_algae', label: 'Algae Processor', description: 'Algae scored in processor', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'barge_points', label: 'Barge Pts', description: 'Points from barge endgame', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'cage_points', label: 'Cage Pts', description: 'Points from cage climb', renderLocation: 'briefing', higherIsBetter: true },
  { key: 'foul_count', label: 'Fouls', description: 'Number of fouls committed', renderLocation: 'picklist', higherIsBetter: false },
];

const reefscape2025: GameDefinition = {
  year: 2025,
  gameName: 'Reefscape',

  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown {
    const autoPoints = num(raw['autoPoints']);
    const teleopPoints = num(raw['teleopPoints']);
    const endgamePoints = num(raw['endGameBargePoints']) + num(raw['endGameRobotPoints']);
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
        coral_l1: num(raw['teleopCoralL1']),
        coral_l2: num(raw['teleopCoralL2']),
        coral_l3: num(raw['teleopCoralL3']),
        coral_l4: num(raw['teleopCoralL4']),
        net_algae: num(raw['teleopAlgaeNet']),
        processor_algae: num(raw['teleopAlgaeProcessor']),
        barge_points: num(raw['endGameBargePoints']),
        cage_points: num(raw['endGameRobotPoints']),
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(reefscape2025);

export default reefscape2025;
