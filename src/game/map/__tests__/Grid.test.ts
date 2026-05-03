import { describe, it, expect } from 'vitest';
import { Grid } from '../Grid';
import { TERRAIN_DEFS, TerrainType } from '../Terrain';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('Grid', () => {
  it('is created with the specified dimensions', () => {
    const grid = new Grid(10, 8);
    expect(grid.cols).toBe(10);
    expect(grid.rows).toBe(8);
  });

  it('defaults all tiles to plains', () => {
    const grid = new Grid(3, 3);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(grid.getTerrain(x, y)).toBe(TerrainType.PLAINS);
      }
    }
  });

  it('allows setting terrain at a specific tile', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 3, TerrainType.FOREST);
    expect(grid.getTerrain(2, 3)).toBe(TerrainType.FOREST);
  });

  it('returns true for in-bounds coordinates', () => {
    const grid = new Grid(4, 4);
    expect(grid.isInBounds(0, 0)).toBe(true);
    expect(grid.isInBounds(3, 3)).toBe(true);
  });

  it('returns false for out-of-bounds coordinates', () => {
    const grid = new Grid(4, 4);
    expect(grid.isInBounds(-1, 0)).toBe(false);
    expect(grid.isInBounds(0, -1)).toBe(false);
    expect(grid.isInBounds(4, 0)).toBe(false);
    expect(grid.isInBounds(0, 4)).toBe(false);
  });

  it('getTerrainData returns the full TerrainData object', () => {
    const grid = new Grid(3, 3);
    grid.setTerrain(1, 1, TerrainType.FOREST);
    const data = grid.getTerrainData(1, 1);
    expect(data).toEqual(TERRAIN_DEFS[TerrainType.FOREST]);
  });

  it('getTerrainData returns plains for out-of-bounds (safe fallback)', () => {
    const grid = new Grid(3, 3);
    const data = grid.getTerrainData(99, 99);
    expect(data).toEqual(TERRAIN_DEFS[TerrainType.PLAINS]);
  });

  it('can place and retrieve a unit', () => {
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
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    grid.placeUnit(unit, 2, 2);
    expect(grid.getUnit(2, 2)).toBe(unit);
  });

  it('returns null for empty tiles', () => {
    const grid = new Grid(5, 5);
    expect(grid.getUnit(0, 0)).toBeNull();
  });

  it('removes a unit when placing null', () => {
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
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    grid.placeUnit(unit, 2, 2);
    grid.removeUnit(2, 2);
    expect(grid.getUnit(2, 2)).toBeNull();
  });

  it('isOccupied returns true when a unit is present', () => {
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
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    grid.placeUnit(unit, 2, 2);
    expect(grid.isOccupied(2, 2)).toBe(true);
    expect(grid.isOccupied(0, 0)).toBe(false);
  });

  it('isOccupied returns false for out-of-bounds', () => {
    const grid = new Grid(5, 5);
    expect(grid.isOccupied(-1, 0)).toBe(false);
  });

  it('getUnit returns null for out-of-bounds', () => {
    const grid = new Grid(5, 5);
    expect(grid.getUnit(99, 99)).toBeNull();
  });
});
