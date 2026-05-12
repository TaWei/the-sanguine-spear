import { describe, it, expect } from 'vitest';
import { TradeEngine } from '../TradeEngine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { createWeaponItem } from '../../items/ItemTypes';

describe('TradeEngine', () => {
  const makeUnit = (id: string, faction: Faction, x: number, y: number) => {
    const stats = createStats({
      hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
    });
    return new Unit(id, id, faction, UnitClass.LORD, stats, x, y);
  };

  const sword = () => createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
  const lance = () => createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false);

  it('canTrade returns false for enemies', () => {
    const grid = new Grid(16, 12);
    const player = makeUnit('p1', Faction.PLAYER, 5, 5);
    const enemy = makeUnit('e1', Faction.ENEMY, 6, 5);
    grid.placeUnit(player, 5, 5);
    grid.placeUnit(enemy, 6, 5);
    expect(TradeEngine.canTrade(player, enemy, grid)).toBe(false);
  });

  it('canTrade returns true for adjacent player units', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 6, 5);
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 6, 5);
    expect(TradeEngine.canTrade(a, b, grid)).toBe(true);
  });

  it('canTrade returns false for non-adjacent units', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 7, 5);
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 7, 5);
    expect(TradeEngine.canTrade(a, b, grid)).toBe(false);
  });

  it('swaps items between units', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 6, 5);
    a.inventory.add(sword());
    b.inventory.add(lance());
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 6, 5);

    const result = TradeEngine.trade(a, 0, b, 0);
    expect(result.success).toBe(true);
    expect(a.inventory.items[0].name).toBe('Iron Lance');
    expect(b.inventory.items[0].name).toBe('Iron Sword');
  });

  it('A gives item to B', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 6, 5);
    a.inventory.add(sword());
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 6, 5);

    const result = TradeEngine.trade(a, 0, b, -1);
    expect(result.success).toBe(true);
    expect(a.inventory.size).toBe(0);
    expect(b.inventory.items[0].name).toBe('Iron Sword');
  });

  it('A receives item from B', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 6, 5);
    b.inventory.add(lance());
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 6, 5);

    const result = TradeEngine.trade(a, -1, b, 0);
    expect(result.success).toBe(true);
    expect(a.inventory.items[0].name).toBe('Iron Lance');
    expect(b.inventory.size).toBe(0);
  });

  it('swap fails with invalid index on A', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 6, 5);
    a.inventory.add(sword());
    b.inventory.add(lance());
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 6, 5);

    const result = TradeEngine.trade(a, 5, b, 0);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('invalid_index');
    expect(a.inventory.size).toBe(1);
    expect(b.inventory.size).toBe(1);
  });

  it('swap fails with invalid index on B', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 6, 5);
    a.inventory.add(sword());
    b.inventory.add(lance());
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 6, 5);

    const result = TradeEngine.trade(a, 0, b, -2);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('invalid_index');
    expect(a.inventory.size).toBe(1);
    expect(b.inventory.size).toBe(1);
  });

  it('give fails when B inventory is full', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 6, 5);
    a.inventory.add(sword());
    for (let i = 0; i < 5; i++) {
      b.inventory.add(lance());
    }
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 6, 5);

    const result = TradeEngine.trade(a, 0, b, -1);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('inventory_full');
    expect(a.inventory.size).toBe(1);
    expect(b.inventory.size).toBe(5);
  });

  it('receive fails when A inventory is full', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 6, 5);
    for (let i = 0; i < 5; i++) {
      a.inventory.add(sword());
    }
    b.inventory.add(lance());
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 6, 5);

    const result = TradeEngine.trade(a, -1, b, 0);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('inventory_full');
    expect(a.inventory.size).toBe(5);
    expect(b.inventory.size).toBe(1);
  });

  it('invalid trade when both indices are -1', () => {
    const grid = new Grid(16, 12);
    const a = makeUnit('p1', Faction.PLAYER, 5, 5);
    const b = makeUnit('p2', Faction.PLAYER, 6, 5);
    grid.placeUnit(a, 5, 5);
    grid.placeUnit(b, 6, 5);

    const result = TradeEngine.trade(a, -1, b, -1);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('invalid_trade');
  });
});
