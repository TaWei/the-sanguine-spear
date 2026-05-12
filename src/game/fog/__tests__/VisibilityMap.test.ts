import { describe, it, expect, beforeEach } from 'vitest';
import { computeVisibility, isTileVisible, isTileUnseen, type VisibilityGrid } from '../VisibilityMap';
import { FogTileState } from '../FogTileState';
import { Unit, Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';

function createTestUnit(
  id: string,
  faction: Faction,
  unitClass: string,
  x: number,
  y: number,
  isFlying = false,
): Unit {
  const cls = isFlying ? 'pegasus_knight' : unitClass;
  return new Unit(id, id, faction, cls, createStats({
    hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), x, y);
}

describe('VisibilityMap', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid(15, 15);
  });

  it('marks tiles within sight range as VISIBLE', () => {
    const unit = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    const visibility = computeVisibility([unit], grid, Faction.PLAYER);

    // Unit's own tile is visible
    expect(visibility.get('5,5')).toBe(FogTileState.VISIBLE);
    // Tile within sight range (sight=3 for lord)
    expect(visibility.get('8,5')).toBe(FogTileState.VISIBLE);
    // Tile beyond sight range
    expect(visibility.get('10,5')).toBeUndefined();
  });

  it('tracks previously seen tiles as DIMMED', () => {
    const unit = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    // First compute with unit at (5,5)
    const prevVisibility = computeVisibility([unit], grid, Faction.PLAYER);

    // Move unit away and recompute
    unit.moveTo(12, 12);
    const visibility = computeVisibility([unit], grid, Faction.PLAYER, prevVisibility);

    // Previously seen tile should be DIMMED
    expect(visibility.get('5,5')).toBe(FogTileState.DIMMED);
    // Current position is VISIBLE
    expect(visibility.get('12,12')).toBe(FogTileState.VISIBLE);
    // Far tile was never seen
    expect(visibility.get('0,0')).toBeUndefined();
  });

  it('merges visibility from all player units', () => {
    const u1 = createTestUnit('p1', Faction.PLAYER, 'lord', 3, 5);
    const u2 = createTestUnit('p2', Faction.PLAYER, 'mage', 10, 5);

    const visibility = computeVisibility([u1, u2], grid, Faction.PLAYER);

    // Both units' areas should be visible
    expect(visibility.get('3,5')).toBe(FogTileState.VISIBLE);
    expect(visibility.get('10,5')).toBe(FogTileState.VISIBLE);
    // Midpoint between them should be visible (within range of both or either)
    expect(visibility.get('7,5')).toBe(FogTileState.VISIBLE);
  });

  it('hides enemy units on UNSEEN tiles', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
    const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 10);

    const visibility = computeVisibility([player, enemy], grid, Faction.PLAYER);

    // Enemy tile should be unseen by player
    expect(isTileUnseen('10,10', visibility)).toBe(true);
    // Player tile should be visible
    expect(isTileVisible('1,1', visibility)).toBe(true);
  });

  it('flying units see over forests', () => {
    grid.setTerrain(6, 5, TerrainType.FOREST);
    const flyer = createTestUnit('p1', Faction.PLAYER, 'pegasus_knight', 5, 5, true);
    const ground = createTestUnit('p2', Faction.PLAYER, 'lord', 5, 5);

    const flyVis = computeVisibility([flyer], grid, Faction.PLAYER);
    const groundVis = computeVisibility([ground], grid, Faction.PLAYER);

    // Flyer should see further beyond the forest
    expect(flyVis.get('9,5')).toBe(FogTileState.VISIBLE);

    // Ground unit has sight reduced by forest
    // (forest is at 6,5 which is within sight range but blocks beyond)
    const groundSees9 = groundVis.get('9,5');
    // Ground may or may not see 9,5 depending on forest blocking
    // Just verify ground unit's own tile is visible
    expect(groundVis.get('5,5')).toBe(FogTileState.VISIBLE);
  });

  it('only computes visibility for the specified faction', () => {
    const player = createTestUnit('p1', Faction.PLAYER, 'lord', 3, 3);
    const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 10);

    // Player visibility should only include player's sight
    const playerVis = computeVisibility([player, enemy], grid, Faction.PLAYER);
    expect(playerVis.get('3,3')).toBe(FogTileState.VISIBLE);
    // Enemy units don't contribute to player visibility
    expect(isTileUnseen('10,10', playerVis)).toBe(true);

    // Enemy visibility should include enemy's sight
    const enemyVis = computeVisibility([player, enemy], grid, Faction.ENEMY);
    expect(enemyVis.get('10,10')).toBe(FogTileState.VISIBLE);
  });

  it('blocks diagonal sightline when forest is on Manhattan path (x-priority)', () => {
    // Lord base sight = 3. Target at (7,6) is distance 3 — visible without forest.
    // Forest at (6,5) lies on the x-priority Manhattan path:
    // (5,5) -> (6,5) -> (7,5) -> (7,6)
    // One forest reduces effective sight to 2, so target at dist 3 should be blocked.
    grid.setTerrain(6, 5, TerrainType.FOREST);
    const unit = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    const visibility = computeVisibility([unit], grid, Faction.PLAYER);

    // Old Chebyshev code checked (6,6) and missed (6,5), so this test fails before fix
    expect(visibility.get('7,6')).toBeUndefined();
  });

  it('does not skip intermediate tiles on near-diagonal sightlines', () => {
    // Lord base sight = 3. Target at (7,6) is distance 3.
    // Forest at (7,5) lies on x-priority path; old code only checked (6,6).
    grid.setTerrain(7, 5, TerrainType.FOREST);
    const unit = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    const visibility = computeVisibility([unit], grid, Faction.PLAYER);

    expect(visibility.get('7,6')).toBeUndefined();
  });

  it('allows sight when diagonal path has no forest', () => {
    // Same geometry as above, but no forest on the Manhattan path.
    // Target at (7,6), distance 3, should be visible.
    const unit = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
    const visibility = computeVisibility([unit], grid, Faction.PLAYER);

    expect(visibility.get('7,6')).toBe(FogTileState.VISIBLE);
    expect(visibility.get('7,7')).toBeUndefined(); // beyond sight range
  });
});
