import { describe, it, expect, beforeEach } from 'vitest';
import { SeizeObjective } from '../SeizeObjective';
import { Unit, Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';

function createTestUnit(
  id: string,
  name: string,
  faction: Faction,
  unitClass: string,
  x: number,
  y: number,
): Unit {
  return new Unit(id, name, faction, unitClass, createStats({
    hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), x, y);
}

describe('SeizeObjective', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid(10, 10);
    grid.setTerrain(5, 5, TerrainType.THRONE);
  });

  it('returns victory when a lord steps on the seize tile', () => {
    const lord = createTestUnit('p1', 'Lord', Faction.PLAYER, 'lord', 5, 5);
    grid.placeUnit(lord, 5, 5);

    const objective = new SeizeObjective([{ x: 5, y: 5 }]);
    const result = objective.check(lord);

    expect(result.victory).toBe(true);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(false);
  });

  it('returns ongoing when no player unit is on the seize tile', () => {
    const lord = createTestUnit('p1', 'Lord', Faction.PLAYER, 'lord', 3, 3);
    grid.placeUnit(lord, 3, 3);

    const objective = new SeizeObjective([{ x: 5, y: 5 }]);
    const result = objective.check(lord);

    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(true);
  });

  it('returns victory when any player unit steps on the seize tile', () => {
    const soldier = createTestUnit('p1', 'Soldier', Faction.PLAYER, 'soldier', 5, 5);
    grid.placeUnit(soldier, 5, 5);

    const objective = new SeizeObjective([{ x: 5, y: 5 }]);
    const result = objective.check(soldier);

    expect(result.victory).toBe(true);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(false);
  });

  it('returns ongoing when an enemy unit is on the seize tile', () => {
    const enemy = createTestUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', 5, 5);
    const lord = createTestUnit('p1', 'Lord', Faction.PLAYER, 'lord', 1, 1);
    grid.placeUnit(enemy, 5, 5);
    grid.placeUnit(lord, 1, 1);

    const objective = new SeizeObjective([{ x: 5, y: 5 }]);
    const result = objective.check(enemy);

    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(true);
  });

  it('returns victory when an ally lord steps on the seize tile', () => {
    const allyLord = createTestUnit('a1', 'Ally Lord', Faction.ALLY, 'lord', 5, 5);
    grid.placeUnit(allyLord, 5, 5);

    const objective = new SeizeObjective([{ x: 5, y: 5 }]);
    const result = objective.check(allyLord);

    expect(result.victory).toBe(true);
    expect(result.ongoing).toBe(false);
  });

  it('returns victory only when all tiles in a dual-seize are seized', () => {
    const lord1 = createTestUnit('p1', 'Lord', Faction.PLAYER, 'lord', 5, 5);
    const lord2 = createTestUnit('a1', 'Ally Lord', Faction.ALLY, 'lord', 7, 7);
    grid.placeUnit(lord1, 5, 5);
    grid.placeUnit(lord2, 7, 7);

    const objective = new SeizeObjective([{ x: 5, y: 5 }, { x: 7, y: 7 }]);

    // Only one lord on their tile
    let result = objective.check(lord1);
    expect(result.victory).toBe(false);
    expect(result.ongoing).toBe(true);

    // Both lords on their tiles
    result = objective.check(lord2);
    expect(result.victory).toBe(true);
    expect(result.ongoing).toBe(false);
  });
});
