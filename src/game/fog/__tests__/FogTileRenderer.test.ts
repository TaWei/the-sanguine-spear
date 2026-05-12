import { describe, it, expect, beforeEach } from 'vitest';
import { FogTileRenderer, FOG_ALPHA } from '../FogTileRenderer';
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

describe('FogTileRenderer', () => {
  let fog: FogOfWar;
  let grid: Grid;
  let renderer: FogTileRenderer;

  beforeEach(() => {
    fog = new FogOfWar();
    fog.setEnabled(true);
    grid = new Grid(12, 10);
    renderer = new FogTileRenderer(fog);
  });

  it('returns VISIBLE alpha for tiles currently seen', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    fog.update([player], grid);

    expect(renderer.getTileAlpha(5, 5)).toBe(FOG_ALPHA.VISIBLE);
    expect(renderer.getTileAlpha(6, 5)).toBe(FOG_ALPHA.VISIBLE);
  });

  it('returns DIMMED alpha for previously seen but now obscured tiles', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 7, 5);

    fog.update([player, enemy], grid);
    expect(fog.getTileState(7, 5, Faction.PLAYER)).toBe(FogTileState.VISIBLE);

    player.moveTo(10, 9);
    fog.update([player, enemy], grid);

    expect(fog.getTileState(7, 5, Faction.PLAYER)).toBe(FogTileState.DIMMED);
    expect(renderer.getTileAlpha(7, 5)).toBe(FOG_ALPHA.DIMMED);
  });

  it('returns UNSEEN alpha for never-seen tiles', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
    fog.update([player], grid);

    expect(renderer.getTileAlpha(10, 9)).toBe(FOG_ALPHA.UNSEEN);
  });

  it('updates alpha when fog updates', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    fog.update([player], grid);

    expect(renderer.getTileAlpha(8, 5)).toBe(FOG_ALPHA.VISIBLE);

    player.moveTo(10, 9);
    fog.update([player], grid);

    expect(renderer.getTileAlpha(8, 5)).toBe(FOG_ALPHA.DIMMED);
  });

  it('exports meaningful alpha constants', () => {
    expect(FOG_ALPHA.VISIBLE).toBe(1.0);
    expect(FOG_ALPHA.DIMMED).toBeGreaterThan(0);
    expect(FOG_ALPHA.DIMMED).toBeLessThan(1.0);
    expect(FOG_ALPHA.UNSEEN).toBeGreaterThan(0);
    expect(FOG_ALPHA.UNSEEN).toBeLessThan(FOG_ALPHA.DIMMED);
  });
});
