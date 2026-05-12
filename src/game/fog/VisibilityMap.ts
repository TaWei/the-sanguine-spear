import type { Unit, Faction as FactionType } from '../units/Unit';
import { FogTileState } from './FogTileState';
import { computeSightRange } from './SightRange';
import { Grid } from '../map/Grid';
import { TerrainType } from '../map/Terrain';

export type VisibilityGrid = Map<string, FogTileState>;

/**
 * Computes a shared visibility map for a faction (typically PLAYER or ENEMY).
 * All units of the given faction contribute their sight ranges.
 * The state is:
 *   VISIBLE — currently seen by at least one unit
 *   DIMMED  — seen before but not currently visible (memory of terrain)
 *   UNSEEN  — never seen
 */
export function computeVisibility(
  units: Unit[],
  grid: Grid,
  faction: FactionType,
  previousVisibility?: VisibilityGrid,
): VisibilityGrid {
  const visibility: VisibilityGrid = new Map();

  // Initialize from previous visibility: dim all previously seen tiles
  if (previousVisibility) {
    for (const [key, state] of previousVisibility) {
      if (state === FogTileState.VISIBLE || state === FogTileState.DIMMED) {
        visibility.set(key, FogTileState.DIMMED);
      }
    }
  }

  // Mark tiles within sight range of any unit of the given faction
  const factionUnits = units.filter(u => u.faction === faction && u.isAlive);
  for (const unit of factionUnits) {
    const terrain = grid.getTerrain(unit.gridX, unit.gridY);
    const sight = computeSightRange(unit, terrain);
    const startX = Math.max(0, unit.gridX - sight);
    const endX = Math.min(grid.cols - 1, unit.gridX + sight);
    const startY = Math.max(0, unit.gridY - sight);
    const endY = Math.min(grid.rows - 1, unit.gridY + sight);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dist = Math.abs(x - unit.gridX) + Math.abs(y - unit.gridY);
        if (dist > sight) continue;

        // Check if forest blocks line of sight
        if (isBlocked(unit, x, y, grid, sight)) continue;

        const key = `${x},${y}`;
        visibility.set(key, FogTileState.VISIBLE);
      }
    }
  }

  return visibility;
}

/**
 * Check if a tile is blocked from view by forest terrain.
 * Forests between the unit and the target reduce visibility range by 1.
 */
function isBlocked(unit: Unit, tx: number, ty: number, grid: Grid, _sight: number): boolean {
  // Simple LOS: if there's a forest tile between unit and target, reduce effective range
  const dx = tx - unit.gridX;
  const dy = ty - unit.gridY;
  const dist = Math.abs(dx) + Math.abs(dy);

  // Flying units see over forests
  if (unit.isFlying) return false;

  // Thieves see through forests
  if (unit.unitClass === 'thief') return false;

  // Check each tile along a proper Manhattan grid path for forest
  if (dist <= 1) return false;

  let forestCount = 0;
  let x = unit.gridX;
  let y = unit.gridY;

  while (x !== tx || y !== ty) {
    const remX = tx - x;
    const remY = ty - y;

    if (Math.abs(remX) >= Math.abs(remY)) {
      x += Math.sign(remX);
    } else {
      y += Math.sign(remY);
    }

    if (x === tx && y === ty) break;
    if (!grid.isInBounds(x, y)) continue;
    if (grid.getTerrain(x, y) === TerrainType.FOREST) {
      forestCount++;
    }
  }

  // Each forest tile between reduces effective sight by 1
  return forestCount > 0 && dist > computeSightRange(unit, grid.getTerrain(unit.gridX, unit.gridY)) - forestCount;
}

export function isTileVisible(key: string, visibility: VisibilityGrid): boolean {
  return visibility.get(key) === FogTileState.VISIBLE;
}

export function isTileDimmed(key: string, visibility: VisibilityGrid): boolean {
  return visibility.get(key) === FogTileState.DIMMED;
}

export function isTileUnseen(key: string, visibility: VisibilityGrid): boolean {
  const state = visibility.get(key);
  return state === FogTileState.UNSEEN || state === undefined;
}
