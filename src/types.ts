export type Faction = 'player' | 'enemy' | 'ally';
export type UnitClassType =
  | 'lord'
  | 'mercenary'
  | 'mage'
  | 'archer'
  | 'cavalry'
  | 'pegasus_knight'
  | 'soldier'
  | 'brigand';
export type TerrainType = 'plains' | 'forest' | 'mountain' | 'water' | 'wall' | 'lava' | 'cliff' | 'shallow_water' | 'deep_water' | 'bridge' | 'reef' | 'door' | 'chest' | 'throne' | 'escape' | 'fort' | 'village' | 'gate';

export interface UnitStats {
  hp: number;
  maxHp: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export interface UnitData {
  id: string;
  name: string;
  faction: Faction;
  class: UnitClassType;
  level: number;
  exp: number;
  stats: UnitStats;
  growths: Partial<UnitStats>;
  inventory: string[];
  equipped: string | null;
  gridX: number;
  gridY: number;
}

export interface TerrainData {
  type: TerrainType;
  moveCost: number;
  defenseBonus: number;
  avoidBonus: number;
}

export interface TileData {
  x: number;
  y: number;
  terrain: TerrainData;
  unit: UnitData | null;
}

export type GamePhase = 'player' | 'enemy' | 'ally';
export type InputMode = 'idle' | 'select' | 'move' | 'attack' | 'menu';
