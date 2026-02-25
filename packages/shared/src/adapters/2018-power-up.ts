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
  { key: 'SCALE_HANDLER', label: 'Scale Handler', description: 'Primary scale ownership robot', category: 'teleop', epaRankKeys: ['teleop_points'] },
  { key: 'SWITCH_HANDLER', label: 'Switch Handler', description: 'Alliance switch ownership robot', category: 'teleop', epaRankKeys: ['teleop_points'] },
  { key: 'CLIMBER_1', label: 'Climber 1', description: 'Primary face-the-boss climber', category: 'endgame', epaRankKeys: ['endgame_points'] },
  { key: 'CLIMBER_2', label: 'Climber 2', description: 'Secondary face-the-boss climber', category: 'endgame', epaRankKeys: ['endgame_points'] },
  { key: 'DEFENSE_ROLE', label: 'Defense', description: 'Defensive play coordinator', category: 'defense' },
  { key: 'FOUL_DISCIPLINE', label: 'Foul Discipline', description: 'Foul avoidance focus', category: 'discipline' },
];

const dutyTemplates: DutyTemplate[] = [
  {
    name: 'safe',
    label: 'Safe',
    description: 'Conservative — alliance switch ownership, one reliable climb, no defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Most reliable auto — auto run + switch ownership at zero', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second most reliable auto path — focus on run points', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Auto run only — stay out of alliance paths', strategy: 'skip' },
      SCALE_HANDLER: { hint: 'Best overall robot — contest scale for high-value ownership seconds', strategy: 'strongest' },
      SWITCH_HANDLER: { hint: 'Reliable switch holder — maintain alliance switch ownership', strategy: 'strongest' },
      CLIMBER_1: { hint: 'Most reliable climber — only attempt if consistent', strategy: 'strongest' },
      CLIMBER_2: { hint: 'Park instead of risky climb — secure the points', strategy: 'skip' },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on ownership', strategy: 'skip' },
      FOUL_DISCIPLINE: { hint: 'All robots — stay clear of opponent switch and vault zones', strategy: 'all' },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — scale + switch balance, two climbs, light defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto scorer — auto run + switch at zero if game data favors', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second best auto — standard run + scale ownership attempt', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Auto run + assist vault power cube delivery', strategy: 'strongest' },
      SCALE_HANDLER: { hint: 'Best overall robot — primary scale ownership focus', strategy: 'strongest' },
      SWITCH_HANDLER: { hint: 'Support robot — maintain switch + use vault power-ups', strategy: 'strongest' },
      CLIMBER_1: { hint: 'Best climber — attempt face-the-boss climb', strategy: 'strongest' },
      CLIMBER_2: { hint: 'Second climber or park if unreliable', strategy: 'strongest' },
      DEFENSE_ROLE: { hint: 'Weakest scorer plays light defense — disrupt opponent scale cycles', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Defender stays clear of opponent switch and exchange zone', strategy: 'all' },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — scale dominance, vault power-ups, double climb, active defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto — switch at zero + immediate scale contest', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Aggressive auto — rush scale from start, deny opponent ownership', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Aggressive — vault loading to fuel force/boost power-up', strategy: 'strongest' },
      SCALE_HANDLER: { hint: 'Scale dominator — maximize ownership seconds, use boost for contested moments', strategy: 'strongest' },
      SWITCH_HANDLER: { hint: 'Aggressive vault + switch — trigger force/levitate at peak impact', strategy: 'strongest' },
      CLIMBER_1: { hint: 'Face the boss — full climb for max endgame points + RP', strategy: 'strongest', epaRankKeysOverride: ['endgame_points'] },
      CLIMBER_2: { hint: 'Face the boss — both robots climb for face the boss RP', strategy: 'strongest', epaRankKeysOverride: ['endgame_points'] },
      DEFENSE_ROLE: { hint: 'Dedicated defender — deny opponent scale access and power cube delivery', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Accept calculated risk — aggressive scale contesting near opponent cubes', strategy: 'all' },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  { key: 'auto_run_points', label: 'Auto Run', description: 'Points from auto run crossing', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'auto_ownership_points', label: 'Auto Ownership', description: 'Points from switch/scale ownership in auto', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'teleop_ownership_points', label: 'Teleop Ownership', description: 'Points from switch/scale ownership in teleop', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'vault_points', label: 'Vault', description: 'Points from vault power-ups', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'endgame_points', label: 'Climb', description: 'Points from climbing in endgame', renderLocation: 'briefing', higherIsBetter: true },
  { key: 'foul_count', label: 'Fouls', description: 'Number of fouls committed', renderLocation: 'picklist', higherIsBetter: false },
];

const powerUp2018: GameDefinition = {
  year: 2018,
  gameName: 'FIRST Power Up',

  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown {
    const autoPoints = num(raw['autoPoints']);
    const teleopPoints = num(raw['teleopPoints']);
    const endgamePoints = num(raw['endgamePoints']);
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
        auto_run_points: num(raw['autoRunPoints']),
        auto_ownership_points: num(raw['autoOwnershipPoints']),
        teleop_ownership_points: num(raw['teleopOwnershipPoints']),
        vault_points: num(raw['vaultPoints']),
        endgame_points: endgamePoints,
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(powerUp2018);

export default powerUp2018;
