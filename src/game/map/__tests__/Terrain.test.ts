import { describe, it, expect } from 'vitest';
import { TERRAIN_DEFS, TerrainType } from '../Terrain';

describe('Terrain', () => {
  it('plains cost 1 move and give no bonuses', () => {
    const t = TERRAIN_DEFS[TerrainType.PLAINS];
    expect(t.moveCost).toBe(1);
    expect(t.defenseBonus).toBe(0);
    expect(t.avoidBonus).toBe(0);
  });

  it('forest costs 2 move and gives defense and avoid bonuses', () => {
    const t = TERRAIN_DEFS[TerrainType.FOREST];
    expect(t.moveCost).toBe(2);
    expect(t.defenseBonus).toBe(1);
    expect(t.avoidBonus).toBe(20);
  });

  it('mountain is impassable (moveCost 99)', () => {
    const t = TERRAIN_DEFS[TerrainType.MOUNTAIN];
    expect(t.moveCost).toBe(99);
  });

  it('water is impassable (moveCost 99)', () => {
    const t = TERRAIN_DEFS[TerrainType.WATER];
    expect(t.moveCost).toBe(99);
  });

  it('wall is impassable (moveCost 99)', () => {
    const t = TERRAIN_DEFS[TerrainType.WALL];
    expect(t.moveCost).toBe(99);
  });

  it('all five terrain types are defined', () => {
    const types: TerrainType[] = ['plains', 'forest', 'mountain', 'water', 'wall'];
    for (const type of types) {
      expect(TERRAIN_DEFS[type]).toBeDefined();
    }
  });
});
