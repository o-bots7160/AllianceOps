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

// REBUILT 2026 Game Summary:
// - Score FUEL (foam balls) into active HUB for 1 pt each
// - HUBs alternate active/inactive in 25s SHIFTS during TELEOP
// - TOWER climb: Level 1 (15 AUTO/10 TELEOP), Level 2 (20), Level 3 (30)
// - RPs: ENERGIZED (≥100 fuel), SUPERCHARGED (≥360 fuel), TRAVERSAL (≥50 tower pts)
// - Field: BUMPS (drive over) and TRENCHES (22.25in clearance, drive under) separate zones
// - 504 FUEL per match: depots, chutes, preloaded (up to 8/robot), neutral zone (~360)

const dutySlots: DutySlotDefinition[] = [
  {
    key: 'AUTO_ROLE_1',
    label: 'Auto Scorer 1',
    description: 'Primary auto fuel scorer — maximize fuel count to win hub priority',
    category: 'auto',
    epaRankKeys: ['auto_points'],
  },
  {
    key: 'AUTO_ROLE_2',
    label: 'Auto Scorer 2',
    description: 'Secondary auto fuel scorer — help win auto to set shift order',
    category: 'auto',
    epaRankKeys: ['auto_points'],
  },
  {
    key: 'AUTO_ROLE_3',
    label: 'Auto Scorer 3',
    description: 'Tertiary auto role — score fuel or attempt Level 1 tower climb (15 pts)',
    category: 'auto',
    epaRankKeys: ['auto_points'],
  },
  {
    key: 'HUB_SCORER_1',
    label: 'Hub Scorer 1',
    description: 'Primary teleop hub scorer — cycle fuel during active hub shifts',
    category: 'teleop',
    epaRankKeys: ['teleop_points'],
  },
  {
    key: 'HUB_SCORER_2',
    label: 'Hub Scorer 2',
    description:
      'Secondary teleop hub scorer — collect fuel during inactive shifts, score during active',
    category: 'teleop',
    epaRankKeys: ['teleop_points'],
  },
  {
    key: 'TOWER_CLIMBER_1',
    label: 'Tower Climber 1',
    description: 'Primary tower climber — target highest achievable level for Traversal RP',
    category: 'endgame',
    epaRankKeys: ['endgame_points'],
  },
  {
    key: 'TOWER_CLIMBER_2',
    label: 'Tower Climber 2',
    description: 'Secondary tower climber — need ≥50 tower pts total for Traversal RP',
    category: 'endgame',
    epaRankKeys: ['endgame_points'],
  },
  {
    key: 'DEFENSE_ROLE',
    label: 'Defense',
    description: 'Disrupt opponent scoring during their active hub shifts',
    category: 'defense',
  },
  {
    key: 'FOUL_DISCIPLINE',
    label: 'Foul Discipline',
    description: 'Avoid penalties — MINOR FOUL = 5 pts, MAJOR FOUL = 15 pts to opponent',
    category: 'discipline',
  },
];

const dutyTemplates: DutyTemplate[] = [
  {
    name: 'safe',
    label: 'Safe',
    description: 'Conservative — reliable fuel scoring, safe tower climbs, no defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Most reliable auto — preload 8 fuel, score into hub from alliance zone. Winning auto sets favorable hub shift order',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Second most reliable auto — score preloaded fuel. Stay on own side of center line (G403: bumpers completely across + contact opponent = MAJOR FOUL)',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Simple auto — score preloaded fuel or collect from depot/neutral zone. Do not cross center line (G403)',
        strategy: 'weakest',
      },
      HUB_SCORER_1: {
        hint: 'Best fuel scorer — cycle fuel during active hub shifts (25s windows). Collect from depot/neutral zone during inactive shifts. Must be in alliance zone to score (G407: MAJOR FOUL if not)',
        strategy: 'strongest',
      },
      HUB_SCORER_2: {
        hint: 'Second best scorer — coordinate with human player at outpost for fuel supply via chute. Score only during active hub shifts',
        strategy: 'strongest',
      },
      TOWER_CLIMBER_1: {
        hint: 'Most reliable climber — aim for Level 2 minimum (bumpers above LOW RUNG, 20 pts). Traverse bumps/trenches back to tower before end game (last 30s)',
        strategy: 'strongest',
      },
      TOWER_CLIMBER_2: {
        hint: 'Level 1 climb (10 pts) — get off carpet, contact rung/upright. If unreliable climber, keep scoring fuel until end game instead. Need ≥50 tower pts total for Traversal RP',
        strategy: 'weakest',
      },
      DEFENSE_ROLE: {
        hint: 'No defense — all 3 robots focus on fuel scoring and climbing',
        strategy: 'skip',
      },
      FOUL_DISCIPLINE: {
        hint: 'All robots: stay in alliance zone when scoring (G407). Do not catch fuel released by hub (G408). Do not cross center line in auto (G403). Do not block opponent tower access in last 30s (G420: MAJOR FOUL + opponent gets Level 3 if off ground)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description:
      'Standard play — strong fuel cycling, two climbers, light defense during opponent active shifts',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto scorer — preload 8 fuel, fast hub scoring. Winning auto = opponent hub goes active first in Shift 1, giving you time to collect fuel',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Second best auto — score fuel into hub. If reliable, attempt Level 1 tower climb at end of auto (15 pts in auto vs 10 in teleop)',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Auto fuel scoring or neutral zone collection — do not cross center line (G403: MAJOR FOUL). Human player can throw fuel from outpost during auto',
        strategy: 'strongest',
      },
      HUB_SCORER_1: {
        hint: 'Best fuel scorer — target Energized RP (≥100 fuel total). Cycle rapidly during active shifts, collect/position during inactive shifts. Coordinate with human player at chute',
        strategy: 'strongest',
      },
      HUB_SCORER_2: {
        hint: 'Support scorer — fill scoring gaps during active shifts. Use neutral zone fuel and depot. Must score from alliance zone only (G407)',
        strategy: 'strongest',
      },
      TOWER_CLIMBER_1: {
        hint: 'Best climber — aim for Level 3 (bumpers above MID RUNG at 45in, 30 pts) or Level 2 (above LOW RUNG at 27in, 20 pts). Start climbing with ~15s left in end game. Can only grab rungs & uprights (G412)',
        strategy: 'strongest',
      },
      TOWER_CLIMBER_2: {
        hint: "Second climber — need combined ≥50 tower pts for Traversal RP. Level 2 (20 pts) or Level 1 (10 pts). Do not support another robot's weight while climbing (G414: no tower points)",
        strategy: 'strongest',
      },
      DEFENSE_ROLE: {
        hint: 'Weakest scorer plays light defense during opponent active hub shifts — block hub access or disrupt fuel collection. Observe PIN limit (G418: 3s max, 72in separation to reset). Do not collude with partner to block both bumps or both trenches (G419: MAJOR FOUL per 3s). Transition to tower climb before last 30s',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Defender: observe 3s PIN limit and 72in separation (G418). Do not block opponent tower in last 30s (G420). All robots: score only from alliance zone (G407). Do not use fuel to impede opponent tower (G404: MAJOR FOUL)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'aggressive',
    label: 'Aggressive',
    description:
      'Max ceiling — rapid fuel cycling for Supercharged RP, Level 3 climbs, dedicated defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto — preload 8 fuel, maximum scoring speed. Winning auto controls hub shift order. Every fuel scored in auto counts toward Energized/Supercharged RP',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Aggressive auto — score fuel fast then attempt Level 1 tower climb (15 pts in auto). Human player throws additional fuel from outpost area during auto (G425)',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Contest neutral zone fuel — collect and score quickly. Do not cross center line to contact opponents (G403: MAJOR FOUL). Position to control fuel supply for teleop',
        strategy: 'strongest',
      },
      HUB_SCORER_1: {
        hint: 'Fastest fuel cycles — target Supercharged RP (≥360 fuel). Coordinate with human player throwing from outpost for continuous supply. Collect aggressively from neutral zone during inactive shifts',
        strategy: 'strongest',
      },
      HUB_SCORER_2: {
        hint: 'Aggressive hub scoring — use depot and human player chute feeds. Hub recycles fuel through exits into neutral zone — collect and re-score. Must stay in alliance zone to score (G407)',
        strategy: 'strongest',
      },
      TOWER_CLIMBER_1: {
        hint: 'Level 3 tower climb (bumpers above MID RUNG at 45in, 30 pts) — can climb from inside the tower. Only grab rungs & uprights (G412: MAJOR FOUL + YELLOW CARD for other field elements). G420 protects climbers in last 30s',
        strategy: 'strongest',
        epaRankKeysOverride: ['endgame_points'],
      },
      TOWER_CLIMBER_2: {
        hint: "Level 3 or Level 2 tower climb — need combined ≥50 tower pts for Traversal RP (e.g. L3+L2=50 or L3+L3=60). Do not support another robot's weight (G414). Can score fuel into hub while climbing if in alliance zone (G407)",
        strategy: 'strongest',
        epaRankKeysOverride: ['endgame_points'],
      },
      DEFENSE_ROLE: {
        hint: 'Dedicated defender during opponent active hub shifts — block hub access, disrupt opponent fuel cycling over bumps/through trenches. PIN limit 3s then separate 72in (G418). A single robot blocking one area is legal; 2 robots blocking both bumps or both trenches is not (G419). Transition to climb before last 30s (G420 tower protection begins)',
        strategy: 'weakest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Defender: release PINs before 3s (G418), never collude to block both passage routes (G419: MAJOR FOUL per 3s). Stay away from opponent tower in last 30s (G420: MAJOR FOUL + opponent gets Level 3 if off ground). All robots: never score from neutral zone (G407: MAJOR FOUL). Do not eject fuel from field (G405). Do not catch hub-released fuel (G408)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'fuel-blitz',
    label: 'Fuel Blitz',
    description:
      'Max fuel scoring — all 3 robots shoot non-stop, only 1 quick tower climb, skip defense',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Fastest auto scorer — preload 8 fuel, dump into hub immediately. Every auto fuel counts toward Energized (≥100) and Supercharged (≥360) thresholds',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Second auto scorer — preload 8 fuel, score quickly. Coordinate starting positions to avoid congestion at hub',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Third auto scorer — preload 8 fuel, score into hub. All 3 robots scoring in auto maximizes early fuel count and wins hub shift order',
        strategy: 'strongest',
      },
      HUB_SCORER_1: {
        hint: 'Primary fuel machine — cycle fuel relentlessly during active hub shifts. Use depot, neutral zone, and human player chute. Target Supercharged RP (≥360 fuel). Collect during inactive shifts, score during active',
        strategy: 'strongest',
      },
      HUB_SCORER_2: {
        hint: 'Second fuel machine — coordinate with human player throwing from outpost. Hub recycles fuel through exits into neutral zone — collect and re-score continuously. Must score from alliance zone only (G407)',
        strategy: 'strongest',
      },
      TOWER_CLIMBER_1: {
        hint: 'Quick Level 1 climb only (bumpers off carpet, 10 pts) — do not waste time on higher levels. Continue scoring fuel until last ~10s, then grab rung. Prioritize fuel volume over tower points',
        strategy: 'weakest',
        epaRankKeysOverride: ['teleop_points'],
      },
      TOWER_CLIMBER_2: {
        hint: 'Skip climbing entirely — keep scoring fuel through end of match. The alliance trades Traversal RP for higher fuel totals toward Supercharged RP (≥360)',
        strategy: 'skip',
      },
      DEFENSE_ROLE: {
        hint: 'No defense — all 3 robots focus exclusively on fuel scoring throughout the match',
        strategy: 'skip',
      },
      FOUL_DISCIPLINE: {
        hint: 'All robots: score only from alliance zone (G407: MAJOR FOUL if not). Do not catch fuel released by hub (G408). Do not eject fuel from field (G405). Stay clear of opponent tower in last 30s (G420)',
        strategy: 'all',
      },
    },
  },
  {
    name: 'tower-sweep',
    label: 'Tower Sweep',
    description:
      'Tower-focused — all 3 robots climb for guaranteed Traversal RP, moderate fuel scoring',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto scorer — preload fuel, score into hub. Winning auto gives favorable shift order for fuel collection before climbing',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Auto scorer — score preloaded fuel. If reliable, attempt Level 1 tower climb at end of auto (15 pts in auto vs 10 in teleop)',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Auto fuel or neutral zone collection — build fuel count early so robots can transition to climbing sooner in end game',
        strategy: 'weakest',
      },
      HUB_SCORER_1: {
        hint: 'Teleop fuel scoring — target Energized RP (≥100 fuel) minimum. Score aggressively during early shifts, then transition to tower with ~20s remaining',
        strategy: 'strongest',
      },
      HUB_SCORER_2: {
        hint: 'Support fuel scorer — focus on reaching ≥100 fuel total for Energized RP. Coordinate with human player at chute. Transition to tower early to allow time for Level 3 attempt',
        strategy: 'strongest',
      },
      TOWER_CLIMBER_1: {
        hint: 'Level 3 climb (bumpers above MID RUNG at 45in, 30 pts) — best climber takes highest level. Start climbing with ~20s left. Only grab rungs & uprights (G412). G420 protects climbers in last 30s',
        strategy: 'strongest',
        epaRankKeysOverride: ['endgame_points'],
      },
      TOWER_CLIMBER_2: {
        hint: "Level 3 or Level 2 climb (20-30 pts) — 3 robots climbing guarantees Traversal RP (≥50 pts easily: e.g. L3+L2+L1=60). Do not support another robot's weight (G414: no tower points). Can climb from inside the tower",
        strategy: 'strongest',
        epaRankKeysOverride: ['endgame_points'],
      },
      DEFENSE_ROLE: {
        hint: 'No defense — all 3 robots split time between fuel scoring and tower climbing. The weakest scorer should also climb (third climber fills slot not shown here)',
        strategy: 'skip',
      },
      FOUL_DISCIPLINE: {
        hint: "All robots: score only from alliance zone (G407). Do not grab field elements other than rungs/uprights while climbing (G412: MAJOR FOUL + YELLOW CARD). Do not support another robot's weight on tower (G414). Stay clear of opponent tower in last 30s (G420)",
        strategy: 'all',
      },
    },
  },
  {
    name: 'lockdown',
    label: 'Lockdown',
    description:
      'Heavy defense — 1 strong scorer, 1 roaming defender, 1 flex defender/scorer, disrupt opponent fuel access',
    assignments: {
      AUTO_ROLE_1: {
        hint: 'Best auto scorer — preload 8 fuel, score all into hub. Winning auto is critical even in defensive strategy to control hub shift order',
        strategy: 'strongest',
      },
      AUTO_ROLE_2: {
        hint: 'Score preloaded fuel in auto — every point matters when running fewer scorers in teleop. Stay on own side of center line (G403)',
        strategy: 'strongest',
      },
      AUTO_ROLE_3: {
        hint: 'Simple auto — score what you can or collect neutral zone fuel. Prepare to transition to defense role immediately when teleop begins',
        strategy: 'weakest',
      },
      HUB_SCORER_1: {
        hint: 'Solo primary scorer — cycle fuel as fast as possible to compensate for 2 robots on defense. Use depot and human player chute for steady supply. Target Energized RP (≥100 fuel) minimum',
        strategy: 'strongest',
      },
      HUB_SCORER_2: {
        hint: 'Flex role — score fuel during your own active shifts, then switch to disrupting opponents during their active shifts. Collect neutral zone fuel to deny it to opponents when possible',
        strategy: 'weakest',
      },
      TOWER_CLIMBER_1: {
        hint: 'Primary scorer climbs Level 2+ (≥20 pts) near end of match. Start climbing with ~15s left. Defenders may not have reliable climbers — prioritize this robot reaching the tower',
        strategy: 'strongest',
        epaRankKeysOverride: ['endgame_points'],
      },
      TOWER_CLIMBER_2: {
        hint: 'Defender attempts Level 1 climb (10 pts) if possible. If unreliable climber, skip and let primary scorer handle tower points. Traversal RP (≥50 pts) is stretch goal in this strategy',
        strategy: 'weakest',
      },
      DEFENSE_ROLE: {
        hint: 'Primary defender — disrupt opponent hub scoring during their active shifts. Block hub access, impede fuel collection at bumps/trenches. PIN limit 3s then 72in separation (G418). Never collude with second defender to block both bumps or both trenches simultaneously (G419: MAJOR FOUL per 3s). Transition away from opponent tower before last 30s (G420)',
        strategy: 'strongest',
      },
      FOUL_DISCIPLINE: {
        hint: 'Defenders: release PINs before 3s (G418), separate 72in to reset. Never collude to block both passage routes (G419: MAJOR FOUL per 3s). Vacate opponent tower area before last 30s (G420: MAJOR FOUL + opponent gets Level 3 if off ground). Do not use fuel as tool to impede opponents (G404: MAJOR FOUL). All robots: score from alliance zone only (G407)',
        strategy: 'all',
      },
    },
  },
];

const gameSpecificMetrics: GameMetricDefinition[] = [
  {
    key: 'auto_fuel_count',
    label: 'Auto Fuel',
    description: 'Fuel scored in auto (counts toward Energized/Supercharged RP)',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'teleop_fuel_count',
    label: 'Teleop Fuel',
    description: 'Fuel scored in teleop active hub shifts',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'total_fuel_count',
    label: 'Total Fuel',
    description: 'Total fuel scored in active hub (Energized ≥100, Supercharged ≥360)',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'hub_points',
    label: 'Hub Points',
    description: 'Points from fuel scored in active hub (1 pt each)',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'tower_climb_points',
    label: 'Tower Climb',
    description: 'Tower points (L1=10/15, L2=20, L3=30; Traversal RP ≥50)',
    renderLocation: 'briefing',
    higherIsBetter: true,
  },
  {
    key: 'foul_count',
    label: 'Fouls',
    description: 'Fouls committed (MINOR=5 pts, MAJOR=15 pts to opponent)',
    renderLocation: 'picklist',
    higherIsBetter: false,
  },
];

const rebuilt2026: GameDefinition = {
  year: 2026,
  gameName: 'REBUILT',

  // TBA field names are best-guess; update when TBA publishes 2026 score_breakdown schema
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
        hub_points:
          num(raw['hubPoints']) || num(raw['autoHubPoints']) + num(raw['teleopHubPoints']),
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
