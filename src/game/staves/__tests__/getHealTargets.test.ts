import { describe, it, expect } from 'vitest';
import { getHealTargets } from '../getHealTargets';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { StaffData } from '../Staves';
import { TerrainType } from '../../map/Terrain';

describe('getHealTargets', () => {
  const staff: StaffData = { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 };
  const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('finds adjacent friendly units', () => {
    const grid = new Grid(5, 5);
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 2, 2);
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 2, 1);
    grid.placeUnit(healer, 2, 2);
    grid.placeUnit(ally, 2, 1);
    const targets = getHealTargets(healer, grid, staff);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('a1');
  });

  it('excludes enemies', () => {
    const grid = new Grid(5, 5);
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 2, 2);
    const enemy = new Unit('e1', 'Enemy', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 1);
    grid.placeUnit(healer, 2, 2);
    grid.placeUnit(enemy, 2, 1);
    const targets = getHealTargets(healer, grid, staff);
    expect(targets).toHaveLength(0);
  });

  it('excludes the healer themself', () => {
    const grid = new Grid(5, 5);
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 2, 2);
    grid.placeUnit(healer, 2, 2);
    const targets = getHealTargets(healer, grid, staff);
    expect(targets).toHaveLength(0);
  });

  it('includes allies from the ally faction', () => {
    const grid = new Grid(5, 5);
    const healer = new Unit('h1', 'Healer', Faction.ALLY, UnitClass.MAGE, stats, 2, 2);
    const player = new Unit('p1', 'Player', Faction.PLAYER, UnitClass.LORD, stats, 2, 1);
    grid.placeUnit(healer, 2, 2);
    grid.placeUnit(player, 2, 1);
    const targets = getHealTargets(healer, grid, staff);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('p1');
  });
});

describe('getHealTargets with dynamic range (Physic)', () => {
  function fillTerrain(grid: Grid): void {
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 10; x++)
        grid.setTerrain(x, y, TerrainType.PLAINS);
  }

  it('finds heal target within dynamic Physic range', () => {
    const grid = new Grid(10, 10);
    fillTerrain(grid);

    const healer = new Unit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
      createStats({ hp: 20, maxHp: 20, str: 1, mag: 10, skl: 5, spd: 8, luk: 3, def: 3, res: 8, mov: 5 }),
      5, 5);
    grid.placeUnit(healer, 5, 5);

    // Wounded ally 5 tiles away (distance = 5)
    const ally = new Unit('a1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
      createStats({ hp: 10, maxHp: 25, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 5, res: 2, mov: 5 }),
      9, 6); // dx=4, dy=1 → Manhattan distance = 5
    grid.placeUnit(ally, 9, 6);

    const physStaff: StaffData = {
      name: 'Physic',
      healAmount: 10,
      minRange: 1, maxRange: 99,
      getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
    };

    const targets = getHealTargets(healer, grid, physStaff);
    expect(targets).toContain(ally);
  });

  it('does not find target outside Physic range', () => {
    const grid = new Grid(10, 10);
    fillTerrain(grid);

    const healer = new Unit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
      createStats({ hp: 20, maxHp: 20, str: 1, mag: 4, skl: 5, spd: 8, luk: 3, def: 3, res: 8, mov: 5 }),
      5, 5);
    grid.placeUnit(healer, 5, 5);

    // Ally at distance 5, but Mag 4 → range = 2
    const ally = new Unit('a1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
      createStats({ hp: 10, maxHp: 25, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 5, res: 2, mov: 5 }),
      5, 0); // dx=0, dy=5 → distance = 5
    grid.placeUnit(ally, 5, 0);

    const physStaff: StaffData = {
      name: 'Physic',
      healAmount: 10,
      minRange: 1, maxRange: 99,
      getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
    };

    const targets = getHealTargets(healer, grid, physStaff);
    expect(targets).not.toContain(ally);
  });
});
