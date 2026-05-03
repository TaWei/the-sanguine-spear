import { describe, it, expect } from 'vitest';
import { findPath } from '../Pathfinder';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('findPath', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('returns null when destination is the start tile', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 2, 2);
    expect(path).toBeNull();
  });

  it('finds a straight horizontal path', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 4, 2);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
    expect(path![0]).toEqual({ x: 3, y: 2 });
    expect(path![1]).toEqual({ x: 4, y: 2 });
  });

  it('finds a straight vertical path', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 2, 0);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
    expect(path![0]).toEqual({ x: 2, y: 1 });
    expect(path![1]).toEqual({ x: 2, y: 0 });
  });

  it('finds a path around an obstacle', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 3, TerrainType.MOUNTAIN); // impassable wall at x=2, y=3
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 2, 4);
    // Must go around: (2,2) → (3,2) → (3,3) → (3,4) → (2,4) OR similar
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(2);
    // The destination must be the last tile
    const last = path![path!.length - 1];
    expect(last.x).toBe(2);
    expect(last.y).toBe(4);
  });

  it('returns null when destination is out of move range', () => {
    const grid = new Grid(10, 10);
    const shortStats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 2 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, shortStats, 5, 5);
    const path = findPath(unit, grid, 8, 5); // distance 3 > mov 2
    expect(path).toBeNull();
  });

  it('returns null when destination is occupied by another unit', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const blocker = new Unit('e1', 'Block', Faction.ENEMY, UnitClass.BRIGAND, stats, 3, 2);
    grid.placeUnit(blocker, 3, 2);
    const path = findPath(unit, grid, 3, 2);
    expect(path).toBeNull();
  });

  it('path is purely cardinal (no diagonal steps)', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const path = findPath(unit, grid, 2, 2);
    expect(path).not.toBeNull();
    let prevX = 0;
    let prevY = 0;
    for (const step of path!) {
      const dx = Math.abs(step.x - prevX);
      const dy = Math.abs(step.y - prevY);
      expect(dx + dy).toBe(1); // exactly one cardinal step
      prevX = step.x;
      prevY = step.y;
    }
  });

  it('prefers lower-cost terrain when multiple paths exist', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(1, 2, TerrainType.FOREST); // cost 2
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 0, 2);
    // Direct: (2,2) → (1,2) forest cost 2 → (0,2) plains cost 1 = total 3
    // Around:  (2,2) → (2,1) cost 1 → (1,1) cost 1 → (0,1) cost 1 → (0,2) cost 1 = total 4
    // The direct path is cheaper (3 < 4), so it should be chosen
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
    expect(path![0]).toEqual({ x: 1, y: 2 });
    expect(path![1]).toEqual({ x: 0, y: 2 });
  });

  it('does not pass through occupied tiles', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 1, 2);
    const blocker = new Unit('e1', 'Block', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);
    grid.placeUnit(blocker, 2, 2);
    const path = findPath(unit, grid, 3, 2);
    // Must go around the blocker: (1,2) → (1,1) → (2,1) → (3,1) → (3,2)
    expect(path).not.toBeNull();
    for (const step of path!) {
      expect(step.x === 2 && step.y === 2).toBe(false);
    }
  });

  it('finds path through cliff for flying unit', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.CLIFF);
    const pegStats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
    const pegasus = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, pegStats, 1, 2);
    const path = findPath(pegasus, grid, 3, 2);
    expect(path).not.toBeNull();
    expect(path!.some((p) => p.x === 2 && p.y === 2)).toBe(true);
  });

  it('does not find path through cliff for non-flying unit with low mov', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.CLIFF);
    const lordStats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
    const lord = new Unit('u1', 'Lord', Faction.PLAYER, UnitClass.LORD, lordStats, 1, 2);
    const path = findPath(lord, grid, 3, 2);
    expect(path).toBeNull();
  });
});
