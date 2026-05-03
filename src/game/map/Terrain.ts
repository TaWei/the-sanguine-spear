export const TerrainType = {
  PLAINS: 'plains',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',
  WALL: 'wall',
  LAVA: 'lava',
  CLIFF: 'cliff',
} as const;

export type TerrainType = (typeof TerrainType)[keyof typeof TerrainType];

export interface TerrainData {
  type: TerrainType;
  moveCost: number;
  defenseBonus: number;
  avoidBonus: number;
  hazardDamage?: number;
}

export const TERRAIN_DEFS: Record<TerrainType, TerrainData> = {
  plains: { type: 'plains', moveCost: 1, defenseBonus: 0, avoidBonus: 0 },
  forest: { type: 'forest', moveCost: 2, defenseBonus: 1, avoidBonus: 20 },
  mountain: { type: 'mountain', moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  water: { type: 'water', moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  wall: { type: 'wall', moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  lava: { type: 'lava', moveCost: 2, defenseBonus: 0, avoidBonus: 0, hazardDamage: 5 },
  cliff: { type: 'cliff', moveCost: 4, defenseBonus: 1, avoidBonus: 10 },
};
