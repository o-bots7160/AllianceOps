import { describe, it, expect } from 'vitest';
import { applyPerMatchCellChange, computePerMatchAverage } from '../per-match-scouting';

describe('computePerMatchAverage', () => {
  it('returns null for an empty map', () => {
    expect(computePerMatchAverage({})).toBeNull();
  });

  it('returns null when the map has no numeric values', () => {
    expect(computePerMatchAverage({ a: 'x', b: null, c: undefined })).toBeNull();
  });

  it('averages a single numeric value', () => {
    expect(computePerMatchAverage({ a: 7 })).toBe(7);
  });

  it('averages multiple numeric values', () => {
    expect(computePerMatchAverage({ a: 4, b: 8 })).toBe(6);
  });

  it('rounds to two decimal places', () => {
    expect(computePerMatchAverage({ a: 1, b: 2, c: 2 })).toBe(1.67);
  });

  it('ignores non-numeric entries', () => {
    expect(computePerMatchAverage({ a: 10, b: 'x', c: null, d: 20 })).toBe(15);
  });

  it('ignores NaN and Infinity', () => {
    expect(computePerMatchAverage({ a: 4, b: NaN, c: Infinity })).toBe(4);
  });
});

describe('applyPerMatchCellChange', () => {
  it('creates a new map when previous is not an object', () => {
    expect(applyPerMatchCellChange(undefined, '2026misjo_qm1', 5)).toEqual({
      '2026misjo_qm1': 5,
    });
  });

  it('treats arrays as empty and replaces them', () => {
    expect(applyPerMatchCellChange([], '2026misjo_qm1', 3)).toEqual({
      '2026misjo_qm1': 3,
    });
  });

  it('adds a new cell to an existing map', () => {
    expect(applyPerMatchCellChange({ '2026misjo_qm1': 5 }, '2026misjo_qm2', 8)).toEqual({
      '2026misjo_qm1': 5,
      '2026misjo_qm2': 8,
    });
  });

  it('overwrites an existing cell', () => {
    expect(applyPerMatchCellChange({ '2026misjo_qm1': 5 }, '2026misjo_qm1', 9)).toEqual({
      '2026misjo_qm1': 9,
    });
  });

  it('removes a cell when value is null', () => {
    expect(
      applyPerMatchCellChange({ '2026misjo_qm1': 5, '2026misjo_qm2': 8 }, '2026misjo_qm1', null),
    ).toEqual({
      '2026misjo_qm2': 8,
    });
  });

  it('removes a cell when value is NaN', () => {
    expect(applyPerMatchCellChange({ '2026misjo_qm1': 5 }, '2026misjo_qm1', NaN)).toEqual({});
  });

  it('does not mutate the previous map', () => {
    const prev = { '2026misjo_qm1': 5 };
    const next = applyPerMatchCellChange(prev, '2026misjo_qm2', 7);
    expect(prev).toEqual({ '2026misjo_qm1': 5 });
    expect(next).not.toBe(prev);
  });
});
