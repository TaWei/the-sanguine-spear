import { describe, it, expect } from 'vitest';
import { getAdjacentEnemies } from '../Adjacency';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../Weapons';

describe('getAdjacentEnemies', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('finds an enemy directly adjacent (range 1)', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 6, 5);
    grid.placeUnit(enemy, 6, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(1);
    expect(enemies[0].id).toBe('e1');
  });

  it('returns empty when no enemies adjacent', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(0);
  });

  it('ignores dead enemies', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 6, 5);
    enemy.takeDamage(999);
    grid.placeUnit(enemy, 6, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(0);
  });

  it('ignores allies and same-faction units', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, stats, 6, 5);
    grid.placeUnit(ally, 6, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(0);
  });

  it('respects weapon min/max range (bow range 2)', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.ARCHER, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 7, 5);
    grid.placeUnit(enemy, 7, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Bow']);
    expect(enemies).toHaveLength(1);
  });

  it('excludes enemies outside weapon range', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 7, 5);
    grid.placeUnit(enemy, 7, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(0);
  });
});
