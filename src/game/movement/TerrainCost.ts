import { TerrainType } from '../map/Terrain';
import { Unit } from '../units/Unit';

export function getTerrainMoveCost(unit: Unit, terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.CLIFF:
      return unit.isFlying ? 1 : 4;
    case TerrainType.LAVA:
      return 2;
    case TerrainType.FOREST:
    case TerrainType.VILLAGE:
      return 2;
    case TerrainType.SHALLOW_WATER:
      return unit.isFlying ? 1 : 3;
    case TerrainType.REEF:
      return unit.isFlying ? 1 : 2;
    case TerrainType.BRIDGE:
    case TerrainType.CHEST:
    case TerrainType.ESCAPE:
    case TerrainType.FORT:
    case TerrainType.GATE:
    case TerrainType.THRONE:
      return 1;
    case TerrainType.MOUNTAIN:
    case TerrainType.WATER:
    case TerrainType.WALL:
    case TerrainType.DEEP_WATER:
    case TerrainType.DOOR:
      return unit.isFlying ? 1 : 99;
    case TerrainType.PLAINS:
    default:
      return 1;
  }
}
