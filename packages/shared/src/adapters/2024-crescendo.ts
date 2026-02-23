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
  { key: 'SPEAKER_SCORER', label: 'Speaker Scorer', description: 'Primary speaker note scorer', category: 'teleop', epaRankKeys: ['speaker_notes'] },
  { key: 'AMP_SCORER', label: 'Amp Scorer', description: 'Amp note scorer / amplify trigger', category: 'teleop', epaRankKeys: ['amp_notes'] },
  { key: 'CLIMBER_1', label: 'Climber 1', description: 'Primary stage climber', category: 'endgame', epaRankKeys: ['endgame_on_stage_points'] },
  { key: 'CLIMBER_2', label: 'Climber 2', description: 'Secondary stage climber', category: 'endgame', epaRankKeys: ['endgame_on_stage_points'] },
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
      SPEAKER_SCORER: 'Best speaker accuracy',
      AMP_SCORER: 'Best amp scorer',
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
      SPEAKER_SCORER: 'Best speaker scorer',
      AMP_SCORER: 'Best amp scorer — trigger amplify',
      CLIMBER_1: 'Best climber',
      CLIMBER_2: 'Second best climber or park',
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
      SPEAKER_SCORER: 'Fastest speaker cycles — prioritize amplified',
      AMP_SCORER: 'Aggressive amp + amplify coordination',
      CLIMBER_1: 'Stage climb + harmony',
      CLIMBER_2: 'Stage climb + trap',
      DEFENSE_ROLE: 'Dedicated defender — disrupt opponent cycles',
      FOUL_DISCIPLINE: 'Accept some risk for high reward',
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  { key: 'auto_notes', label: 'Auto Notes', description: 'Notes scored in autonomous', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'speaker_notes', label: 'Speaker Notes', description: 'Notes scored in speaker', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'amp_notes', label: 'Amp Notes', description: 'Notes scored in amp', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'amplified_notes', label: 'Amplified', description: 'Notes scored while amplified', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'total_notes', label: 'Total Notes', description: 'Total notes scored', renderLocation: 'team_card', higherIsBetter: true },
  { key: 'endgame_on_stage_points', label: 'On Stage', description: 'Onstage climb points', renderLocation: 'briefing', higherIsBetter: true },
  { key: 'endgame_trap_points', label: 'Trap', description: 'Points from trap notes', renderLocation: 'briefing', higherIsBetter: true },
  { key: 'endgame_harmony_points', label: 'Harmony', description: 'Points from harmony bonus', renderLocation: 'briefing', higherIsBetter: true },
  { key: 'foul_count', label: 'Fouls', description: 'Number of fouls committed', renderLocation: 'picklist', higherIsBetter: false },
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
        speaker_notes: num(raw['teleopSpeakerNoteCount']) + num(raw['teleopSpeakerNoteAmplifiedCount']),
        amp_notes: num(raw['teleopAmpNoteCount']),
        amplified_notes: num(raw['teleopSpeakerNoteAmplifiedCount']),
        total_notes: num(raw['autoAmpNoteCount']) + num(raw['autoSpeakerNoteCount']) +
          num(raw['teleopSpeakerNoteCount']) + num(raw['teleopSpeakerNoteAmplifiedCount']) +
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
