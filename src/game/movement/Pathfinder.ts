import { Grid, GridNeighbor } from '../map/Grid';
import { Unit } from '../units/Unit';
import { getTerrainMoveCost } from './TerrainCost';

export function findPath(
  unit: Unit,
  grid: Grid,
  destX: number,
  destY: number,
): GridNeighbor[] | null {
  const maxMov = unit.stats.mov;
  const startX = unit.gridX;
  const startY = unit.gridY;
  const startKey = `${String(startX)},${String(startY)}`;
  const destKey = `${String(destX)},${String(destY)}`;

  if (startX === destX && startY === destY) {
    return null;
  }

  const queue: [number, number, number][] = [[0, startX, startY]];
  const visited = new Map<string, number>();
  const predecessor = new Map<string, string>();
  visited.set(startKey, 0);

  while (queue.length > 0) {
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i][0] < queue[minIdx][0]) {
        minIdx = i;
      }
    }
    const [cost, x, y] = queue.splice(minIdx, 1)[0];

    for (const neighbor of grid.getNeighbors(x, y)) {
      const nx = neighbor.x;
      const ny = neighbor.y;
      const terrain = grid.getTerrain(nx, ny);
      const terrainCost = getTerrainMoveCost(unit, terrain);

      if (terrainCost >= 99) {
        continue;
      }

      const newCost = cost + terrainCost;
      if (newCost > maxMov) {
        continue;
      }

      const key = `${String(nx)},${String(ny)}`;
      const prevCost = visited.get(key);
      if (prevCost !== undefined && prevCost <= newCost) {
        continue;
      }

      if (grid.isOccupied(nx, ny) && !(nx === startX && ny === startY)) {
        continue;
      }

      visited.set(key, newCost);
      predecessor.set(key, `${String(x)},${String(y)}`);
      queue.push([newCost, nx, ny]);
    }
  }

  if (!visited.has(destKey)) {
    return null;
  }

  // Backtrack to build path
  const path: GridNeighbor[] = [];
  let current = destKey;
  while (current !== startKey) {
    const [x, y] = current.split(',').map(Number);
    path.push({ x, y });
    const prev = predecessor.get(current);
    if (!prev) {
      return null;
    } // should never happen if visited has destKey
    current = prev;
  }

  path.reverse();
  return path;
}
