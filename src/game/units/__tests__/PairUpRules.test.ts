import { describe, it, expect } from 'vitest';
import { Unit, Faction, UnitClass } from '../Unit';
import { createStats } from '../Stats';
import { PairUpState } from '../PairUpState';
import {
  canPair,
  pairUp,
  breakPair,
  getCombinationAttacker,
  getGuardDefenseBonus,
} from '../PairUpRules';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../../combat/Weapons';

function makeUnit(
  id: string,
  faction: Faction = Faction.PLAYER,
  x = 0,
  y = 0,
  overrides: Record<string, number> = {},
): Unit {
  const stats = createStats({
    hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    ...overrides,
  });
  return new Unit(id, id, faction, UnitClass.LORD, stats, x, y);
}

describe('PairUpState', () => {
  it('starts not paired', () => {
    const state = new PairUpState();
    expect(state.isPaired()).toBe(false);
    expect(state.leadUnitId).toBeNull();
    expect(state.guardUnitId).toBeNull();
  });

  it('is paired when leadUnitId is set', () => {
    const state = new PairUpState();
    state.leadUnitId = 'lead1';
    expect(state.isPaired()).toBe(true);
  });

  it('is paired when guardUnitId is set', () => {
    const state = new PairUpState();
    state.guardUnitId = 'guard1';
    expect(state.isPaired()).toBe(true);
  });

  it('clear resets both ids', () => {
    const state = new PairUpState();
    state.leadUnitId = 'lead1';
    state.guardUnitId = 'guard1';
    state.clear();
    expect(state.isPaired()).toBe(false);
    expect(state.leadUnitId).toBeNull();
    expect(state.guardUnitId).toBeNull();
  });
});

describe('canPair', () => {
  it('returns true for adjacent same-faction units', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.PLAYER, 1, 2);
    expect(canPair(a, b)).toBe(true);
  });

  it('returns false when not adjacent', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.PLAYER, 1, 3);
    expect(canPair(a, b)).toBe(false);
  });

  it('returns false for different factions', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.ENEMY, 1, 2);
    expect(canPair(a, b)).toBe(false);
  });

  it('returns false for same unit', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    expect(canPair(a, a)).toBe(false);
  });

  it('returns false if lead is already paired', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.PLAYER, 1, 2);
    const c = makeUnit('c', Faction.PLAYER, 2, 1);
    pairUp(a, b);
    expect(canPair(a, c)).toBe(false);
  });

  it('returns false if guard is already paired', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.PLAYER, 1, 2);
    const c = makeUnit('c', Faction.PLAYER, 2, 1);
    pairUp(a, b);
    expect(canPair(c, b)).toBe(false);
  });

  it('returns false if either unit is dead', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.PLAYER, 1, 2);
    a.takeDamage(999);
    expect(canPair(a, b)).toBe(false);
    expect(canPair(b, a)).toBe(false);
  });
});

describe('pairUp', () => {
  it('sets lead guardUnitId and guard leadUnitId', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.PLAYER, 1, 2);
    pairUp(a, b);
    expect(a.pairUpState.guardUnitId).toBe('b');
    expect(b.pairUpState.leadUnitId).toBe('a');
  });

  it('throws if units cannot pair', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.ENEMY, 1, 2);
    expect(() => pairUp(a, b)).toThrow();
  });
});

describe('breakPair', () => {
  it('clears pair state on both units', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.PLAYER, 1, 2);
    pairUp(a, b);
    breakPair(a, [a, b]);
    expect(a.pairUpState.isPaired()).toBe(false);
    expect(b.pairUpState.isPaired()).toBe(false);
  });

  it('does nothing if unit is not paired', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    expect(() => breakPair(a)).not.toThrow();
    expect(a.pairUpState.isPaired()).toBe(false);
  });

  it('works when called on the guard', () => {
    const a = makeUnit('a', Faction.PLAYER, 1, 1);
    const b = makeUnit('b', Faction.PLAYER, 1, 2);
    pairUp(a, b);
    breakPair(b, [a, b]);
    expect(a.pairUpState.isPaired()).toBe(false);
    expect(b.pairUpState.isPaired()).toBe(false);
  });
});

describe('getCombinationAttacker', () => {
  it('returns guard when enemy is adjacent to lead', () => {
    const grid = new Grid(8, 8);
    const lead = makeUnit('lead', Faction.PLAYER, 3, 3);
    const guard = makeUnit('guard', Faction.PLAYER, 3, 4);
    const enemy = makeUnit('enemy', Faction.ENEMY, 4, 3);
    grid.placeUnit(lead, 3, 3);
    grid.placeUnit(enemy, 4, 3);
    // Give guard a weapon so they can attack
    guard.inventory.add({ kind: 'weapon', name: 'Iron Sword', weaponType: 'sword', mt: 5, hit: 90, crit: 0, minRange: 1, maxRange: 1, usesMagic: false, durability: 46 } as any);
    pairUp(lead, guard);
    // After pairing, guard shares lead's tile
    guard.moveTo(lead.gridX, lead.gridY);
    expect(getCombinationAttacker(lead, guard, enemy, grid)).toBe(guard);
  });

  it('returns null when guard weapon cannot reach enemy', () => {
    const grid = new Grid(8, 8);
    const lead = makeUnit('lead', Faction.PLAYER, 3, 3);
    const guard = new Unit('guard', 'Guard', Faction.PLAYER, UnitClass.MAGE,
      createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 }),
      3, 4);
    const enemy = makeUnit('enemy', Faction.ENEMY, 5, 3); // 2 tiles away
    grid.placeUnit(lead, 3, 3);
    grid.placeUnit(enemy, 5, 3);
    pairUp(lead, guard);
    guard.moveTo(lead.gridX, lead.gridY);
    // Guard has no weapon in inventory; with no weapon, can't attack at range 2
    expect(getCombinationAttacker(lead, guard, enemy, grid)).toBeNull();
  });

  it('returns null when guard is dead', () => {
    const grid = new Grid(8, 8);
    const lead = makeUnit('lead', Faction.PLAYER, 3, 3);
    const guard = makeUnit('guard', Faction.PLAYER, 3, 4);
    const enemy = makeUnit('enemy', Faction.ENEMY, 4, 3);
    grid.placeUnit(lead, 3, 3);
    grid.placeUnit(enemy, 4, 3);
    pairUp(lead, guard);
    guard.moveTo(lead.gridX, lead.gridY);
    guard.takeDamage(999);
    expect(getCombinationAttacker(lead, guard, enemy, grid)).toBeNull();
  });
});

describe('getGuardDefenseBonus', () => {
  it('returns portion of guard defense', () => {
    const guard = makeUnit('guard', Faction.PLAYER, 0, 0, { def: 10 });
    const lead = makeUnit('lead', Faction.PLAYER, 0, 0, { def: 5 });
    expect(getGuardDefenseBonus(guard, lead)).toBe(5);
  });

  it('returns 0 when guard has 0 defense', () => {
    const guard = makeUnit('guard', Faction.PLAYER, 0, 0, { def: 0 });
    const lead = makeUnit('lead', Faction.PLAYER, 0, 0, { def: 5 });
    expect(getGuardDefenseBonus(guard, lead)).toBe(0);
  });
});
