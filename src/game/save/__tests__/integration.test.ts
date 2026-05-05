import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../GameEngine';
import { SaveManager } from '../SaveManager';
import { Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

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

describe('Save integration', () => {
  beforeEach(() => { localStorageMock.clear(); });

  it('full gameplay save and resume', () => {
    // 1. Setup a game
    const engine = new GameEngine(8, 8);
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, createStats({
      hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
    }), 5, 5);

    // 2. Play a few turns
    engine.endTurn(); // player -> enemy
    engine.endTurn(); // enemy -> ally
    engine.endTurn(); // ally -> player (turn 2)

    // 3. Damage a unit
    const rowan = engine.getUnit(2, 5)!;
    rowan.takeDamage(7);
    rowan.hasActed = true;

    // 4. Save
    const mgr = new SaveManager();
    mgr.save('slot_0', engine.snapshot('level-1'));

    // 5. Restore into a fresh engine
    const restoredEngine = new GameEngine(1, 1);
    const loaded = mgr.load('slot_0')!;
    restoredEngine.restore(loaded);

    // 6. Assert everything matches
    expect(restoredEngine.turnManager.turnNumber).toBe(2);
    expect(restoredEngine.turnManager.currentPhase).toBe('player');
    expect(restoredEngine.getAllUnits()).toHaveLength(2);

    const restoredRowan = restoredEngine.getUnit(2, 5)!;
    expect(restoredRowan.stats.hp).toBe(15);
    expect(restoredRowan.state.isExhausted()).toBe(true);
    expect(restoredRowan.name).toBe('Rowan');

    const restoredBandit = restoredEngine.getUnit(5, 5)!;
    expect(restoredBandit.name).toBe('Bandit');
    expect(restoredBandit.faction).toBe('enemy');
    expect(restoredBandit.isAlive).toBe(true);
  });

  it('save metadata is readable by MainMenu logic', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    engine.endTurn();
    engine.endTurn();
    engine.endTurn();
    engine.endTurn(); // turn 2, enemy

    const mgr = new SaveManager();
    mgr.save('slot_1', engine.snapshot('level-2'));

    const list = mgr.listSaves();
    expect(list).toHaveLength(1);
    expect(list[0].slot).toBe('slot_1');
    expect(list[0].meta.levelId).toBe('level-2');
    expect(list[0].meta.turnNumber).toBe(2);
    expect(list[0].meta.currentPhase).toBe('enemy');
  });
});
