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

export type ObjectiveType = 'rout' | 'seize' | 'defend' | 'escape';

export interface ObjectiveConfig {
  type: ObjectiveType;
  /** If true, rout is also in effect for victory (default true for 'rout' type) */
  routEnabled?: boolean;
  /** Seize: the tile position a lord must step on */
  seizeTile?: { x: number; y: number };
  /** Defend: the ID of the unit that must survive */
  defendTargetId?: string;
  /** Defend: number of turns to survive */
  defendTurns?: number;
  /** Escape: the ID of the unit that must escape */
  escapeUnitId?: string;
  /** Escape: the tile position to reach */
  escapeTile?: { x: number; y: number };
  /** If true, all ally units must survive for victory (defeat if any ally dies) */
  allyMustSurvive?: boolean;
}

export interface VillageConfig {
  x: number;
  y: number;
  goldReward?: number;
  itemReward?: string;
  cutsceneId?: string;
}

export interface ReinforcementConfig {
  groupId: string;
  spawnTurn: number;
  faction: Faction;
  units: {
    id: string;
    name: string;
    unitClass: UnitClass;
    stats: UnitStats;
    spawnX: number;
    spawnY: number;
  }[];
  oneShot: boolean;
}

export interface TalkConfig {
  recruiterId: string;
  recruitId: string;
  recruitItems?: { name: string }[];
  oneShot: boolean;
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
  objectives?: ObjectiveConfig[];
  villages?: VillageConfig[];
  reinforcements?: ReinforcementConfig[];
  talks?: TalkConfig[];
  /** If true, fog of war is active on this map. Defaults to false. */
  fogOfWar?: boolean;
}
