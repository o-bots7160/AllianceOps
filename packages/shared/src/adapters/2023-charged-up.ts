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
    key: 'GRID_SCORER',
    label: 'Grid Scorer',
    description: 'Primary grid game piece placer',
    category: 'teleop',
    epaRankKeys: ['teleop_game_pieces', 'link_points'],
  },
  {
    key: 'GAME_PIECE_HANDLER',
    label: 'Game Piece Handler',
    description: 'Secondary grid scorer / feeder coordination',
    category: 'teleop',
    epaRankKeys: ['teleop_game_pieces'],
  },
  {
    key: 'CHARGE_STATION_1',
    label: 'Charge Station 1',
    description: 'Primary charge station climber',
    category: 'endgame',
    epaRankKeys: ['charge_station_points'],
  },
  {
    key: 'CHARGE_STATION_2',
    label: 'Charge Station 2',
    description: 'Secondary charge station climber',
    category: 'endgame',
    epaRankKeys: ['charge_station_points'],
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
    description: 'Conservative — low grid nodes, one charge station dock, no defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Most reliable auto — proven mobility + low node placement',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: { hint: 'Second most reliable auto path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Mobility only — stay out of alliance paths', strategy: 'skip' },
      GRID_SCORER: {
        hint: 'Best grid scorer — focus on hybrid and mid rows for consistency',
        strategy: 'strongest',
        epaRankKeysOverride: ['teleop_game_pieces'],
      },
      GAME_PIECE_HANDLER: {
        hint: 'Steady hybrid row scoring — do not force top row attempts',
        strategy: 'strongest',
      },
      CHARGE_STATION_1: {
        hint: 'Most reliable station dock — only attempt if >80% success rate',
        strategy: 'strongest',
      },
      CHARGE_STATION_2: { hint: 'Park on charge station instead of risky dock', strategy: 'skip' },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on scoring', strategy: 'skip' },
      FOUL_DISCIPLINE: {
        hint: 'All robots — avoid G301 (entering opponent community = FOUL) and do not hold >1 game piece (G304)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — best-fit grid assignments, one dock + one park, light defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto scorer — maximize game piece count and mobility',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: { hint: 'Second best auto — standard node path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Mobility + grab one game piece if safe', strategy: 'strongest' },
      GRID_SCORER: {
        hint: 'Best grid scorer — mix of mid/top nodes for link completion',
        strategy: 'strongest',
        epaRankKeysOverride: ['teleop_game_pieces', 'link_points'],
      },
      GAME_PIECE_HANDLER: {
        hint: 'Support grid scorer — fill low row and assist links',
        strategy: 'strongest',
      },
      CHARGE_STATION_1: {
        hint: 'Best charge station robot — attempt engage',
        strategy: 'strongest',
      },
      CHARGE_STATION_2: {
        hint: 'Second charge station robot — dock or park (Activation Bonus RP needs all 3 robots)',
        strategy: 'strongest',
      },
      DEFENSE_ROLE: {
        hint: 'Weakest scorer plays light defense — must dock/park on charge station at endgame for Activation Bonus RP',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Defender — avoid G301 (opponent community) and G304 (max 1 game piece)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — top row nodes, full link RP, charge station engage, active defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto — go for top row placement and charge station engage',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Aggressive auto — contest game pieces and maximize node count',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Aggressive positioning — deny opponent game pieces',
        strategy: 'strongest',
      },
      GRID_SCORER: {
        hint: 'Fastest grid cycles — prioritize top row for link RP and sustainability RP',
        strategy: 'strongest',
        epaRankKeysOverride: ['teleop_game_pieces', 'link_points'],
      },
      GAME_PIECE_HANDLER: {
        hint: 'Aggressive grid scoring — place pieces in coopertition columns for Coopertition bonus (both alliances need 3+ links)',
        strategy: 'strongest',
      },
      CHARGE_STATION_1: {
        hint: 'Charge station engage — go for max endgame points',
        strategy: 'strongest',
        epaRankKeysOverride: ['charge_station_points'],
      },
      CHARGE_STATION_2: {
        hint: 'Charge station engage — coordinate carefully to avoid tipping (Activation Bonus RP needs all 3 robots)',
        strategy: 'strongest',
        epaRankKeysOverride: ['charge_station_points'],
      },
      DEFENSE_ROLE: {
        hint: 'Dedicated defender early — transition to charge station at endgame for Activation Bonus RP (all 3 robots must dock/engage)',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Avoid G301 (entering opponent community = FOUL), G304 (max 1 game piece) — each TECH FOUL = 12 pts to opponent',
        strategy: 'all',
      },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  {
    key: 'auto_game_pieces',
    label: 'Auto Pieces',
    description: 'Game pieces scored in autonomous',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'teleop_game_pieces',
    label: 'Teleop Pieces',
    description: 'Game pieces scored in teleop',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'total_game_pieces',
    label: 'Total Pieces',
    description: 'Total game pieces scored',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'link_points',
    label: 'Link Points',
    description: 'Points from link completions',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'charge_station_points',
    label: 'Charge Station',
    description: 'Points from charge station',
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

const chargedUp2023: GameDefinition = {
  year: 2023,
  gameName: 'Charged Up',

  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown {
    const autoPoints = num(raw['autoPoints']);
    const teleopPoints = num(raw['teleopPoints']);
    const endgamePoints = num(raw['endGameChargeStationPoints']) + num(raw['endGameParkPoints']);
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
        auto_game_pieces: num(raw['autoGamePieceCount']),
        teleop_game_pieces: num(raw['teleopGamePieceCount']),
        total_game_pieces: num(raw['autoGamePieceCount']) + num(raw['teleopGamePieceCount']),
        link_points: num(raw['linkPoints']),
        charge_station_points:
          num(raw['endGameChargeStationPoints']) + num(raw['autoChargeStationPoints']),
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(chargedUp2023);

export default chargedUp2023;
