import { describe, it, expect } from 'vitest';
import { TradeEngine, TradeResult } from '../TradeEngine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { createWeaponItem, createRecoveryItem } from '../../items/ItemTypes';

function makeUnit(id: string, name: string, faction: Faction, x: number, y: number): Unit {
  const stats = createStats({
    hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
  });
  return new Unit(id, name, faction, UnitClass.LORD, stats, x, y);
}

function makeSword(name = 'Iron Sword') {
  return createWeaponItem(name, 'sword', 5, 90, 0, 1, 1, false);
}

function makeVulnerary(name = 'Vulnerary') {
  return createRecoveryItem(name, 10);
}

describe('TradeEngine', () => {
  describe('canTrade', () => {
    it('returns true for adjacent player units', () => {
      const grid = new Grid(10, 10);
      const a = makeUnit('a', 'A', Faction.PLAYER, 2, 2);
      const b = makeUnit('b', 'B', Faction.PLAYER, 3, 2);
      grid.placeUnit(a, 2, 2);
      grid.placeUnit(b, 3, 2);
      expect(TradeEngine.canTrade(a, b, grid)).toBe(true);
    });

    it('returns true for player and ally', () => {
      const grid = new Grid(10, 10);
      const a = makeUnit('a', 'A', Faction.PLAYER, 2, 2);
      const b = makeUnit('b', 'B', Faction.ALLY, 2, 3);
      grid.placeUnit(a, 2, 2);
      grid.placeUnit(b, 2, 3);
      expect(TradeEngine.canTrade(a, b, grid)).toBe(true);
    });

    it('returns false when not adjacent', () => {
      const grid = new Grid(10, 10);
      const a = makeUnit('a', 'A', Faction.PLAYER, 2, 2);
      const b = makeUnit('b', 'B', Faction.PLAYER, 5, 5);
      grid.placeUnit(a, 2, 2);
      grid.placeUnit(b, 5, 5);
      expect(TradeEngine.canTrade(a, b, grid)).toBe(false);
    });

    it('returns false with enemy unit', () => {
      const grid = new Grid(10, 10);
      const a = makeUnit('a', 'A', Faction.PLAYER, 2, 2);
      const b = makeUnit('b', 'B', Faction.ENEMY, 3, 2);
      grid.placeUnit(a, 2, 2);
      grid.placeUnit(b, 3, 2);
      expect(TradeEngine.canTrade(a, b, grid)).toBe(false);
    });

    it('returns false when diagonally adjacent', () => {
      const grid = new Grid(10, 10);
      const a = makeUnit('a', 'A', Faction.PLAYER, 2, 2);
      const b = makeUnit('b', 'B', Faction.PLAYER, 3, 3);
      grid.placeUnit(a, 2, 2);
      grid.placeUnit(b, 3, 3);
      expect(TradeEngine.canTrade(a, b, grid)).toBe(false);
    });

    it('returns false when grid position mismatch', () => {
      const grid = new Grid(10, 10);
      const a = makeUnit('a', 'A', Faction.PLAYER, 2, 2);
      const b = makeUnit('b', 'B', Faction.PLAYER, 3, 2);
      grid.placeUnit(a, 2, 2);
      // b placed elsewhere on grid
      grid.placeUnit(b, 4, 4);
      expect(TradeEngine.canTrade(a, b, grid)).toBe(false);
    });
  });

  describe('trade', () => {
    it('swaps items between units', () => {
      const a = makeUnit('a', 'A', Faction.PLAYER, 0, 0);
      const b = makeUnit('b', 'B', Faction.PLAYER, 0, 0);
      a.inventory.add(makeSword('SwordA'));
      b.inventory.add(makeSword('SwordB'));

      const result = TradeEngine.trade(a, 0, b, 0);
      expect(result.success).toBe(true);
      expect(a.inventory.items[0].name).toBe('SwordB');
      expect(b.inventory.items[0].name).toBe('SwordA');
    });

    it('allows giving when recipient has space', () => {
      const a = makeUnit('a', 'A', Faction.PLAYER, 0, 0);
      const b = makeUnit('b', 'B', Faction.PLAYER, 0, 0);
      a.inventory.add(makeSword('SwordA'));

      const result = TradeEngine.trade(a, 0, b, -1);
      expect(result.success).toBe(true);
      expect(a.inventory.size).toBe(0);
      expect(b.inventory.items[0].name).toBe('SwordA');
    });

    it('allows receiving when recipient has space', () => {
      const a = makeUnit('a', 'A', Faction.PLAYER, 0, 0);
      const b = makeUnit('b', 'B', Faction.PLAYER, 0, 0);
      b.inventory.add(makeSword('SwordB'));

      const result = TradeEngine.trade(a, -1, b, 0);
      expect(result.success).toBe(true);
      expect(a.inventory.items[0].name).toBe('SwordB');
      expect(b.inventory.size).toBe(0);
    });

    it('fails when giver has no item at index', () => {
      const a = makeUnit('a', 'A', Faction.PLAYER, 0, 0);
      const b = makeUnit('b', 'B', Faction.PLAYER, 0, 0);

      const result = TradeEngine.trade(a, 0, b, -1);
      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('fails when recipient is full and not swapping (give)', () => {
      const a = makeUnit('a', 'A', Faction.PLAYER, 0, 0);
      const b = makeUnit('b', 'B', Faction.PLAYER, 0, 0);
      a.inventory.add(makeSword('SwordA'));
      for (let i = 0; i < 5; i++) {
        b.inventory.add(makeVulnerary(`Vuln${i}`));
      }
      expect(b.inventory.isFull).toBe(true);

      const result = TradeEngine.trade(a, 0, b, -1);
      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
      expect(a.inventory.size).toBe(1);
      expect(b.inventory.size).toBe(5);
    });

    it('fails when recipient is full and not swapping (receive)', () => {
      const a = makeUnit('a', 'A', Faction.PLAYER, 0, 0);
      const b = makeUnit('b', 'B', Faction.PLAYER, 0, 0);
      for (let i = 0; i < 5; i++) {
        a.inventory.add(makeVulnerary(`Vuln${i}`));
      }
      b.inventory.add(makeSword('SwordB'));
      expect(a.inventory.isFull).toBe(true);

      const result = TradeEngine.trade(a, -1, b, 0);
      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
      expect(a.inventory.size).toBe(5);
      expect(b.inventory.size).toBe(1);
    });

    it('swap succeeds even when both inventories are full', () => {
      const a = makeUnit('a', 'A', Faction.PLAYER, 0, 0);
      const b = makeUnit('b', 'B', Faction.PLAYER, 0, 0);
      a.inventory.add(makeSword('SwordA'));
      for (let i = 0; i < 4; i++) {
        a.inventory.add(makeVulnerary(`AVuln${i}`));
      }
      b.inventory.add(makeSword('SwordB'));
      for (let i = 0; i < 4; i++) {
        b.inventory.add(makeVulnerary(`BVuln${i}`));
      }
      expect(a.inventory.isFull).toBe(true);
      expect(b.inventory.isFull).toBe(true);

      const result = TradeEngine.trade(a, 0, b, 0);
      expect(result.success).toBe(true);
      expect(a.inventory.items[0].name).toBe('SwordB');
      expect(b.inventory.items[0].name).toBe('SwordA');
      expect(a.inventory.size).toBe(5);
      expect(b.inventory.size).toBe(5);
    });
  });
});
