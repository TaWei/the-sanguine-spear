import { TERRAIN_DEFS, TerrainData, TerrainType } from './Terrain';

export class Grid {
  readonly cols: number;
  readonly rows: number;
  private tiles: TerrainType[][];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => TerrainType.PLAINS)
    );
  }

  setTerrain(x: number, y: number, type: TerrainType): void {
    if (this.isInBounds(x, y)) {
      this.tiles[y][x] = type;
    }
  }

  getTerrain(x: number, y: number): TerrainType {
    if (!this.isInBounds(x, y)) return TerrainType.PLAINS;
    return this.tiles[y][x];
  }

  getTerrainData(x: number, y: number): TerrainData {
    return TERRAIN_DEFS[this.getTerrain(x, y)];
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }
}
