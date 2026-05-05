import type { TerrainType } from '../map/Terrain';
import type { Faction, UnitClass, UnitTier } from '../units/Unit';
import type { UnitStats } from '../units/Stats';
import type { Item } from '../items/ItemTypes';
import type { GamePhase } from '../state/TurnManager';
import type { UnitStateType } from '../state/UnitState';
import type { GrowthRates } from '../progression/GrowthRates';
import type { AiBehavior } from '../ai/Behavior';
import type { AiPersonality } from '../ai/Personality';

export const SAVE_VERSION = 1;

export interface TerrainSnapshot {
  x: number;
  y: number;
  type: TerrainType;
}

export interface UnitSnapshot {
  id: string;
  name: string;
  faction: Faction;
  unitClass: UnitClass;
  stats: UnitStats;
  gridX: number;
  gridY: number;
  state: UnitStateType;
  level: number;
  exp: number;
  growthRates: GrowthRates;
  tier: UnitTier;
  inventory: Item[];
  aiBehavior?: AiBehavior;
  aiPersonality?: AiPersonality;
}

export interface SaveData {
  version: number;
  timestamp: number;
  playTimeMs?: number;
  levelId: string;
  turnNumber: number;
  currentPhase: GamePhase;
  gridCols: number;
  gridRows: number;
  terrain: TerrainSnapshot[];
  units: UnitSnapshot[];
  consumedTriggers: string[];
  firstCombatOccurred: boolean;
}
