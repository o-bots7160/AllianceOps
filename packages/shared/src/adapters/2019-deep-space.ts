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
    key: 'HATCH_PLACER',
    label: 'Hatch Panel Placer',
    description: 'Primary hatch panel placer',
    category: 'teleop',
    epaRankKeys: ['hatch_panel_points'],
  },
  {
    key: 'CARGO_SCORER',
    label: 'Cargo Scorer',
    description: 'Primary cargo scorer',
    category: 'teleop',
    epaRankKeys: ['cargo_points'],
  },
  {
    key: 'HAB_CLIMBER_1',
    label: 'HAB Climber 1',
    description: 'Primary HAB climb robot',
    category: 'endgame',
    epaRankKeys: ['endgame_points'],
  },
  {
    key: 'HAB_CLIMBER_2',
    label: 'HAB Climber 2',
    description: 'Secondary HAB climb robot',
    category: 'endgame',
    epaRankKeys: ['endgame_points'],
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
    description: 'Conservative — cargo ship focus, HAB 2 climb, no defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Most reliable auto — HAB line cross + cargo ship hatch',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: { hint: 'Second most reliable auto path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'HAB line cross only — stay out of alliance paths', strategy: 'skip' },
      HATCH_PLACER: {
        hint: 'Best hatch placer — cargo ship hatches first, low rocket if clean',
        strategy: 'strongest',
        epaRankKeysOverride: ['hatch_panel_points'],
      },
      CARGO_SCORER: {
        hint: 'Best cargo scorer — cargo ship bays only for consistency',
        strategy: 'strongest',
        epaRankKeysOverride: ['cargo_points'],
      },
      HAB_CLIMBER_1: { hint: 'Most reliable HAB climber — attempt HAB 2', strategy: 'strongest' },
      HAB_CLIMBER_2: {
        hint: 'HAB 1 climb (3 pts) or skip — avoid risky higher climb',
        strategy: 'skip',
      },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on scoring', strategy: 'skip' },
      FOUL_DISCIPLINE: {
        hint: 'All robots — do not hold >1 game piece (G20 = FOUL), stay clear of opponent loading station',
        strategy: 'all',
      },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — rocket + cargo ship mix, two HAB climbs, light defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto scorer — HAB line + rocket/cargo ship placement',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Second best auto — standard hatch + cargo path',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: { hint: 'HAB line + one cargo ship bay if safe', strategy: 'strongest' },
      HATCH_PLACER: {
        hint: 'Best hatch placer — complete rockets with mixed-height placements',
        strategy: 'strongest',
        epaRankKeysOverride: ['hatch_panel_points'],
      },
      CARGO_SCORER: {
        hint: 'Best cargo scorer — fill hatched bays across rocket + cargo ship',
        strategy: 'strongest',
        epaRankKeysOverride: ['cargo_points'],
      },
      HAB_CLIMBER_1: { hint: 'Best HAB climber — attempt HAB 3 (12 pts)', strategy: 'strongest' },
      HAB_CLIMBER_2: {
        hint: 'Second climber — HAB 2 minimum (6 pts); HAB Docking RP needs 15+ pts total',
        strategy: 'strongest',
      },
      DEFENSE_ROLE: {
        hint: 'Weakest scorer plays light defense — must climb HAB 1+ at endgame for HAB Docking RP safety margin',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Defender — avoid opponent loading station area (G20) and do not hold >1 game piece',
        strategy: 'all',
      },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — full rocket RP, HAB 3 climbs, active defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto — HAB 2 start + rocket placement for RP setup',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Aggressive auto — contest field cargo and maximize sandstorm bonus',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Aggressive — deny opponent hatch sources in sandstorm',
        strategy: 'strongest',
      },
      HATCH_PLACER: {
        hint: 'Fastest hatch placer — complete near and far rockets for RP',
        strategy: 'strongest',
        epaRankKeysOverride: ['hatch_panel_points'],
      },
      CARGO_SCORER: {
        hint: 'Aggressive cargo — fill all 6 bays on one rocket (hatch first, then cargo) for Complete Rocket RP',
        strategy: 'strongest',
        epaRankKeysOverride: ['cargo_points'],
      },
      HAB_CLIMBER_1: {
        hint: 'HAB 3 climb (12 pts) — maximum endgame points',
        strategy: 'strongest',
        epaRankKeysOverride: ['endgame_points'],
      },
      HAB_CLIMBER_2: {
        hint: 'HAB 3 climb — HAB Docking RP needs 15+ pts (two HAB 3 = 24 pts)',
        strategy: 'strongest',
        epaRankKeysOverride: ['endgame_points'],
      },
      DEFENSE_ROLE: {
        hint: 'Dedicated defender — climb HAB 1 (3 pts) minimum at endgame for HAB Docking RP safety margin',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Avoid holding >1 game piece (G20 = FOUL) and opponent loading station contact — TECH FOUL = 10 pts to opponent',
        strategy: 'all',
      },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  {
    key: 'hatch_panel_points',
    label: 'Hatch Panels',
    description: 'Points from hatch panel placements',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'cargo_points',
    label: 'Cargo',
    description: 'Points from cargo scored',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'sandstorm_bonus',
    label: 'Sandstorm Bonus',
    description: 'Bonus points from sandstorm period',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'hab_climb_points',
    label: 'HAB Climb',
    description: 'Points from HAB climbing',
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

const deepSpace2019: GameDefinition = {
  year: 2019,
  gameName: 'Destination: Deep Space',

  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown {
    const autoPoints = num(raw['autoPoints']);
    const teleopPoints = num(raw['teleopPoints']);
    const endgamePoints = num(raw['habClimbPoints']);
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
        hatch_panel_points: num(raw['hatchPanelPoints']),
        cargo_points: num(raw['cargoPoints']),
        sandstorm_bonus: num(raw['sandStormBonusPoints']),
        hab_climb_points: num(raw['habClimbPoints']),
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(deepSpace2019);

export default deepSpace2019;
