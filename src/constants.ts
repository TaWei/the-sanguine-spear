export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;

export const TILE_SIZE = 48;
export const GRID_COLS = 16;
export const GRID_ROWS = 12;

export const Faction = {
  PLAYER: 'player',
  ENEMY: 'enemy',
  ALLY: 'ally',
} as const;

export const UnitClass = {
  LORD: 'lord',
  MERCENARY: 'mercenary',
  MAGE: 'mage',
  ARCHER: 'archer',
  CAVALRY: 'cavalry',
  PEGASUS_KNIGHT: 'pegasus_knight',
  SOLDIER: 'soldier',
  BRIGAND: 'brigand',
} as const;

export const TerrainType = {
  PLAINS: 'plains',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',
  WALL: 'wall',
  LAVA: 'lava',
  CLIFF: 'cliff',
  SHALLOW_WATER: 'shallow_water',
  DEEP_WATER: 'deep_water',
  BRIDGE: 'bridge',
  REEF: 'reef',
} as const;
