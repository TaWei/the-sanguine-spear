import { describe, it, expect } from 'vitest';
import { computePathPreview } from '../PathPreview';
import { Grid } from '../../map/Grid';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('computePathPreview', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('returns null path when hover tile is out of range', () => {
    const grid = new Grid(10, 10);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const preview = computePathPreview(unit, grid, 8, 2);
    expect(preview.path).toBeNull();
    expect(preview.destination).toBeNull();
  });

  it('returns a path when hover tile is in range', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const preview = computePathPreview(unit, grid, 3, 2);
    expect(preview.path).not.toBeNull();
    expect(preview.destination).toEqual({ x: 3, y: 2 });
  });

  it('returns path with correct length for adjacent tile', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const preview = computePathPreview(unit, grid, 3, 2);
    expect(preview.path).toHaveLength(1);
    expect(preview.path![0]).toEqual({ x: 3, y: 2 });
  });

  it('returns null path when hovering on start tile', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const preview = computePathPreview(unit, grid, 2, 2);
    expect(preview.path).toBeNull();
    expect(preview.destination).toBeNull();
  });
});
