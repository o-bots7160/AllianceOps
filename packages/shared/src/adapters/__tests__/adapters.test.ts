import { describe, it, expect } from 'vitest';
import { getAdapter, getAvailableYears } from '../registry.js';

// Import all adapters to ensure registration
import '../2016-stronghold.js';
import '../2017-steamworks.js';
import '../2018-power-up.js';
import '../2019-deep-space.js';
import '../2020-infinite-recharge.js';
import '../2021-infinite-recharge.js';
import '../2022-rapid-react.js';
import '../2023-charged-up.js';
import '../2024-crescendo.js';
import '../2025-reefscape.js';
import '../2026-rebuilt.js';

describe('adapter registry', () => {
  const years = getAvailableYears();

  it('registers all expected adapters', () => {
    expect(years).toContain(2016);
    expect(years).toContain(2017);
    expect(years).toContain(2018);
    expect(years).toContain(2019);
    expect(years).toContain(2020);
    expect(years).toContain(2021);
    expect(years).toContain(2022);
    expect(years).toContain(2023);
    expect(years).toContain(2024);
    expect(years).toContain(2025);
    expect(years).toContain(2026);
  });

  it('returns years in descending order', () => {
    for (let i = 1; i < years.length; i++) {
      expect(years[i - 1]).toBeGreaterThan(years[i]);
    }
  });

  it('throws for unregistered year', () => {
    expect(() => getAdapter(1999)).toThrow('No GameDefinition adapter registered for year 1999');
  });
});

describe('all adapters structural validation', () => {
  const years = getAvailableYears();

  for (const year of years) {
    describe(`${year} adapter`, () => {
      const adapter = getAdapter(year);

      it('has year and gameName', () => {
        expect(adapter.year).toBe(year);
        expect(adapter.gameName).toBeTruthy();
      });

      it('has mapScoreBreakdown function', () => {
        expect(typeof adapter.mapScoreBreakdown).toBe('function');
      });

      it('mapScoreBreakdown handles empty input', () => {
        const result = adapter.mapScoreBreakdown({});
        expect(result).toHaveProperty('auto_points');
        expect(result).toHaveProperty('teleop_points');
        expect(result).toHaveProperty('endgame_points');
        expect(result).toHaveProperty('penalty_points');
        expect(result).toHaveProperty('misc_points');
      });

      it('has at least 3 duty slots', () => {
        expect(adapter.dutySlots.length).toBeGreaterThanOrEqual(3);
      });

      it('has unique duty slot keys', () => {
        const keys = adapter.dutySlots.map((s) => s.key);
        expect(new Set(keys).size).toBe(keys.length);
      });

      it('duty slots have valid categories', () => {
        const validCategories = new Set(['auto', 'teleop', 'endgame', 'defense', 'discipline']);
        for (const slot of adapter.dutySlots) {
          expect(validCategories.has(slot.category)).toBe(true);
        }
      });

      it('has at least 3 duty templates', () => {
        expect(adapter.dutyTemplates.length).toBeGreaterThanOrEqual(3);
      });

      it('has unique template names', () => {
        const names = adapter.dutyTemplates.map((t) => t.name);
        expect(new Set(names).size).toBe(names.length);
      });

      it('template assignments reference only valid slot keys', () => {
        const slotKeys = new Set(adapter.dutySlots.map((s) => s.key));
        for (const tmpl of adapter.dutyTemplates) {
          for (const key of Object.keys(tmpl.assignments)) {
            expect(slotKeys.has(key)).toBe(true);
          }
        }
      });

      it('every template covers all slot keys', () => {
        const slotKeys = adapter.dutySlots.map((s) => s.key);
        for (const tmpl of adapter.dutyTemplates) {
          const assignedKeys = Object.keys(tmpl.assignments);
          for (const key of slotKeys) {
            expect(assignedKeys).toContain(key);
          }
        }
      });

      if (adapter.gameSpecificMetrics && adapter.gameSpecificMetrics.length > 0) {
        it('game-specific metrics have valid renderLocation', () => {
          const validLocations = new Set(['team_card', 'briefing', 'picklist', 'all']);
          for (const m of adapter.gameSpecificMetrics!) {
            expect(validLocations.has(m.renderLocation)).toBe(true);
          }
        });

        it('game-specific metrics have label and description', () => {
          for (const m of adapter.gameSpecificMetrics!) {
            expect(m.label).toBeTruthy();
            expect(m.description).toBeTruthy();
          }
        });
      }
    });
  }
});
