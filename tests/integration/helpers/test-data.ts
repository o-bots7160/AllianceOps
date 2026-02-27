/**
 * Test data constants shared across integration tests.
 */

/** Ludington O-Bots */
export const TEAM_7160_NUMBER = 7160;

/** Mechanical Advantage */
export const TEAM_6328_NUMBER = 6328;

/** Competition year — switch to 2026 when competition data exists */
export const YEAR = 2025;

/** FIM District Big Rapids event key (matches sim data) */
export const EVENT_KEY = '2025mibig';

/** Nonsensical event key for negative tests */
export const INVALID_EVENT_KEY = '9999xxinvalid';

/** Nonsensical team number for negative tests */
export const INVALID_TEAM_NUMBER = 99999;

/**
 * Shared mutable state populated by global setup.
 * Tests import this to get team IDs and invite codes created during bootstrap.
 */
export const sharedState: {
  team7160Id: string;
  team6328Id: string;
  inviteCode7160: string;
} = {
  team7160Id: '',
  team6328Id: '',
  inviteCode7160: '',
};
