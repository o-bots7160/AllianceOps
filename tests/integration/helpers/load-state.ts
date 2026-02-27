/**
 * Load shared state written by the global setup.
 * Call this in beforeAll() to get team IDs and invite codes.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sharedState } from './test-data';

export function loadSharedState(): typeof sharedState {
  const stateFile = join(import.meta.dirname, '..', '.test-state', 'shared-state.json');
  try {
    const data = JSON.parse(readFileSync(stateFile, 'utf-8'));
    Object.assign(sharedState, data);
  } catch {
    // State may not be available if running tests individually
    console.warn('Could not load shared state — global setup may not have run');
  }
  return sharedState;
}
