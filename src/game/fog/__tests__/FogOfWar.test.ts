import { describe, it, expect, beforeEach } from 'vitest';
import { FogOfWar } from '../FogOfWar';
import { FogTileState } from '../FogTileState';
import { Unit, Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';

function createTestUnit(
  id: string,
  faction: Faction,
  unitClass: string,
  x: number,
  y: number,
): Unit {
  return new Unit(id, id, faction, unitClass, createStats({
    hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), x, y);
}

describe('FogOfWar', () => {
  let fog: FogOfWar;
  let grid: Grid;

  beforeEach(() => {
    fog = new FogOfWar();
    grid = new Grid(12, 10);
  });

  it('enemy on unseen tile is not visible', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
    const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 8);

    fog.update([player, enemy], grid);

    expect(fog.isUnitVisible(enemy, Faction.PLAYER)).toBe(false);
  });

  it('enemy on visible tile is visible', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 6, 5);

    fog.update([player, enemy], grid);

    expect(fog.isUnitVisible(enemy, Faction.PLAYER)).toBe(true);
  });

  it('enemy on dimmed tile is not visible', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 7, 5);

    // First update: enemy is visible
    fog.update([player, enemy], grid);
    expect(fog.isUnitVisible(enemy, Faction.PLAYER)).toBe(true);

    // Player moves away — enemy tile becomes DIMMED
    player.moveTo(10, 9);
    fog.update([player, enemy], grid);
    expect(fog.isUnitVisible(enemy, Faction.PLAYER)).toBe(false);

    // Tile state should be DIMMED
    expect(fog.getTileState(7, 5, Faction.PLAYER)).toBe(FogTileState.DIMMED);
  });

  it('enemies see their own units', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
    const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 8);

    fog.update([player, enemy], grid);

    // Enemy sees themselves
    expect(fog.isUnitVisible(enemy, Faction.ENEMY)).toBe(true);
    // Enemy does NOT see the player (player is far away)
    expect(fog.isUnitVisible(player, Faction.ENEMY)).toBe(false);
  });

  it('reset clears all visibility', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    fog.update([player], grid);
    expect(fog.getTileState(5, 5, Faction.PLAYER)).toBe(FogTileState.VISIBLE);

    fog.reset();
    expect(fog.getTileState(5, 5, Faction.PLAYER)).toBe(FogTileState.UNSEEN);
  });

  it('when disabled, all tiles are VISIBLE and all units are visible', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
    const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 8);

    fog.setEnabled(false);
    fog.update([player, enemy], grid);

    expect(fog.isEnabled()).toBe(false);
    expect(fog.getTileState(10, 8, Faction.PLAYER)).toBe(FogTileState.VISIBLE);
    expect(fog.isUnitVisible(enemy, Faction.PLAYER)).toBe(true);
    expect(fog.isUnitVisible(player, Faction.ENEMY)).toBe(true);
  });

  it('when disabled then re-enabled, visibility is recomputed', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
    const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 8);

    fog.setEnabled(false);
    fog.update([player, enemy], grid);
    expect(fog.isUnitVisible(enemy, Faction.PLAYER)).toBe(true);

    fog.setEnabled(true);
    fog.update([player, enemy], grid);
    expect(fog.isUnitVisible(enemy, Faction.PLAYER)).toBe(false);
  });
});
