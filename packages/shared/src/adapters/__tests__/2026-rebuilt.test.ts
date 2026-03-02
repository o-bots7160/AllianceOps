import { describe, it, expect } from 'vitest';
import { getAdapter } from '../registry.js';
import '../2026-rebuilt.js';

const adapter = getAdapter(2026);

describe('2026 REBUILT adapter', () => {
  it('registers with correct year and name', () => {
    expect(adapter.year).toBe(2026);
    expect(adapter.gameName).toBe('REBUILT');
  });

  describe('mapScoreBreakdown', () => {
    it('maps auto, teleop, endgame, and penalty points', () => {
      const result = adapter.mapScoreBreakdown({
        autoPoints: 42,
        teleopPoints: 90,
        endgamePoints: 30,
        foulPoints: 10,
        totalPoints: 172,
      });

      expect(result.auto_points).toBe(42);
      expect(result.teleop_points).toBe(90);
      expect(result.endgame_points).toBe(30);
      expect(result.penalty_points).toBe(10);
      expect(result.misc_points).toBe(0); // 172 - 42 - 90 - 30 - 10
    });

    it('maps game-specific fuel and tower metrics', () => {
      const result = adapter.mapScoreBreakdown({
        autoPoints: 10,
        teleopPoints: 50,
        endgamePoints: 20,
        foulPoints: 0,
        totalPoints: 80,
        autoFuelCount: 8,
        teleopFuelCount: 45,
        towerClimbPoints: 20,
        foulCount: 2,
      });

      expect(result.gameSpecific).toBeDefined();
      expect(result.gameSpecific!.auto_fuel).toBe(8);
      expect(result.gameSpecific!.teleop_fuel).toBe(45);
      expect(result.gameSpecific!.total_fuel).toBe(53); // 8 + 45
      expect(result.gameSpecific!.total_tower).toBe(20);
      expect(result.gameSpecific!.foul_count).toBe(2);
    });

    it('handles missing fields gracefully (returns 0)', () => {
      const result = adapter.mapScoreBreakdown({});

      expect(result.auto_points).toBe(0);
      expect(result.teleop_points).toBe(0);
      expect(result.endgame_points).toBe(0);
      expect(result.penalty_points).toBe(0);
      expect(result.gameSpecific!.auto_fuel).toBe(0);
      expect(result.gameSpecific!.total_fuel).toBe(0);
      expect(result.gameSpecific!.total_tower).toBe(0);
    });

    it('falls back to towerClimbPoints for endgame', () => {
      const result = adapter.mapScoreBreakdown({
        towerClimbPoints: 30,
        totalPoints: 30,
      });

      expect(result.endgame_points).toBe(30);
    });
  });

  describe('gameSpecificMetrics', () => {
    const metrics = adapter.gameSpecificMetrics ?? [];

    it('defines metrics that match Statbotics breakdown keys', () => {
      const expectedKeys = [
        'auto_fuel',
        'teleop_fuel',
        'total_fuel',
        'total_tower',
        'energized_rp',
        'supercharged_rp',
        'traversal_rp',
        'foul_count',
      ];

      const actualKeys = metrics.map((m) => m.key);
      expect(actualKeys).toEqual(expectedKeys);
    });

    it('has RP metrics rendered on team_card', () => {
      const rpMetrics = metrics.filter((m) => m.key.endsWith('_rp'));
      expect(rpMetrics).toHaveLength(3);
      for (const m of rpMetrics) {
        expect(m.renderLocation).toBe('team_card');
        expect(m.higherIsBetter).toBe(true);
      }
    });

    it('has foul_count rendered on picklist with higherIsBetter=false', () => {
      const fouls = metrics.find((m) => m.key === 'foul_count');
      expect(fouls).toBeDefined();
      expect(fouls!.renderLocation).toBe('picklist');
      expect(fouls!.higherIsBetter).toBe(false);
    });

    it('every metric has label and description', () => {
      for (const m of metrics) {
        expect(m.label).toBeTruthy();
        expect(m.description).toBeTruthy();
      }
    });
  });

  describe('dutySlots', () => {
    const slots = adapter.dutySlots;

    it('defines 9 duty slots', () => {
      expect(slots).toHaveLength(9);
    });

    it('has unique slot keys', () => {
      const keys = slots.map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('covers all categories', () => {
      const categories = new Set(slots.map((s) => s.category));
      expect(categories).toContain('auto');
      expect(categories).toContain('teleop');
      expect(categories).toContain('endgame');
      expect(categories).toContain('defense');
      expect(categories).toContain('discipline');
    });

    it('tower climber slots use total_tower epaRankKeys', () => {
      const climbers = slots.filter((s) => s.key.startsWith('TOWER_CLIMBER'));
      expect(climbers).toHaveLength(2);
      for (const c of climbers) {
        expect(c.epaRankKeys).toEqual(['total_tower']);
      }
    });

    it('auto slots use auto_points epaRankKeys', () => {
      const autos = slots.filter((s) => s.key.startsWith('AUTO_ROLE'));
      expect(autos).toHaveLength(3);
      for (const a of autos) {
        expect(a.epaRankKeys).toEqual(['auto_points']);
      }
    });

    it('hub scorer slots use teleop_points epaRankKeys', () => {
      const scorers = slots.filter((s) => s.key.startsWith('HUB_SCORER'));
      expect(scorers).toHaveLength(2);
      for (const s of scorers) {
        expect(s.epaRankKeys).toEqual(['teleop_points']);
      }
    });
  });

  describe('dutyTemplates', () => {
    const templates = adapter.dutyTemplates;

    it('defines at least 3 templates (safe, balanced, aggressive)', () => {
      expect(templates.length).toBeGreaterThanOrEqual(3);
      const names = templates.map((t) => t.name);
      expect(names).toContain('safe');
      expect(names).toContain('balanced');
      expect(names).toContain('aggressive');
    });

    it('has unique template names', () => {
      const names = templates.map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('every template covers all duty slot keys', () => {
      const slotKeys = new Set(adapter.dutySlots.map((s) => s.key));
      for (const tmpl of templates) {
        const assignedKeys = new Set(Object.keys(tmpl.assignments));
        for (const key of slotKeys) {
          expect(assignedKeys.has(key)).toBe(true);
        }
      }
    });

    it('template assignments only reference valid slot keys', () => {
      const slotKeys = new Set(adapter.dutySlots.map((s) => s.key));
      for (const tmpl of templates) {
        for (const key of Object.keys(tmpl.assignments)) {
          expect(slotKeys.has(key)).toBe(true);
        }
      }
    });

    it('every template has label and description', () => {
      for (const tmpl of templates) {
        expect(tmpl.label).toBeTruthy();
        expect(tmpl.description).toBeTruthy();
      }
    });
  });
});
