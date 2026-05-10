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

  // Check each tile along the path for forest
  // Use Bresenham-like line check
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps <= 1) return false;

  let forestCount = 0;
  for (let i = 1; i < steps; i++) {
    const ux = unit.gridX + Math.round((dx * i) / steps);
    const uy = unit.gridY + Math.round((dy * i) / steps);
    if (ux === unit.gridX && uy === unit.gridY) continue;
    if (ux === tx && uy === ty) continue;
    if (!grid.isInBounds(ux, uy)) continue;
    if (grid.getTerrain(ux, uy) === TerrainType.FOREST) {
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
