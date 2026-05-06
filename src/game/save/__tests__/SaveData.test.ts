import { describe, it, expect } from 'vitest';
import type { SaveData } from '../SaveData';
import { SAVE_VERSION } from '../SaveData';

describe('SaveData', () => {
  it('has a current version constant', () => {
    expect(SAVE_VERSION).toBe(1);
  });

  it('can construct a minimal valid SaveData object', () => {
    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      levelId: 'level-1',
      turnNumber: 1,
      currentPhase: 'player',
      gridCols: 16,
      gridRows: 12,
      terrain: [{ x: 0, y: 0, type: 'plains' }],
      units: [],
      consumedTriggers: [],
      firstCombatOccurred: false,
    };
    expect(data.version).toBe(1);
    expect(data.levelId).toBe('level-1');
  });
});
