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
  { key: 'POWER_CELL_SCORER_1', label: 'Power Cell Scorer 1', description: 'Primary power cell shooter', category: 'teleop', epaRankKeys: ['teleop_cell_points'] },
  { key: 'POWER_CELL_SCORER_2', label: 'Power Cell Scorer 2', description: 'Secondary power cell shooter', category: 'teleop', epaRankKeys: ['teleop_cell_points'] },
  { key: 'CLIMBER_1', label: 'Climber 1', description: 'Primary shield generator climber', category: 'endgame', epaRankKeys: ['endgame_points'] },
  { key: 'CLIMBER_2', label: 'Climber 2', description: 'Secondary shield generator climber', category: 'endgame', epaRankKeys: ['endgame_points'] },
  { key: 'DEFENSE_ROLE', label: 'Defense', description: 'Defensive play coordinator', category: 'defense' },
  { key: 'FOUL_DISCIPLINE', label: 'Foul Discipline', description: 'Foul avoidance focus', category: 'discipline' },
];

const dutyTemplates: DutyTemplate[] = [
  {
    name: 'safe',
    label: 'Safe',
    description: 'Conservative — reliable cell scoring, one hang, no defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Most reliable auto — init line + outer goal shots', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second most reliable auto path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Init line crossing only — stay out of alliance paths', strategy: 'skip' },
      POWER_CELL_SCORER_1: { hint: 'Best shooter — inner/outer goal cycles', strategy: 'strongest', epaRankKeysOverride: ['cells_inner', 'cells_outer'] },
      POWER_CELL_SCORER_2: { hint: 'Bottom goal scoring — consistent and fast', strategy: 'strongest', epaRankKeysOverride: ['teleop_cell_points'] },
      CLIMBER_1: { hint: 'Most reliable climber — only attempt if consistent', strategy: 'strongest' },
      CLIMBER_2: { hint: 'Park instead of risky climb — secure the points', strategy: 'skip' },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on scoring', strategy: 'skip' },
      FOUL_DISCIPLINE: { hint: 'All robots — stay clear of opponent trench and target zone', strategy: 'all' },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — outer/inner goal mix, two hangs, light defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto scorer — init line + 3 cell shots', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second best auto — standard cell path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Init line + grab one trench cell if safe', strategy: 'strongest' },
      POWER_CELL_SCORER_1: { hint: 'Best shooter — target inner port for bonus points', strategy: 'strongest', epaRankKeysOverride: ['cells_inner', 'cells_outer'] },
      POWER_CELL_SCORER_2: { hint: 'Support shooter — outer + bottom port cycling', strategy: 'strongest', epaRankKeysOverride: ['teleop_cell_points'] },
      CLIMBER_1: { hint: 'Best climber — hang for full endgame points', strategy: 'strongest' },
      CLIMBER_2: { hint: 'Second climber or park if unreliable', strategy: 'strongest' },
      DEFENSE_ROLE: { hint: 'Weakest scorer plays light defense — disrupt opponent cell intake', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Defender stays clear of trench and protected zones', strategy: 'all' },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — inner port focus, shield energized RP, double hang, active defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto — 3+ inner port shots, push for stage 1 activation', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Aggressive auto — contest trench cells and maximize shot count', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Aggressive — deny opponent trench access in auto', strategy: 'strongest' },
      POWER_CELL_SCORER_1: { hint: 'Inner port specialist — target shield energized RP', strategy: 'strongest', epaRankKeysOverride: ['cells_inner'] },
      POWER_CELL_SCORER_2: { hint: 'High-volume outer/inner port shooter — maximize cell count for RP threshold', strategy: 'strongest', epaRankKeysOverride: ['cells_inner', 'cells_outer'] },
      CLIMBER_1: { hint: 'Hang — full endgame points + assist rung level if possible', strategy: 'strongest', epaRankKeysOverride: ['endgame_points'] },
      CLIMBER_2: { hint: 'Hang — both robots attempt hang for RP threshold', strategy: 'strongest', epaRankKeysOverride: ['endgame_points'] },
      DEFENSE_ROLE: { hint: 'Dedicated defender — block opponent trench cycling and shot lanes', strategy: 'weakest' },
      FOUL_DISCIPLINE: { hint: 'Accept calculated risk — aggressive positioning near opponent target zone', strategy: 'all' },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  { key: 'auto_cells', label: 'Auto Cells', description: 'Power cells scored in autonomous', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'teleop_cell_points', label: 'Cell Points', description: 'Points from power cells in teleop', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'cells_inner', label: 'Inner Port', description: 'Cells scored in inner port', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'cells_outer', label: 'Outer Port', description: 'Cells scored in outer port', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'cells_bottom', label: 'Bottom Port', description: 'Cells scored in bottom port', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'foul_count', label: 'Fouls', description: 'Number of fouls committed', renderLocation: 'picklist', higherIsBetter: false },
];

const infiniteRecharge2020: GameDefinition = {
  year: 2020,
  gameName: 'Infinite Recharge',

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
        auto_cells:
          num(raw['autoCellsBottom']) + num(raw['autoCellsOuter']) + num(raw['autoCellsInner']),
        teleop_cell_points: num(raw['teleopCellPoints']),
        cells_inner: num(raw['teleopCellsInner']),
        cells_outer: num(raw['teleopCellsOuter']),
        cells_bottom: num(raw['teleopCellsBottom']),
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(infiniteRecharge2020);

export default infiniteRecharge2020;
