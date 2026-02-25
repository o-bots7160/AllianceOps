import type { GameDefinition } from '../types/game-definition.js';

const adapters = new Map<number, GameDefinition>();

export function registerAdapter(adapter: GameDefinition): void {
  adapters.set(adapter.year, adapter);
}

export function getAdapter(year: number): GameDefinition {
  const adapter = adapters.get(year);
  if (!adapter) {
    throw new Error(`No GameDefinition adapter registered for year ${year}`);
  }
  return adapter;
}

export function getAvailableYears(): number[] {
  return Array.from(adapters.keys()).sort((a, b) => b - a);
}
