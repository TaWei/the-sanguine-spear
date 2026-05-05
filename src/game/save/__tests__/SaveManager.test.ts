import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../SaveManager';
import { SaveData } from '../SaveData';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('SaveManager', () => {
  beforeEach(() => { localStorageMock.clear(); });

  it('saves and loads data', () => {
    const mgr = new SaveManager();
    const data: SaveData = {
      version: 1, timestamp: 1000, levelId: 'level-1',
      turnNumber: 1, currentPhase: 'player',
      gridCols: 8, gridRows: 8, terrain: [], units: [],
      consumedTriggers: [], firstCombatOccurred: false,
    };
    mgr.save('slot_0', data);
    const loaded = mgr.load('slot_0');
    expect(loaded).not.toBeNull();
    expect(loaded!.levelId).toBe('level-1');
    expect(loaded!.timestamp).toBe(1000);
  });

  it('lists all saves', () => {
    const mgr = new SaveManager();
    mgr.save('slot_0', { version: 1, timestamp: 1000, levelId: 'level-1', turnNumber: 1, currentPhase: 'player', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: false });
    mgr.save('slot_1', { version: 1, timestamp: 2000, levelId: 'level-2', turnNumber: 3, currentPhase: 'enemy', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: true });
    const list = mgr.listSaves();
    expect(list).toHaveLength(2);
    expect(list[0].slot).toBe('slot_0');
    expect(list[1].slot).toBe('slot_1');
  });

  it('deletes a save', () => {
    const mgr = new SaveManager();
    mgr.save('slot_0', { version: 1, timestamp: 1000, levelId: 'level-1', turnNumber: 1, currentPhase: 'player', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: false });
    mgr.delete('slot_0');
    expect(mgr.load('slot_0')).toBeNull();
    expect(mgr.listSaves()).toHaveLength(0);
  });

  it('returns null for missing save', () => {
    const mgr = new SaveManager();
    expect(mgr.load('slot_99')).toBeNull();
  });

  it('rejects save data with wrong version', () => {
    const mgr = new SaveManager();
    const badData = { version: 999, timestamp: 1000, levelId: 'level-1', turnNumber: 1, currentPhase: 'player', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: false } as SaveData;
    mgr.save('slot_bad', badData);
    expect(mgr.load('slot_bad')).toBeNull();
  });

  it('generates save metadata for UI', () => {
    const mgr = new SaveManager();
    mgr.save('slot_0', { version: 1, timestamp: 1000, levelId: 'level-1', turnNumber: 5, currentPhase: 'player', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: false });
    const list = mgr.listSaves();
    expect(list[0].meta.turnNumber).toBe(5);
    expect(list[0].meta.currentPhase).toBe('player');
    expect(list[0].meta.levelId).toBe('level-1');
  });
});
