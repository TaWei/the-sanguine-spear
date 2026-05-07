import { TerrainType } from '../map/Terrain';
import { Unit } from '../units/Unit';

export function getTerrainMoveCost(unit: Unit, terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.CLIFF:
      return unit.isFlying ? 1 : 4;
    case TerrainType.LAVA:
      return 2;
    case TerrainType.FOREST:
      return 2;
    case TerrainType.MOUNTAIN:
    case TerrainType.WATER:
    case TerrainType.WALL:
      return unit.isFlying ? 1 : 99;
    case TerrainType.PLAINS:
    default:
      return 1;
  }
}
