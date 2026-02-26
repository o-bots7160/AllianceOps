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
    key: 'SPEAKER_SCORER',
    label: 'Speaker Scorer',
    description: 'Primary speaker note scorer',
    category: 'teleop',
    epaRankKeys: ['speaker_notes'],
  },
  {
    key: 'AMP_SCORER',
    label: 'Amp Scorer',
    description: 'Amp note scorer / amplify trigger',
    category: 'teleop',
    epaRankKeys: ['amp_notes'],
  },
  {
    key: 'CLIMBER_1',
    label: 'Climber 1',
    description: 'Primary stage climber',
    category: 'endgame',
    epaRankKeys: ['endgame_on_stage_points'],
  },
  {
    key: 'CLIMBER_2',
    label: 'Climber 2',
    description: 'Secondary stage climber',
    category: 'endgame',
    epaRankKeys: ['endgame_on_stage_points'],
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
    description: 'Conservative — reliable scoring, park over risky climbs, no defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Most reliable auto scorer — proven consistent path',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Second most reliable — stick to tested auto routine',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Simple mobility auto only — stay out of alliance paths',
        strategy: 'skip',
      },
      SPEAKER_SCORER: {
        hint: 'Best speaker accuracy — prioritize uncontested shots',
        strategy: 'strongest',
        epaRankKeysOverride: ['speaker_notes'],
      },
      AMP_SCORER: {
        hint: 'Steady amp scoring — do not force amplify windows',
        strategy: 'strongest',
        epaRankKeysOverride: ['amp_notes'],
      },
      CLIMBER_1: {
        hint: 'Most reliable climber — only attempt if >80% success rate',
        strategy: 'strongest',
      },
      CLIMBER_2: { hint: 'Park on stage (1 pt) instead of risky climb', strategy: 'skip' },
      DEFENSE_ROLE: { hint: 'No defense — all robots focus on scoring', strategy: 'skip' },
      FOUL_DISCIPLINE: {
        hint: 'All robots — avoid G424 (opponent stage zone = TECH FOUL) and G419 (opponent source zone)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Standard play — best-fit scoring with light opportunistic defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto scorer — maximize note count', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Second best auto — standard note path', strategy: 'strongest' },
      AUTO_ROLE_3: { hint: 'Mobility + grab one centerline note if safe', strategy: 'strongest' },
      SPEAKER_SCORER: {
        hint: 'Best speaker scorer — coordinate with amp for amplify windows',
        strategy: 'strongest',
        epaRankKeysOverride: ['speaker_notes', 'amplified_notes'],
      },
      AMP_SCORER: {
        hint: 'Best amp scorer — trigger amplify for speaker partner',
        strategy: 'strongest',
        epaRankKeysOverride: ['amp_notes'],
      },
      CLIMBER_1: { hint: 'Best climber — attempt stage climb', strategy: 'strongest' },
      CLIMBER_2: {
        hint: 'Second best climber or park — Ensemble RP needs all 3 on stage',
        strategy: 'strongest',
      },
      DEFENSE_ROLE: {
        hint: 'Weakest scorer plays light defense — must park or climb at endgame for Ensemble RP (all 3 robots on stage needed)',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Defender — stay clear of G424 (opponent stage zone) and G419 (source zone = TECH FOUL)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Max ceiling — amplified shots, trap attempts, harmony, active defense',
    assignments: {
      AUTO_ROLE_1: { hint: 'Best auto — go for 4+ centerline notes', strategy: 'strongest' },
      AUTO_ROLE_2: { hint: 'Aggressive auto — contest centerline notes', strategy: 'strongest' },
      AUTO_ROLE_3: {
        hint: 'Aggressive centerline positioning — deny opponent notes',
        strategy: 'strongest',
      },
      SPEAKER_SCORER: {
        hint: 'Fastest speaker cycles — shoot during every amplify window',
        strategy: 'strongest',
        epaRankKeysOverride: ['amplified_notes', 'speaker_notes'],
      },
      AMP_SCORER: {
        hint: 'Aggressive amp + force amplify every cycle',
        strategy: 'strongest',
        epaRankKeysOverride: ['amp_notes'],
      },
      CLIMBER_1: {
        hint: 'Stage climb + attempt trap note for bonus RP',
        strategy: 'strongest',
        epaRankKeysOverride: ['endgame_on_stage_points', 'endgame_trap_points'],
      },
      CLIMBER_2: {
        hint: 'Stage climb — same chain as Climber 1 for Harmony bonus (2 pts each) or second chain if safer',
        strategy: 'strongest',
        epaRankKeysOverride: ['endgame_on_stage_points', 'endgame_harmony_points'],
      },
      DEFENSE_ROLE: {
        hint: 'Dedicated defender early — transition to stage climb in final 30s for Ensemble RP (all 3 robots required)',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Avoid G424 (opponent stage zone) and G419 (opponent source zone) — each is a TECH FOUL (8 pts to opponent)',
        strategy: 'all',
      },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  {
    key: 'auto_notes',
    label: 'Auto Notes',
    description: 'Notes scored in autonomous',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'speaker_notes',
    label: 'Speaker Notes',
    description: 'Notes scored in speaker',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'amp_notes',
    label: 'Amp Notes',
    description: 'Notes scored in amp',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'amplified_notes',
    label: 'Amplified',
    description: 'Notes scored while amplified',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'total_notes',
    label: 'Total Notes',
    description: 'Total notes scored',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'endgame_on_stage_points',
    label: 'On Stage',
    description: 'Onstage climb points',
    renderLocation: 'briefing',
    higherIsBetter: true,
  },
  {
    key: 'endgame_trap_points',
    label: 'Trap',
    description: 'Points from trap notes',
    renderLocation: 'briefing',
    higherIsBetter: true,
  },
  {
    key: 'endgame_harmony_points',
    label: 'Harmony',
    description: 'Points from harmony bonus',
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

const crescendo2024: GameDefinition = {
  year: 2024,
  gameName: 'Crescendo',

  mapScoreBreakdown(raw: TBAScoreBreakdown): GenericBreakdown {
    const autoPoints = num(raw['autoPoints']);
    const teleopPoints = num(raw['teleopTotalNotePoints']);
    const endgamePoints =
      num(raw['endGameParkPoints']) +
      num(raw['endGameOnStagePoints']) +
      num(raw['endGameHarmonyPoints']) +
      num(raw['endGameSpotLightBonusPoints']) +
      num(raw['endGameTrapPoints']);
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
        auto_notes: num(raw['autoAmpNoteCount']) + num(raw['autoSpeakerNoteCount']),
        speaker_notes:
          num(raw['teleopSpeakerNoteCount']) + num(raw['teleopSpeakerNoteAmplifiedCount']),
        amp_notes: num(raw['teleopAmpNoteCount']),
        amplified_notes: num(raw['teleopSpeakerNoteAmplifiedCount']),
        total_notes:
          num(raw['autoAmpNoteCount']) +
          num(raw['autoSpeakerNoteCount']) +
          num(raw['teleopSpeakerNoteCount']) +
          num(raw['teleopSpeakerNoteAmplifiedCount']) +
          num(raw['teleopAmpNoteCount']),
        endgame_on_stage_points: num(raw['endGameOnStagePoints']),
        endgame_trap_points: num(raw['endGameTrapPoints']),
        endgame_harmony_points: num(raw['endGameHarmonyPoints']),
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
};

registerAdapter(crescendo2024);

export default crescendo2024;
