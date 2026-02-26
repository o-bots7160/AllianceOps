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
  {
    key: 'AUTO_ROLE_1',
    label: 'Auto Role 1',
    description: 'Primary autonomous scorer',
    category: 'auto',
    epaRankKeys: ['auto_points'],
  },
  {
    key: 'AUTO_ROLE_2',
    label: 'Auto Role 2',
    description: 'Secondary autonomous scorer',
    category: 'auto',
    epaRankKeys: ['auto_points'],
  },
  {
    key: 'AUTO_ROLE_3',
    label: 'Auto Role 3',
    description: 'Tertiary autonomous role',
    category: 'auto',
    epaRankKeys: ['auto_points'],
  },
  {
    key: 'CORAL_SCORER',
    label: 'Coral Scorer',
    description: 'Primary coral placement',
    category: 'teleop',
    epaRankKeys: ['coral_l1', 'coral_l2', 'coral_l3', 'coral_l4'],
  },
  {
    key: 'ALGAE_HANDLER',
    label: 'Algae Handler',
    description: 'Algae processor/net scorer',
    category: 'teleop',
    epaRankKeys: ['net_algae', 'processor_algae'],
  },
  {
    key: 'CLIMBER_1',
    label: 'Climber 1',
    description: 'Primary cage climber (shallow/deep)',
    category: 'endgame',
    epaRankKeys: ['cage_points'],
  },
  {
    key: 'CLIMBER_2',
    label: 'Climber 2',
    description: 'Secondary cage climber (shallow/deep)',
    category: 'endgame',
    epaRankKeys: ['cage_points'],
  },
  {
    key: 'DEFENSE_ROLE',
    label: 'Defense',
    description: 'Defensive play coordinator',
    category: 'defense',
  },
  {
    key: 'FOUL_DISCIPLINE',
    label: 'Foul Discipline',
    description: 'Foul avoidance focus',
    category: 'discipline',
  },
];

const dutyTemplates: DutyTemplate[] = [
  {
    name: 'safe',
    label: 'Safe',
    description: 'Conservative — lower reef levels, processor algae, one reliable climber',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Most reliable auto — tested path, avoid collisions',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: { hint: 'Second most reliable auto path', strategy: 'strongest' },
      AUTO_ROLE_3: {
        hint: 'Simple mobility auto — stay clear of alliance paths',
        strategy: 'skip',
      },
      CORAL_SCORER: {
        hint: 'Best coral scorer — focus on L1/L2 for consistency',
        strategy: 'strongest',
        epaRankKeysOverride: ['coral_l1', 'coral_l2'],
      },
      ALGAE_HANDLER: {
        hint: 'Processor algae only — more reliable than net shots',
        strategy: 'strongest',
        epaRankKeysOverride: ['processor_algae'],
      },
      CLIMBER_1: {
        hint: 'Most reliable cage climber — only attempt if consistent',
        strategy: 'strongest',
      },
      CLIMBER_2: { hint: 'Park at barge (2 pts) instead of risky cage attempt', strategy: 'skip' },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on scoring', strategy: 'skip' },
      FOUL_DISCIPLINE: {
        hint: 'All robots — avoid G418 reef contact (TECH FOUL) and G420 opponent reef zone violations',
        strategy: 'all',
      },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — best-fit coral/algae assignments with light defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto scorer — maximize coral placement', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second best auto — standard coral path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Mobility + grab algae or low coral', strategy: 'strongest' },
      CORAL_SCORER: {
        hint: 'Best overall coral scorer — mix of levels for reef completion',
        strategy: 'strongest',
        epaRankKeysOverride: ['coral_l1', 'coral_l2', 'coral_l3', 'coral_l4'],
      },
      ALGAE_HANDLER: {
        hint: 'Best algae handler — use both processor and net as available',
        strategy: 'strongest',
        epaRankKeysOverride: ['net_algae', 'processor_algae'],
      },
      CLIMBER_1: { hint: 'Best cage climber — standard attempt', strategy: 'strongest' },
      CLIMBER_2: { hint: 'Second best climber or barge park if unreliable', strategy: 'strongest' },
      DEFENSE_ROLE: {
        hint: 'Weakest scorer plays light defense — do NOT enter opponent reef zone (G418 TECH FOUL)',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Defender — stay clear of opponent reef protected zone (G418/G420 = TECH FOUL)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — prioritize L3/L4 coral, net algae, deep climbs, active defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto — push for max coral count, contest shared positions',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Aggressive auto — maximize coral and algae from alliance side',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Third auto path — grab extra algae, avoid pathing conflicts',
        strategy: 'strongest',
      },
      CORAL_SCORER: {
        hint: 'Fastest coral cycles — prioritize L3/L4 for reef completion RP',
        strategy: 'strongest',
        epaRankKeysOverride: ['coral_l3', 'coral_l4'],
      },
      ALGAE_HANDLER: {
        hint: 'Aggressive net algae scoring — higher points per cycle',
        strategy: 'strongest',
        epaRankKeysOverride: ['net_algae'],
      },
      CLIMBER_1: {
        hint: 'Deep cage climb — go for max endgame points',
        strategy: 'strongest',
        epaRankKeysOverride: ['cage_points'],
      },
      CLIMBER_2: {
        hint: 'Deep cage climb — both robots attempt full climb',
        strategy: 'strongest',
        epaRankKeysOverride: ['cage_points'],
      },
      DEFENSE_ROLE: {
        hint: 'Dedicated defender — block opponent reef access, do NOT enter opponent reef zone (G418 TECH FOUL)',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Watch G418/G420 — no reef contact fouls, stay clear of opponent reef zone (TECH FOUL = 8 pts to opponent)',
        strategy: 'all',
      },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  {
    key: 'coral_l1',
    label: 'Coral L1',
    description: 'Coral scored on Level 1',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'coral_l2',
    label: 'Coral L2',
    description: 'Coral scored on Level 2',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'coral_l3',
    label: 'Coral L3',
    description: 'Coral scored on Level 3',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'coral_l4',
    label: 'Coral L4',
    description: 'Coral scored on Level 4',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'net_algae',
    label: 'Algae Net',
    description: 'Algae scored in net',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'processor_algae',
    label: 'Algae Processor',
    description: 'Algae scored in processor',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'barge_points',
    label: 'Barge Pts',
    description: 'Points from barge endgame',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'cage_points',
    label: 'Cage Pts',
    description: 'Points from cage climb',
    renderLocation: 'briefing',
    higherIsBetter: true,
  },
  {
    key: 'foul_count',
    label: 'Fouls',
    description: 'Number of fouls committed',
    renderLocation: 'picklist',
    higherIsBetter: false,
  },
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
