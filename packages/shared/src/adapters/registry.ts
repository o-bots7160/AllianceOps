import type { GameDefinition } from '../types/game-definition.js';

const adapters = new Map<number, GameDefinition>();
let _initialized = false;

export function registerAdapter(adapter: GameDefinition): void {
  adapters.set(adapter.year, adapter);
  _initialized = true;
}

/**
 * Ensures all game-definition adapters are registered.
 *
 * Currently adapters register via side-effect imports in `./init.ts`, which
 * is imported once from the package barrel (`src/index.ts`). This function
 * is an explicit initialization point that enables future lazy-loading
 * without changing consumer code.
 */
export function initAdapters(): void {
  if (_initialized) return;
  _initialized = true;
}

export function getAdapter(year: number): GameDefinition {
  initAdapters();
  const adapter = adapters.get(year);
  if (!adapter) {
    throw new Error(`No GameDefinition adapter registered for year ${year}`);
  }
  return adapter;
}

export function getAvailableYears(): number[] {
  initAdapters();
  return Array.from(adapters.keys()).sort((a, b) => b - a);
}
