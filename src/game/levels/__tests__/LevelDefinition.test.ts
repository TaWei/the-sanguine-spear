import { describe, it, expect } from 'vitest';
import { LevelDefinition } from '../LevelDefinition';
import { TerrainType } from '../../map/Terrain';
import { Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('LevelDefinition', () => {
  it('can define a level with terrain and units', () => {
    const level: LevelDefinition = {
      id: 'test',
      name: 'Test Level',
      cols: 5,
      rows: 5,
      terrain: [
        { x: 1, y: 1, type: TerrainType.LAVA },
        { x: 2, y: 2, type: TerrainType.CLIFF },
      ],
      units: [
        {
          id: 'p1',
          name: 'Rowan',
          faction: Faction.PLAYER,
          unitClass: UnitClass.LORD,
          stats: createStats({
            hp: 20,
            maxHp: 20,
            str: 5,
            mag: 5,
            skl: 5,
            spd: 5,
            luk: 5,
            def: 5,
            res: 5,
            mov: 5,
          }),
          x: 0,
          y: 0,
        },
      ],
    };
    expect(level.id).toBe('test');
    expect(level.terrain).toHaveLength(2);
    expect(level.units).toHaveLength(1);
  });
});
