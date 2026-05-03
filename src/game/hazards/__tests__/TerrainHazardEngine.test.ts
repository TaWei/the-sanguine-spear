import { describe, it, expect } from 'vitest';
import { TerrainHazardEngine } from '../TerrainHazardEngine';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('TerrainHazardEngine', () => {
  it('applies lava damage to unit standing on lava', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.LAVA);
    const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const engine = new TerrainHazardEngine();
    const damage = engine.computeHazardDamage(unit, grid);
    expect(damage).toBe(5);
  });

  it('applies no damage on safe terrain', () => {
    const grid = new Grid(5, 5);
    const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const engine = new TerrainHazardEngine();
    const damage = engine.computeHazardDamage(unit, grid);
    expect(damage).toBe(0);
  });

  it('does not overkill unit with hazard damage', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.LAVA);
    const stats = createStats({ hp: 3, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const engine = new TerrainHazardEngine();
    const damage = engine.computeHazardDamage(unit, grid);
    expect(damage).toBe(3); // capped to current HP
  });

  it('returns hazard report for all live units', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(1, 1, TerrainType.LAVA);
    grid.setTerrain(3, 3, TerrainType.LAVA);
    const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const u1 = new Unit('u1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    const u2 = new Unit('u2', 'B', Faction.PLAYER, UnitClass.MAGE, stats, 2, 2);
    const u3 = new Unit('u3', 'C', Faction.ENEMY, UnitClass.BRIGAND, stats, 3, 3);
    const engine = new TerrainHazardEngine();
    const report = engine.applyHazards([u1, u2, u3], grid);
    expect(report.damagedUnits).toHaveLength(2);
    expect(report.damagedUnits.map((d) => d.unit.id)).toContain('u1');
    expect(report.damagedUnits.map((d) => d.unit.id)).toContain('u3');
    expect(report.damagedUnits.find((d) => d.unit.id === 'u1')!.damage).toBe(5);
  });
});
