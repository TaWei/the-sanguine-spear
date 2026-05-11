import { describe, it, expect, beforeEach } from 'vitest';
import { EscapeObjective } from '../EscapeObjective';
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

describe('EscapeObjective', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid(10, 10);
    grid.setTerrain(0, 5, TerrainType.ESCAPE);
  });

  it('returns victory when the escape unit reaches the escape tile', () => {
    const unit = createTestUnit('p1', 'Hero', Faction.PLAYER, 'lord', 0, 5);
    grid.placeUnit(unit, 0, 5);

    const objective = new EscapeObjective('p1', [{ x: 0, y: 5 }]);
    const result = objective.check(unit);

    expect(result.victory).toBe(true);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(false);
  });

  it('returns ongoing when the escape unit has not reached the tile', () => {
    const unit = createTestUnit('p1', 'Hero', Faction.PLAYER, 'lord', 3, 3);
    grid.placeUnit(unit, 3, 3);

    const objective = new EscapeObjective('p1', [{ x: 0, y: 5 }]);
    const result = objective.check(unit);

    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(true);
  });

  it('returns ongoing when a non-escape unit reaches the escape tile', () => {
    const wrongUnit = createTestUnit('p2', 'Mage', Faction.PLAYER, 'mage', 0, 5);
    const escapeUnit = createTestUnit('p1', 'Hero', Faction.PLAYER, 'lord', 1, 1);
    grid.placeUnit(wrongUnit, 0, 5);
    grid.placeUnit(escapeUnit, 1, 1);

    const objective = new EscapeObjective('p1', [{ x: 0, y: 5 }]);
    const result = objective.check(wrongUnit);

    expect(result.victory).toBe(false);
    expect(result.ongoing).toBe(true);
  });

  it('returns ongoing when the escape unit is dead', () => {
    const unit = createTestUnit('p1', 'Hero', Faction.PLAYER, 'lord', 0, 5);
    unit.takeDamage(20); // kill
    grid.placeUnit(unit, 0, 5);

    const objective = new EscapeObjective('p1', [{ x: 0, y: 5 }]);
    const result = objective.check(unit);

    // Dead unit can't escape — this should be detected as defeat by the composite
    expect(result.victory).toBe(false);
    expect(result.ongoing).toBe(true);
  });

  it('returns victory when the escape unit reaches any of multiple escape tiles', () => {
    const unit = createTestUnit('p1', 'Hero', Faction.PLAYER, 'lord', 2, 8);
    grid.placeUnit(unit, 2, 8);

    const objective = new EscapeObjective('p1', [
      { x: 0, y: 5 },
      { x: 2, y: 8 },
      { x: 9, y: 9 },
    ]);
    const result = objective.check(unit);

    expect(result.victory).toBe(true);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(false);
  });

  it('returns ongoing when the escape unit is not on any escape tile', () => {
    const unit = createTestUnit('p1', 'Hero', Faction.PLAYER, 'lord', 3, 3);
    grid.placeUnit(unit, 3, 3);

    const objective = new EscapeObjective('p1', [
      { x: 0, y: 5 },
      { x: 2, y: 8 },
      { x: 9, y: 9 },
    ]);
    const result = objective.check(unit);

    expect(result.victory).toBe(false);
    expect(result.ongoing).toBe(true);
  });
});
