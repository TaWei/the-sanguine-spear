import { LevelDefinition } from './LevelDefinition';
import { TerrainType } from '../map/Terrain';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { AiBehavior } from '../ai/Behavior';
import { AiPersonality } from '../ai/Personality';

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
  triggers: [
    {
      id: 'lvl1_first_combat',
      cutsceneId: 'first_battle_warning',
      condition: { type: 'on_first_combat' },
      oneShot: true,
    },
    {
      id: 'lvl1_boss_death',
      cutsceneId: 'boss_defeated',
      condition: { type: 'on_kill', victimId: 'e1' },
      oneShot: true,
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

export const LEVEL_3: LevelDefinition = {
  id: 'level-3',
  name: 'The Sunken Temple',
  cols: 100,
  rows: 100,
  startingGold: 3000,
  terrain: (() => {
    const COLS = 100;
    const ROWS = 100;
    const grid: TerrainType[][] = [];
    for (let y = 0; y < ROWS; y++) {
      grid[y] = [];
      for (let x = 0; x < COLS; x++) {
        grid[y][x] = TerrainType.DEEP_WATER;
      }
    }

    function placeIsland(sx: number, sy: number, w: number, h: number): void {
      // Shallow water border (2 tiles)
      for (let y = Math.max(0, sy - 2); y <= Math.min(ROWS - 1, sy + h + 1); y++) {
        for (let x = Math.max(0, sx - 2); x <= Math.min(COLS - 1, sx + w + 1); x++) {
          if (x >= sx && x < sx + w && y >= sy && y < sy + h) continue;
          grid[y][x] = TerrainType.SHALLOW_WATER;
        }
      }
      // Plains interior
      for (let y = sy; y < sy + h && y < ROWS; y++) {
        for (let x = sx; x < sx + w && x < COLS; x++) {
          grid[y][x] = TerrainType.PLAINS;
        }
      }
      // Scattered forest
      for (let y = sy; y < sy + h && y < ROWS; y++) {
        for (let x = sx; x < sx + w && x < COLS; x++) {
          if ((x * y) % 7 === 0) {
            grid[y][x] = TerrainType.FOREST;
          }
        }
      }
    }

    // Islands
    placeIsland(5, 5, 20, 15);    // Starting Isle (NW)
    placeIsland(40, 30, 15, 15);  // Pirate Camp (NC)
    placeIsland(70, 10, 15, 15);  // Watchtower (NE)
    placeIsland(35, 55, 25, 20);  // Central Trade Isle (C)
    placeIsland(10, 60, 15, 20);  // Forgotten Shrine (SW)
    placeIsland(40, 85, 15, 13);  // Temple Approach (SC)
    placeIsland(70, 65, 20, 25);  // Temple Interior (SE)

    // Bridges connecting islands
    for (let x = 30; x <= 35; x++) grid[25][x] = TerrainType.BRIDGE;   // NW→NC
    for (let y = 45; y <= 55; y++) grid[y][50] = TerrainType.BRIDGE;   // NC→C
    for (let x = 60; x <= 65; x++) grid[75][x] = TerrainType.BRIDGE;   // C→SE
    for (let x = 30; x <= 35; x++) grid[65][x] = TerrainType.BRIDGE;   // C→SW

    // Reef clusters (3x3 patches)
    const reefCenters: [number, number][] = [
      [15, 35], [55, 20], [80, 45], [25, 50], [60, 50], [90, 35],
    ];
    for (const [cx, cy] of reefCenters) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const rx = cx + dx;
          const ry = cy + dy;
          if (rx >= 0 && rx < COLS && ry >= 0 && ry < ROWS) {
            grid[ry][rx] = TerrainType.REEF;
          }
        }
      }
    }

    // Temple interior walls forming corridors
    for (let x = 75; x <= 85; x++) grid[73][x] = TerrainType.WALL; // north wall
    for (let x = 75; x <= 85; x++) grid[82][x] = TerrainType.WALL; // south wall
    for (let y = 73; y <= 82; y++) grid[y][75] = TerrainType.WALL; // west wall
    for (let y = 73; y <= 82; y++) grid[y][85] = TerrainType.WALL; // east wall

    // Convert grid to flat array
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        terrain.push({ x, y, type: grid[y][x] });
      }
    }
    return terrain;
  })(),
  units: [
    // --- Player units (Starting Isle) ---
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 4, skl: 11, spd: 12, luk: 10, def: 10, res: 5, mov: 5 }),
      x: 8,
      y: 8,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 24, maxHp: 24, str: 2, mag: 13, skl: 10, spd: 11, luk: 9, def: 4, res: 11, mov: 5 }),
      x: 7,
      y: 10,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 3, skl: 11, spd: 14, luk: 9, def: 7, res: 7, mov: 7 }),
      x: 10,
      y: 9,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 28, maxHp: 28, str: 11, mag: 1, skl: 12, spd: 10, luk: 8, def: 9, res: 3, mov: 5 }),
      x: 9,
      y: 11,
    },
    {
      id: 'lyra',
      name: 'Lyra',
      faction: Faction.PLAYER,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 22, maxHp: 22, str: 10, mag: 1, skl: 13, spd: 11, luk: 9, def: 6, res: 3, mov: 5 }),
      x: 6,
      y: 9,
    },

    // --- Pirate Camp (NC island) ---
    {
      id: 'pirate_boss',
      name: 'Pirate Boss',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 7, spd: 8, luk: 5, def: 8, res: 2, mov: 5 }),
      x: 45,
      y: 35,
      aiBehavior: AiBehavior.PURSUE,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },
    {
      id: 'pirate_axeman',
      name: 'Pirate Axeman',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 6, spd: 7, luk: 4, def: 7, res: 1, mov: 5 }),
      x: 42,
      y: 37,
    },
    {
      id: 'pirate_swabby',
      name: 'Pirate Swabby',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 28, maxHp: 28, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 10, res: 1, mov: 5 }),
      x: 48,
      y: 34,
    },

    // --- Watchtower (NE island) ---
    {
      id: 'watchtower_sniper',
      name: 'Watchtower Sniper',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 24, maxHp: 24, str: 10, mag: 0, skl: 12, spd: 10, luk: 5, def: 5, res: 3, mov: 5 }),
      x: 77,
      y: 17,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
      aiPersonality: AiPersonality.CAUTIOUS,
    },
    {
      id: 'watchtower_guard',
      name: 'Watchtower Guard',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 11, res: 1, mov: 5 }),
      x: 75,
      y: 15,
      aiBehavior: AiBehavior.GUARD,
    },

    // --- Central Trade Isle ---
    {
      id: 'smuggler',
      name: 'Smuggler',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 28, maxHp: 28, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 10, res: 1, mov: 5 }),
      x: 45,
      y: 60,
    },
    {
      id: 'smuggler_mage',
      name: 'Smuggler Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 22, maxHp: 22, str: 1, mag: 12, skl: 7, spd: 8, luk: 5, def: 3, res: 9, mov: 5 }),
      x: 50,
      y: 62,
    },
    {
      id: 'smuggler_axe',
      name: 'Smuggler Axe',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 6, spd: 7, luk: 4, def: 7, res: 1, mov: 5 }),
      x: 48,
      y: 65,
    },

    // --- Temple Entrance (SC island) ---
    {
      id: 'temple_guardian',
      name: 'Temple Guardian',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 32, maxHp: 32, str: 11, mag: 0, skl: 9, spd: 8, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 47,
      y: 88,
      aiBehavior: AiBehavior.BOSS_GUARD,
    },
    {
      id: 'temple_guard',
      name: 'Temple Guard',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 11, res: 1, mov: 5 }),
      x: 49,
      y: 90,
    },

    // --- Temple Interior Boss (SE island) ---
    {
      id: 'boss',
      name: 'Coral Bishop',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SAGE,
      stats: createStats({ hp: 36, maxHp: 36, str: 2, mag: 15, skl: 12, spd: 11, luk: 8, def: 6, res: 12, mov: 5 }),
      x: 80,
      y: 75,
      aiBehavior: AiBehavior.BOSS_GUARD,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },
    {
      id: 'cultist_1',
      name: 'Cultist',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 22, maxHp: 22, str: 1, mag: 12, skl: 7, spd: 8, luk: 5, def: 3, res: 9, mov: 5 }),
      x: 78,
      y: 78,
    },
    {
      id: 'cultist_2',
      name: 'Cultist',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 22, maxHp: 22, str: 1, mag: 12, skl: 7, spd: 8, luk: 5, def: 3, res: 9, mov: 5 }),
      x: 82,
      y: 78,
    },

    // --- Reef Patrollers ---
    {
      id: 'reef_raider_1',
      name: 'Reef Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 28, maxHp: 28, str: 11, mag: 0, skl: 7, spd: 9, luk: 4, def: 6, res: 1, mov: 5 }),
      x: 20,
      y: 40,
      aiBehavior: AiBehavior.THIEF,
    },
    {
      id: 'reef_raider_2',
      name: 'Reef Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 30, maxHp: 30, str: 14, mag: 0, skl: 5, spd: 10, luk: 3, def: 5, res: 1, mov: 5 }),
      x: 65,
      y: 30,
      aiBehavior: AiBehavior.PURSUE,
      aiPersonality: AiPersonality.BERSERKER,
    },

    // --- Forgotten Shrine (SW island, 10-25 × 60-80) ---
    {
      id: 'shrine_sentry',
      name: 'Shrine Sentry',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 32, maxHp: 32, str: 11, mag: 0, skl: 9, spd: 7, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 15,
      y: 68,
      aiBehavior: AiBehavior.GUARD,
    },
    {
      id: 'shrine_warden',
      name: 'Shrine Warden',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 24, maxHp: 24, str: 1, mag: 13, skl: 9, spd: 8, luk: 5, def: 4, res: 10, mov: 5 }),
      x: 17,
      y: 72,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
      aiPersonality: AiPersonality.CAUTIOUS,
    },
    {
      id: 'shrine_keeper',
      name: 'Shrine Keeper',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 2, skl: 12, spd: 11, luk: 6, def: 8, res: 4, mov: 5 }),
      x: 20,
      y: 65,
      aiBehavior: AiBehavior.PURSUE,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },

    // --- Ambush on NW bridge (row 25, cols 30-35) ---
    {
      id: 'bridge_ambusher',
      name: 'Bridge Ambusher',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 26, maxHp: 26, str: 12, mag: 0, skl: 8, spd: 10, luk: 4, def: 5, res: 1, mov: 5 }),
      x: 32,
      y: 25,
      aiBehavior: AiBehavior.PURSUE,
      aiPersonality: AiPersonality.BERSERKER,
    },

    // --- Beach skirmishers on Starting Isle (east edge) ---
    {
      id: 'shore_scavenger_1',
      name: 'Shore Scavenger',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 0, skl: 6, spd: 8, luk: 4, def: 5, res: 1, mov: 5 }),
      x: 18,
      y: 12,
    },
    {
      id: 'shore_scavenger_2',
      name: 'Shore Scavenger',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 26, maxHp: 26, str: 9, mag: 0, skl: 7, spd: 9, luk: 4, def: 4, res: 1, mov: 5 }),
      x: 20,
      y: 14,
    },

    // --- Deep reef hunter (SE reef cluster) ---
    {
      id: 'reef_hunter',
      name: 'Reef Hunter',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 8, spd: 8, luk: 3, def: 9, res: 1, mov: 5 }),
      x: 85,
      y: 55,
      aiBehavior: AiBehavior.PURSUE,
    },

    // --- Central Trade Isle reinforcement ---
    {
      id: 'smuggler_lancer',
      name: 'Smuggler Lancer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 9, spd: 10, luk: 5, def: 8, res: 3, mov: 7 }),
      x: 42,
      y: 65,
      aiBehavior: AiBehavior.PURSUE,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },
  ],
  triggers: [
    {
      id: 'lvl3_boss_encounter',
      cutsceneId: 'sunken_temple_boss',
      condition: { type: 'on_boss_encounter', bossId: 'boss' },
      oneShot: true,
    },
    {
      id: 'lvl3_boss_death',
      cutsceneId: 'coral_bishop_defeated',
      condition: { type: 'on_kill', victimId: 'boss' },
      oneShot: true,
    },
  ],
};

export const LEVELS: LevelDefinition[] = [LEVEL_1, LEVEL_2, LEVEL_3];

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
