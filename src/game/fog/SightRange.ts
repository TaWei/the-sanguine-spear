import type { Unit } from '../units/Unit';
import { TerrainType } from '../map/Terrain';

/**
 * Compute a unit's sight range.
 * Base = class dependent, modified by terrain and flying status.
 */
export function computeSightRange(unit: Unit, terrainAtUnit: TerrainType): number {
  let sight = getBaseSight(unit.unitClass);

  // Terrain modifiers
  switch (terrainAtUnit) {
    case TerrainType.FOREST:
      sight -= 1;
      break;
    case TerrainType.FORT:
    case TerrainType.GATE:
      sight += 2;
      break;
    case TerrainType.MOUNTAIN:
      sight += 3;
      break;
    default:
      break;
  }

  // Flying units ignore terrain penalties but keep bonuses
  if (unit.isFlying && terrainAtUnit === TerrainType.FOREST) {
    sight += 1; // negate the penalty
  }

  return Math.max(1, sight);
}

function getBaseSight(unitClass: string): number {
  switch (unitClass) {
    case 'thief':
    case 'archer':
    case 'sniper':
      return 5;
    case 'mage':
    case 'sage':
      return 4;
    case 'pegasus_knight':
    case 'falcon_knight':
      return 5;
    default:
      return 3;
  }
}
