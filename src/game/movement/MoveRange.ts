import { Grid } from '../map/Grid';
import { Unit } from '../units/Unit';
import { getTerrainMoveCost } from './TerrainCost';

/**
 * Compute all reachable tiles and their movement costs using Dijkstra's algorithm.
 * Returns a Map of "x,y" → accumulated movement cost.
 * The starting tile is always included with cost 0.
 */
export function computeMoveRange(unit: Unit, grid: Grid): Map<string, number> {
  const maxMov = unit.stats.mov;
  const startX = unit.gridX;
  const startY = unit.gridY;
  const startKey = `${String(startX)},${String(startY)}`;

  // Priority queue: [cost, x, y], ordered by cost ascending
  const queue: [number, number, number][] = [[0, startX, startY]];
  const visited = new Map<string, number>();
  visited.set(startKey, 0);

  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  while (queue.length > 0) {
    // Extract the lowest-cost entry (simple linear scan for clarity)
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i][0] < queue[minIdx][0]) {
        minIdx = i;
      }
    }
    const [cost, x, y] = queue.splice(minIdx, 1)[0];

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (!grid.isInBounds(nx, ny)) {
        continue;
      }

      const terrain = grid.getTerrain(nx, ny);
      const terrainCost = getTerrainMoveCost(unit, terrain);

      // Impassable terrain
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

      // Cannot move through enemy units (but can move through allies? — skip for now, block all)
      if (grid.isOccupied(nx, ny)) {
        // Allow the starting tile
        if (nx === startX && ny === startY) {
          continue;
        }
        // Block occupied tiles
        continue;
      }

      visited.set(key, newCost);
      queue.push([newCost, nx, ny]);
    }
  }

  return visited;
}
