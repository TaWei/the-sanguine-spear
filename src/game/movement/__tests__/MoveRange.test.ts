import { describe, it, expect } from 'vitest';
import { computeMoveRange } from '../MoveRange';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('MoveRange', () => {
  it('includes the starting tile (cost 0)', () => {
    const grid = new Grid(8, 8);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 3, 3);
    const range = computeMoveRange(unit, grid);
    expect(range.has('3,3')).toBe(true);
  });

  it('reaches tiles within movement range on plains', () => {
    const grid = new Grid(10, 10);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 3,
    });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const range = computeMoveRange(unit, grid);
    // With mov=3 on all plains: all tiles within Manhattan distance 3
    expect(range.has('5,2')).toBe(true); // up 3
    expect(range.has('5,8')).toBe(true); // down 3
    expect(range.has('2,5')).toBe(true); // left 3
    expect(range.has('8,5')).toBe(true); // right 3
    // Should NOT reach Manhattan distance 4
    expect(range.has('5,1')).toBe(false);
    expect(range.has('9,5')).toBe(false);
  });

  it('respects terrain movement costs', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.FOREST); // costs 2
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 2,
    });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 2);
    const range = computeMoveRange(unit, grid);
    // 0,2 → 1,2 (plains, cost 1) → 2,2 (forest, cost 2) = total 3 > 2, so unreachable
    expect(range.has('2,2')).toBe(false);
    // But 0,2 → 0,1 (plains, cost 1) → reachable
    expect(range.has('0,1')).toBe(true);
  });

  it('cannot move through impassable terrain', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(1, 2, TerrainType.MOUNTAIN); // cost 99
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 2);
    const range = computeMoveRange(unit, grid);
    expect(range.has('1,2')).toBe(false);
  });

  it('cannot move onto tiles occupied by other units', () => {
    const grid = new Grid(5, 5);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    const blocker = new Unit('e1', 'Block', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);
    grid.placeUnit(blocker, 2, 2);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 1, 2);
    const range = computeMoveRange(unit, grid);
    expect(range.has('2,2')).toBe(false);
  });

  it('starting tile is always included even if occupied (it is the unit itself)', () => {
    const grid = new Grid(5, 5);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 3,
    });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 3, 3);
    grid.placeUnit(unit, 3, 3);
    const range = computeMoveRange(unit, grid);
    expect(range.has('3,3')).toBe(true);
  });

  it('returns only coordinates within grid bounds', () => {
    const grid = new Grid(3, 3);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 99,
    });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    const range = computeMoveRange(unit, grid);
    for (const key of range.keys()) {
      const [x, y] = key.split(',').map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(3);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(3);
    }
  });

  it('returns tile costs in the map values', () => {
    const grid = new Grid(5, 5);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 3,
    });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const range = computeMoveRange(unit, grid);
    expect(range.get('2,2')).toBe(0); // start tile
    expect(range.get('2,3')).toBe(1); // adjacent plains
    expect(range.get('2,4')).toBe(2); // two steps on plains
  });

  it('flying unit can traverse cliffs at reduced cost', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.CLIFF);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
    const pegasus = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, stats, 1, 2);
    const range = computeMoveRange(pegasus, grid);
    expect(range.has('2,2')).toBe(true);
  });

  it('non-flying unit cannot traverse cliffs within normal movement', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.CLIFF);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
    const lord = new Unit('u1', 'Lord', Faction.PLAYER, UnitClass.LORD, stats, 1, 2);
    const range = computeMoveRange(lord, grid);
    expect(range.has('2,2')).toBe(false);
  });

  it('non-flying unit can traverse cliffs with enough movement', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.CLIFF);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 4 });
    const lord = new Unit('u1', 'Lord', Faction.PLAYER, UnitClass.LORD, stats, 1, 2);
    const range = computeMoveRange(lord, grid);
    expect(range.has('2,2')).toBe(true);
  });
});
