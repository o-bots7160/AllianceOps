import type {
  GameDefinition,
  GenericBreakdown,
  DutySlotDefinition,
  DutyTemplate,
  GameMetricDefinition,
  ScoutingFieldDefinition,
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
    key: 'ENDGAME_1',
    label: 'Endgame 1',
    description:
      'Robot 1 endgame action — climb tower, continue scoring, or play defense based on EPA',
    category: 'endgame',
    epaRankKeys: ['total_tower'],
  },
  {
    key: 'ENDGAME_2',
    label: 'Endgame 2',
    description:
      'Robot 2 endgame action — climb tower, continue scoring, or play defense based on EPA',
    category: 'endgame',
    epaRankKeys: ['total_tower'],
  },
  {
    key: 'ENDGAME_3',
    label: 'Endgame 3',
    description:
      'Robot 3 endgame action — climb tower, continue scoring, or play defense based on EPA',
    category: 'endgame',
    epaRankKeys: ['total_tower'],
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
      ENDGAME_1: {
        hint: 'If tower EPA is strong, climb Level 2+ (20+ pts). If teleop/fuel EPA exceeds tower, continue scoring fuel through endgame. Low EPA in both — consider defense',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
      },
      ENDGAME_2: {
        hint: 'If tower EPA is strong, climb Level 1 minimum (10 pts) for Traversal RP. If fuel EPA is higher, keep scoring. Low EPA — consider defense',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
      },
      ENDGAME_3: {
        hint: 'If tower EPA is strong, climb for Traversal RP (≥50 tower pts total). If fuel EPA is higher, keep scoring. Low EPA — consider defense',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
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
      ENDGAME_1: {
        hint: 'If tower EPA is strong, aim for Level 3 (30 pts) or Level 2 (20 pts). If teleop/fuel EPA exceeds tower, keep scoring fuel. Low EPA — play defense instead',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
      },
      ENDGAME_2: {
        hint: 'If tower EPA is strong, climb for Traversal RP (≥50 tower pts total). If fuel EPA is higher, keep scoring. Low EPA — play defense or stay out of the way',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
      },
      ENDGAME_3: {
        hint: 'If tower EPA is strong, climb Level 1+ for Traversal RP. If fuel EPA is higher, continue scoring. Low EPA — transition to defense',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
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
      ENDGAME_1: {
        hint: 'If tower EPA is strong, push for Level 3 (30 pts). If teleop/fuel EPA exceeds tower, maximize fuel scoring through endgame. Low EPA — play aggressive defense instead',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
      },
      ENDGAME_2: {
        hint: 'If tower EPA is strong, climb Level 3 or Level 2 for Traversal RP (≥50 tower pts). If fuel EPA is higher, keep scoring toward Supercharged RP. Low EPA — play defense',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
      },
      ENDGAME_3: {
        hint: 'If tower EPA is strong, climb for Traversal RP. If fuel EPA is higher, continue scoring. Low EPA — transition to defense',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
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
      ENDGAME_1: {
        hint: 'Continue scoring fuel through endgame — skip tower climb. Prioritize fuel volume toward Supercharged RP (≥360)',
        strategy: 'strongest',
        epaRankKeysOverride: ['total_fuel'],
      },
      ENDGAME_2: {
        hint: 'Continue scoring fuel through endgame — skip tower climb. Every fuel scored counts toward Supercharged RP',
        strategy: 'strongest',
        epaRankKeysOverride: ['total_fuel'],
      },
      ENDGAME_3: {
        hint: 'Quick Level 1 climb (10 pts) only if time allows in last ~10s. Otherwise keep scoring fuel. Traversal RP is sacrificed for fuel volume',
        strategy: 'weakest',
        epaRankKeysOverride: ['total_fuel'],
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
      ENDGAME_1: {
        hint: 'Level 3 climb (30 pts) — best climber takes highest level. Start climbing with ~20s left. Only grab rungs & uprights (G412). G420 protects climbers in last 30s',
        strategy: 'strongest',
        epaRankKeysOverride: ['total_tower'],
      },
      ENDGAME_2: {
        hint: 'Level 3 or Level 2 climb (20-30 pts) — 3 robots climbing guarantees Traversal RP (≥50 pts easily: e.g. L3+L2+L1=60). Can climb from inside the tower',
        strategy: 'strongest',
        epaRankKeysOverride: ['total_tower'],
      },
      ENDGAME_3: {
        hint: "Level 2 or Level 1 climb (10-20 pts) — third climber for guaranteed Traversal RP. Do not support another robot's weight (G414: no tower points)",
        strategy: 'strongest',
        epaRankKeysOverride: ['total_tower'],
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
      ENDGAME_1: {
        hint: 'Primary scorer climbs Level 2+ (≥20 pts) near end of match. Start climbing with ~15s left. Prioritize this robot reaching the tower',
        strategy: 'endgame_smart',
        epaRankKeysOverride: ['total_tower'],
        scoringKeysOverride: ['teleop_fuel', 'total_fuel'],
      },
      ENDGAME_2: {
        hint: 'Defender — skip climb, continue disrupting opponents through endgame. Traversal RP is a stretch goal in this strategy',
        strategy: 'weakest',
      },
      ENDGAME_3: {
        hint: 'Second defender — skip climb, play defense through endgame. Only attempt Level 1 (10 pts) if match is secure',
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
    key: 'auto_fuel',
    label: 'Auto Fuel',
    description: 'Fuel scored in auto (counts toward Energized/Supercharged RP)',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'teleop_fuel',
    label: 'Teleop Fuel',
    description: 'Fuel scored in teleop active hub shifts',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'total_fuel',
    label: 'Total Fuel',
    description: 'Total fuel scored in active hub (Energized ≥100, Supercharged ≥360)',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'total_tower',
    label: 'Tower Pts',
    description: 'Tower points (L1=10/15, L2=20, L3=30; Traversal RP ≥50)',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'energized_rp',
    label: 'Energized RP',
    description: 'EPA contribution toward Energized RP (≥100 fuel)',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'supercharged_rp',
    label: 'Supercharged RP',
    description: 'EPA contribution toward Supercharged RP (≥360 fuel)',
    renderLocation: 'team_card',
    higherIsBetter: true,
  },
  {
    key: 'traversal_rp',
    label: 'Traversal RP',
    description: 'EPA contribution toward Traversal RP (≥50 tower pts)',
    renderLocation: 'team_card',
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

const scoutingFields: ScoutingFieldDefinition[] = [
  // General (robot characteristics)
  {
    key: 'robot_weight',
    label: 'Robot Weight (lbs)',
    description:
      'Record the total robot weight in pounds. Ask the team or check their pit display — weight affects pushing power and traction.',
    type: 'number',
    category: 'general',
  },
  {
    key: 'drive_system',
    label: 'Drive System',
    description:
      'Identify the drivetrain type by looking at the wheels and movement. Swerve robots can strafe sideways; tank drives only go forward/back and turn.',
    type: 'select',
    options: [
      'Swerve / Holonomic',
      'West Coast',
      'East Coast',
      'Tank',
      'Mecanum',
      'H-Drive',
      'Butterfly / Switchable',
      'Other',
    ],
    category: 'general',
  },
  {
    key: 'tuning_practices',
    label: 'Tuning Practices',
    description:
      'Ask the team how they tune their robot controls. Select all methods they mention — this tells us how refined their driving is.',
    type: 'multi-select',
    options: ['SysId', 'PID', 'Feed Forward', 'Manual'],
    category: 'general',
  },
  {
    key: 'vision_system',
    label: 'Robot Vision System',
    description:
      'Note any cameras or vision processing on the robot. More cameras and odometry mean better autonomous accuracy and field awareness.',
    type: 'multi-select',
    options: [
      'None',
      'One Camera',
      'Multiple Cameras',
      'Odometry-Based',
      'Custom Calibrated AprilTags',
    ],
    category: 'general',
  },
  {
    key: 'defense_options',
    label: 'Defense Options',
    description:
      'Select all zones where this robot could play defense. "Defense Only" means they primarily block; "Last Resort" means defense only if scoring isn\'t working.',
    type: 'multi-select',
    options: [
      'Neutral Zone',
      'Own Alliance',
      'Opposing Alliance',
      'Defense Only',
      'Last Resort',
    ],
    category: 'general',
  },
  // Auto
  {
    key: 'auto_fuel_observed',
    label: 'Auton # Fuel',
    description:
      'Count the number of fuel pieces scored during autonomous. Watch closely — auton is fast and easy to miss.',
    type: 'number',
    category: 'auto',
    epaKey: 'auto_fuel',
  },
  {
    key: 'drives_neutral',
    label: 'Drives into Neutral Zone?',
    description:
      'Does the robot cross into the neutral zone during autonomous? This shows how aggressive their auton routine is.',
    type: 'select',
    options: ['Yes', 'No'],
    category: 'auto',
  },
  {
    key: 'preferred_auton_route',
    label: 'Preferred Auton Route',
    description:
      'Select all autonomous routines you observe across matches. Knowing their routes helps us avoid path conflicts with alliance partners.',
    type: 'multi-select',
    options: [
      'Right side under trench',
      'Right side over bump',
      'Left side under trench',
      'Left side over bump',
      'Moves to output',
      'Moves to depot',
      'Autoshoots',
      'Multiple gathering phases',
      'Sit and shoot',
      'Climbs',
    ],
    category: 'auto',
  },
  // Teleop
  {
    key: 'teleop_fuel_observed',
    label: '# of Fuel During Teleop',
    description:
      'Average number of fuel pieces scored during teleop. Try to count across multiple matches for a reliable estimate.',
    type: 'number',
    category: 'teleop',
    epaKey: 'teleop_fuel',
  },
  {
    key: 'fuel_source',
    label: 'Where is Fuel Acquired?',
    description:
      'Note which zones the robot collects fuel from. This helps plan who gathers from where during alliance strategy.',
    type: 'multi-select',
    options: ['Neutral Zone', 'Alliance Zone'],
    category: 'teleop',
  },
  {
    key: 'teleop_autonomous_actions',
    label: 'Autonomous Actions (Teleop)',
    description:
      'Select any automated behaviors the robot uses during teleop. These indicate software sophistication and reduce driver workload.',
    type: 'multi-select',
    options: [
      'Automated Driving / Drive Locations',
      'Automated Intake / Shooting Cycle',
      'Turret Tracking',
      'Distance Tracking for Shooting',
      'Auto-Alignment to Target',
      'Path Planning / Obstacle Avoidance',
      'Automated Defense Positioning',
    ],
    category: 'teleop',
  },
  // Endgame
  {
    key: 'robot_climb',
    label: 'Robot Climb?',
    description:
      'Can this robot climb the tower at end of match? "Maybe" means they attempted but weren\'t consistent.',
    type: 'select',
    options: ['Yes', 'No', 'Maybe'],
    category: 'endgame',
    epaKey: 'total_tower',
  },
  {
    key: 'climb_level',
    label: 'Climb Level',
    description:
      'Record the highest tower level they successfully reached. Only count levels they fully completed, not attempts.',
    type: 'select',
    options: ['Level 1', 'Level 2', 'Level 3'],
    category: 'endgame',
    epaKey: 'total_tower',
  },
  {
    key: 'endgame_strategy',
    label: 'Endgame Strategy',
    description:
      'What does this robot typically do in the last 30 seconds? Pick the primary strategy you observe across matches.',
    type: 'select',
    options: ['Climb', 'Shoot Fuel', 'Defense / Guard'],
    category: 'endgame',
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
        auto_fuel: num(raw['autoFuelCount']),
        teleop_fuel: num(raw['teleopFuelCount']),
        total_fuel: num(raw['autoFuelCount']) + num(raw['teleopFuelCount']),
        total_tower: num(raw['towerClimbPoints']) || num(raw['endgamePoints']),
        foul_count: num(raw['foulCount']),
      },
    };
  },

  dutySlots,
  dutyTemplates,
  gameSpecificMetrics,
  scoutingFields,
};

registerAdapter(rebuilt2026);

export default rebuilt2026;
