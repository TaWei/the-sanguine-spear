import { TerrainType } from '../map/Terrain';
import { Faction, UnitClass } from '../units/Unit';
import { UnitStats } from '../units/Stats';

export interface UnitPlacement {
  id: string;
  name: string;
  faction: Faction;
  unitClass: UnitClass;
  stats: UnitStats;
  x: number;
  y: number;
}

export interface TerrainPlacement {
  x: number;
  y: number;
  type: TerrainType;
}

export interface LevelDefinition {
  id: string;
  name: string;
  cols: number;
  rows: number;
  terrain: TerrainPlacement[];
  units: UnitPlacement[];
}
