import { TerrainType } from '../map/Terrain';
import { Faction, UnitClass } from '../units/Unit';
import { UnitStats } from '../units/Stats';
import { CutsceneTrigger } from '../cutscene/CutsceneTrigger';
import type { AiBehavior } from '../ai/Behavior';
import type { AiPersonality } from '../ai/Personality';

export interface UnitPlacement {
  id: string;
  name: string;
  faction: Faction;
  unitClass: UnitClass;
  stats: UnitStats;
  x: number;
  y: number;
  aiBehavior?: AiBehavior;
  aiPersonality?: AiPersonality;
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
  triggers?: CutsceneTrigger[];
  startingGold?: number;
}
