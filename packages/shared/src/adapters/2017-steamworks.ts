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
    key: 'FUEL_SCORER',
    label: 'Fuel Scorer',
    description: 'Primary high-goal fuel shooter',
    category: 'teleop',
    epaRankKeys: ['teleop_fuel_points'],
  },
  {
    key: 'GEAR_RUNNER',
    label: 'Gear Runner',
    description: 'Gear delivery to airship rotor',
    category: 'teleop',
    epaRankKeys: ['teleop_points'],
  },
  {
    key: 'ROPE_CLIMBER_1',
    label: 'Rope Climber 1',
    description: 'Primary rope climber',
    category: 'endgame',
    epaRankKeys: ['takeoff_points'],
  },
  {
    key: 'ROPE_CLIMBER_2',
    label: 'Rope Climber 2',
    description: 'Secondary rope climber',
    category: 'endgame',
    epaRankKeys: ['takeoff_points'],
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
    description: 'Conservative — gear delivery + low goal fuel, one rope climb, no defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Most reliable auto — mobility + gear delivery to spring side',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Second most reliable auto path — mobility bonus',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: { hint: 'Mobility only — stay out of alliance paths', strategy: 'skip' },
      FUEL_SCORER: {
        hint: 'Best fuel shooter — low goal cycling for pressure KPa',
        strategy: 'strongest',
        epaRankKeysOverride: ['teleop_fuel_points'],
      },
      GEAR_RUNNER: {
        hint: 'Reliable gear runner — focus on rotors 1 and 2',
        strategy: 'strongest',
      },
      ROPE_CLIMBER_1: {
        hint: 'Most reliable rope climber — only attempt if consistent',
        strategy: 'strongest',
      },
      ROPE_CLIMBER_2: {
        hint: 'Skip rope climb — no parking points in Steamworks; focus on gears/fuel until final seconds',
        strategy: 'skip',
      },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on scoring', strategy: 'skip' },
      FOUL_DISCIPLINE: {
        hint: 'All robots — avoid opponent airship zone, key, and launchpad (G21 = FOUL)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — gear + high goal fuel mix, two rope climbs, light defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto scorer — mobility + gear delivery, auto fuel if capable',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Second best auto — gear delivery standard path',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Mobility + assist gear delivery on third rotor',
        strategy: 'strongest',
      },
      FUEL_SCORER: {
        hint: 'Best fuel shooter — high goal for pressure KPa bonus',
        strategy: 'strongest',
        epaRankKeysOverride: ['teleop_fuel_points'],
      },
      GEAR_RUNNER: {
        hint: 'Gear specialist — complete rotors 1-3 for rotor bonus',
        strategy: 'strongest',
      },
      ROPE_CLIMBER_1: { hint: 'Best rope climber — attempt touchpad climb', strategy: 'strongest' },
      ROPE_CLIMBER_2: {
        hint: 'Second climber — attempt rope if time allows (no parking points)',
        strategy: 'strongest',
      },
      DEFENSE_ROLE: {
        hint: 'Weakest scorer plays light defense — disrupt opponent gear cycling',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Defender — avoid opponent airship zone, key, and launchpad (G21 = FOUL)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — all 4 rotors, kPa RP, double rope climb, active defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto — mobility + gear + auto fuel for early kPa',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Aggressive auto — rotor 2 gear delivery + fuel dump',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Aggressive — immediate rotor 3/4 gear setup post-auto',
        strategy: 'strongest',
      },
      FUEL_SCORER: {
        hint: 'High goal specialist — push for kPa ranking point with rapid fuel cycling',
        strategy: 'strongest',
        epaRankKeysOverride: ['teleop_fuel_points'],
      },
      GEAR_RUNNER: {
        hint: 'Fastest gear runner — complete all 4 rotors for rotor RP',
        strategy: 'strongest',
      },
      ROPE_CLIMBER_1: {
        hint: 'Rope climb — touchpad contact for full endgame points',
        strategy: 'strongest',
      },
      ROPE_CLIMBER_2: {
        hint: 'Rope climb — both robots for max takeoff points',
        strategy: 'strongest',
      },
      DEFENSE_ROLE: {
        hint: 'Dedicated defender — disrupt opponent rotor 4 gear delivery and fuel cycles',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Avoid opponent airship zone, key, and launchpad (G21 = FOUL per violation)',
        strategy: 'all',
      },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  {
    key: 'auto_fuel_points',
    label: 'Auto Fuel',
    description: 'Points from fuel scored in autonomous',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'teleop_fuel_points',
    label: 'Teleop Fuel',
    description: 'Points from fuel scored in teleop',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'teleop_fuel_high',
    label: 'High Goal Fuel',
    description: 'Fuel scored in high goal',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'teleop_rotor_points',
    label: 'Rotor Points',
    description: 'Points from rotor engagement',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'takeoff_points',
    label: 'Takeoff',
    description: 'Points from rope climbing',
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

const steamworks2017: GameDefinition = {
  year: 2017,
  gameName: 'FIRST Steamworks',

  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown {
    const autoPoints = num(raw['autoPoints']);
    // teleop includes fuel + rotors + takeoff
    const teleopFuelPoints = num(raw['teleopFuelPoints']);
    const teleopRotorPoints = num(raw['teleopRotorPoints']);
    const takeoffPoints = num(raw['teleopTakeoffPoints']);
    const kPaBonus = num(raw['kPaBonusPoints']);
    const rotorBonus = num(raw['rotorBonusPoints']);
    const teleopPoints =
      num(raw['teleopPoints']) ||
      teleopFuelPoints + teleopRotorPoints + takeoffPoints + kPaBonus + rotorBonus;
    const foulPoints = num(raw['foulPoints']);
    const totalPoints = num(raw['totalPoints']);
    const miscPoints = totalPoints - autoPoints - teleopPoints - foulPoints;

    return {
      auto_points: autoPoints,
      teleop_points: teleopPoints,
      endgame_points: takeoffPoints,
      penalty_points: foulPoints,
      misc_points: miscPoints,
      gameSpecific: {
        auto_fuel_points: num(raw['autoFuelPoints']),
        teleop_fuel_points: teleopFuelPoints,
        teleop_fuel_high: num(raw['teleopFuelHigh']),
        teleop_rotor_points: teleopRotorPoints,
        takeoff_points: takeoffPoints,
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(steamworks2017);

export default steamworks2017;
