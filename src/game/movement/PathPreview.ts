import { Unit } from '../units/Unit';
import { Grid, GridNeighbor } from '../map/Grid';
import { findPath } from './Pathfinder';
import { computeMoveRange } from './MoveRange';

export interface PathPreviewState {
  path: GridNeighbor[] | null;
  destination: { x: number; y: number } | null;
}

export function computePathPreview(
  unit: Unit,
  grid: Grid,
  hoverX: number,
  hoverY: number,
): PathPreviewState {
  if (hoverX === unit.gridX && hoverY === unit.gridY) {
    return { path: null, destination: null };
  }
  const range = computeMoveRange(unit, grid);
  const key = `${String(hoverX)},${String(hoverY)}`;
  if (!range.has(key)) {
    return { path: null, destination: null };
  }
  const path = findPath(unit, grid, hoverX, hoverY);
  return { path, destination: { x: hoverX, y: hoverY } };
}
