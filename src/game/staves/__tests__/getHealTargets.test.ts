import { describe, it, expect } from 'vitest';
import { getHealTargets } from '../getHealTargets';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { StaffData } from '../Staves';

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
