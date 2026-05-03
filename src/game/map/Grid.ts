import { TERRAIN_DEFS, TerrainData, TerrainType } from './Terrain';
import { Unit } from '../units/Unit';

export interface GridNeighbor {
  x: number;
  y: number;
}

export class Grid {
  readonly cols: number;
  readonly rows: number;
  private tiles: TerrainType[][];
  private units = new Map<string, Unit>();

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => TerrainType.PLAINS),
    );
  }

  private key(x: number, y: number): string {
    return `${String(x)},${String(y)}`;
  }

  setTerrain(x: number, y: number, type: TerrainType): void {
    if (this.isInBounds(x, y)) {
      this.tiles[y][x] = type;
    }
  }

  getTerrain(x: number, y: number): TerrainType {
    if (!this.isInBounds(x, y)) {
      return TerrainType.PLAINS;
    }
    return this.tiles[y][x];
  }

  getTerrainData(x: number, y: number): TerrainData {
    return TERRAIN_DEFS[this.getTerrain(x, y)];
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  placeUnit(unit: Unit, x: number, y: number): void {
    if (!this.isInBounds(x, y)) {
      return;
    }
    this.units.set(this.key(x, y), unit);
  }

  removeUnit(x: number, y: number): void {
    this.units.delete(this.key(x, y));
  }

  getUnit(x: number, y: number): Unit | null {
    if (!this.isInBounds(x, y)) {
      return null;
    }
    return this.units.get(this.key(x, y)) ?? null;
  }

  isOccupied(x: number, y: number): boolean {
    return this.getUnit(x, y) !== null;
  }

  getNeighbors(x: number, y: number): GridNeighbor[] {
    const result: GridNeighbor[] = [];
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    for (const { dx, dy } of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.isInBounds(nx, ny)) {
        result.push({ x: nx, y: ny });
      }
    }
    return result;
  }
}
