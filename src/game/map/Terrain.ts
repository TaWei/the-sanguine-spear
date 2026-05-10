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
  DOOR: 'door',
  CHEST: 'chest',
  THRONE: 'throne',
  ESCAPE: 'escape',
  FORT: 'fort',
  VILLAGE: 'village',
  GATE: 'gate',
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
  shallow_water: { type: 'shallow_water', moveCost: 3, defenseBonus: -1, avoidBonus: -10 },
  deep_water: { type: 'deep_water', moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  bridge: { type: 'bridge', moveCost: 1, defenseBonus: 0, avoidBonus: 0 },
  reef: { type: 'reef', moveCost: 2, defenseBonus: 2, avoidBonus: 15 },
  door: { type: 'door', moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  chest: { type: 'chest', moveCost: 1, defenseBonus: 0, avoidBonus: 0 },
  throne: { type: 'throne', moveCost: 1, defenseBonus: 3, avoidBonus: 30, hazardDamage: 0 },
  escape: { type: 'escape', moveCost: 1, defenseBonus: 0, avoidBonus: 0 },
  fort: { type: 'fort', moveCost: 1, defenseBonus: 2, avoidBonus: 20, hazardDamage: 0 },
  village: { type: 'village', moveCost: 1, defenseBonus: 1, avoidBonus: 10 },
  gate: { type: 'gate', moveCost: 1, defenseBonus: 3, avoidBonus: 30, hazardDamage: 0 },
};
