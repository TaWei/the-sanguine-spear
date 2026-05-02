import { describe, it, expect } from 'vitest';
import { computeAttackRange } from '../AttackRange';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../Weapons';

describe('computeAttackRange', () => {
  const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });

  it('returns tiles within weapon range (1-range Iron Sword)', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const grid = new Grid(10, 10);
    const weapon = WEAPON_DB['Iron Sword'];
    const range = computeAttackRange(unit, grid, weapon);
    // 4 adjacent tiles
    expect(range).toContainEqual([4, 5]);
    expect(range).toContainEqual([6, 5]);
    expect(range).toContainEqual([5, 4]);
    expect(range).toContainEqual([5, 6]);
    expect(range).toHaveLength(4);
  });

  it('returns tiles within 1-2 range for Fire tome', () => {
    const unit = new Unit('p1', 'Elara', Faction.PLAYER, UnitClass.MAGE, stats, 5, 5);
    const grid = new Grid(10, 10);
    const weapon = WEAPON_DB['Fire'];
    const range = computeAttackRange(unit, grid, weapon);
    // 4 adjacent + some at distance 2 (Manhattan distance)
    expect(range.length).toBeGreaterThan(4);
    // Distance 2 tiles should be included
    expect(range).toContainEqual([3, 5]); // left 2
    expect(range).toContainEqual([5, 3]); // up 2
  });

  it('excludes tiles outside grid bounds', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const grid = new Grid(10, 10);
    const weapon = WEAPON_DB['Iron Sword'];
    const range = computeAttackRange(unit, grid, weapon);
    // Only (1,0) and (0,1) — not (-1,0) or (0,-1)
    expect(range).toHaveLength(2);
  });

  it('2-range bow does not include adjacent tiles', () => {
    const unit = new Unit('p1', 'Archer', Faction.PLAYER, UnitClass.ARCHER, stats, 5, 5);
    const grid = new Grid(10, 10);
    const weapon = WEAPON_DB['Iron Bow'];
    const range = computeAttackRange(unit, grid, weapon);
    // No adjacent tiles
    expect(range).not.toContainEqual([5, 4]);
    expect(range).not.toContainEqual([5, 6]);
    // Distance 2 tiles
    expect(range).toContainEqual([3, 5]);
    expect(range).toContainEqual([5, 3]);
  });
});
