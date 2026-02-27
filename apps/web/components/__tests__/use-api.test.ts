import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseRetryAfterMs } from '../../lib/retry-after';

describe('parseRetryAfterMs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for a null header', () => {
    expect(parseRetryAfterMs(null)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseRetryAfterMs('')).toBeNull();
  });

  it('returns null for an unparseable value', () => {
    expect(parseRetryAfterMs('not-a-date-or-number')).toBeNull();
  });

  it('converts delay-seconds to milliseconds', () => {
    expect(parseRetryAfterMs('120')).toBe(120_000);
  });

  it('converts delay-seconds of zero', () => {
    expect(parseRetryAfterMs('0')).toBe(0);
  });

  it('parses an HTTP-date string and returns ms until that date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    const futureDate = 'Wed, 01 Jan 2025 00:00:30 GMT'; // 30 s in the future
    expect(parseRetryAfterMs(futureDate)).toBe(30_000);
  });

  it('clamps an HTTP-date in the past to zero', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:01:00.000Z'));

    const pastDate = 'Wed, 01 Jan 2025 00:00:30 GMT'; // 30 s in the past
    expect(parseRetryAfterMs(pastDate)).toBe(0);
  });
});
