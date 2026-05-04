import { LevelDefinition } from './LevelDefinition';
import { TerrainType } from '../map/Terrain';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';

export const LEVEL_1: LevelDefinition = {
  id: 'level-1',
  name: 'The Sanguine Plains',
  cols: 16,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if ((x + y) % 7 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        } else if ((x * y) % 11 === 0) {
          terrain.push({ x, y, type: TerrainType.WATER });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'p1',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({
        hp: 22,
        maxHp: 22,
        str: 8,
        mag: 2,
        skl: 7,
        spd: 8,
        luk: 6,
        def: 6,
        res: 2,
        mov: 5,
      }),
      x: 2,
      y: 5,
    },
    {
      id: 'p2',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({
        hp: 16,
        maxHp: 16,
        str: 1,
        mag: 9,
        skl: 6,
        spd: 7,
        luk: 5,
        def: 2,
        res: 7,
        mov: 5,
      }),
      x: 3,
      y: 6,
    },
    {
      id: 'e1',
      name: 'Bandit',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({
        hp: 26,
        maxHp: 26,
        str: 9,
        mag: 0,
        skl: 4,
        spd: 5,
        luk: 3,
        def: 5,
        res: 1,
        mov: 5,
      }),
      x: 12,
      y: 4,
    },
    {
      id: 'e2',
      name: 'Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({
        hp: 20,
        maxHp: 20,
        str: 7,
        mag: 0,
        skl: 6,
        spd: 5,
        luk: 2,
        def: 7,
        res: 1,
        mov: 5,
      }),
      x: 13,
      y: 6,
    },
  ],
};

export const LEVEL_2: LevelDefinition = {
  id: 'level-2',
  name: 'The Molten Pass',
  cols: 16,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        // Border walls
        if (x === 0 || x === 15 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
          continue;
        }
        // Central lava river
        if (x >= 6 && x <= 9 && y >= 3 && y <= 8) {
          terrain.push({ x, y, type: TerrainType.LAVA });
          continue;
        }
        // Cliff barriers on either side of the lava
        if ((x === 5 || x === 10) && y >= 2 && y <= 9) {
          terrain.push({ x, y, type: TerrainType.CLIFF });
          continue;
        }
        // Scattered forests
        if ((x + y) % 9 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
          continue;
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'p1',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({
        hp: 24,
        maxHp: 24,
        str: 9,
        mag: 2,
        skl: 8,
        spd: 9,
        luk: 7,
        def: 7,
        res: 3,
        mov: 5,
      }),
      x: 2,
      y: 5,
    },
    {
      id: 'p2',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({
        hp: 18,
        maxHp: 18,
        str: 1,
        mag: 10,
        skl: 7,
        spd: 8,
        luk: 6,
        def: 3,
        res: 8,
        mov: 5,
      }),
      x: 2,
      y: 6,
    },
    {
      id: 'p3',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({
        hp: 20,
        maxHp: 20,
        str: 7,
        mag: 2,
        skl: 8,
        spd: 11,
        luk: 6,
        def: 5,
        res: 5,
        mov: 7,
      }),
      x: 3,
      y: 4,
    },
    {
      id: 'e1',
      name: 'Bandit',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({
        hp: 28,
        maxHp: 28,
        str: 10,
        mag: 0,
        skl: 5,
        spd: 6,
        luk: 3,
        def: 6,
        res: 1,
        mov: 5,
      }),
      x: 13,
      y: 4,
    },
    {
      id: 'e2',
      name: 'Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({
        hp: 22,
        maxHp: 22,
        str: 8,
        mag: 0,
        skl: 7,
        spd: 6,
        luk: 2,
        def: 8,
        res: 1,
        mov: 5,
      }),
      x: 13,
      y: 6,
    },
    {
      id: 'e3',
      name: 'Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({
        hp: 20,
        maxHp: 20,
        str: 7,
        mag: 0,
        skl: 8,
        spd: 7,
        luk: 4,
        def: 4,
        res: 2,
        mov: 5,
      }),
      x: 14,
      y: 5,
    },
  ],
};

export const LEVELS: LevelDefinition[] = [LEVEL_1, LEVEL_2];

export function getLevel(id: string): LevelDefinition | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getNextLevelId(currentId: string): string | null {
  const index = LEVELS.findIndex((l) => l.id === currentId);
  if (index === -1 || index >= LEVELS.length - 1) {
    return null;
  }
  return LEVELS[index + 1].id;
}
