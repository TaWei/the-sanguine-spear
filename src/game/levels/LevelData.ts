import { LevelDefinition } from './LevelDefinition';
import { TerrainType } from '../map/Terrain';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { AiBehavior } from '../ai/Behavior';
import { AiPersonality } from '../ai/Personality';

export const LEVEL_1: LevelDefinition = {
  id: 'level-1',
  name: 'The Sanguine Plains',
  fogOfWar: false,
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
  fogOfWar: false,
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
  fogOfWar: false,
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

export const LEVEL_4: LevelDefinition = {
  id: 'level-4',
  name: 'The Verdant Forest',
  fogOfWar: false,
  cols: 16,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if ((x >= 4 && x <= 6 && y >= 3 && y <= 8) || (x >= 10 && x <= 12 && y >= 2 && y <= 9)) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        } else if ((x + y) % 5 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 3, skl: 9, spd: 10, luk: 8, def: 8, res: 4, mov: 5 }),
      x: 2,
      y: 5,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 20, maxHp: 20, str: 2, mag: 11, skl: 8, spd: 9, luk: 7, def: 4, res: 9, mov: 5 }),
      x: 3,
      y: 6,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 24, maxHp: 24, str: 9, mag: 3, skl: 10, spd: 13, luk: 8, def: 6, res: 6, mov: 7 }),
      x: 1,
      y: 4,
    },
    {
      id: 'forest_bandit_1',
      name: 'Forest Bandit',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 28, maxHp: 28, str: 11, mag: 0, skl: 6, spd: 7, luk: 4, def: 6, res: 1, mov: 5 }),
      x: 10,
      y: 3,
    },
    {
      id: 'forest_bandit_2',
      name: 'Forest Bandit',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 28, maxHp: 28, str: 11, mag: 0, skl: 6, spd: 7, luk: 4, def: 6, res: 1, mov: 5 }),
      x: 12,
      y: 5,
    },
    {
      id: 'forest_bandit_3',
      name: 'Forest Bandit',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 0, skl: 5, spd: 8, luk: 3, def: 5, res: 1, mov: 5 }),
      x: 11,
      y: 8,
    },
    {
      id: 'forest_soldier_1',
      name: 'Forest Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 24, maxHp: 24, str: 9, mag: 0, skl: 7, spd: 6, luk: 3, def: 9, res: 1, mov: 5 }),
      x: 13,
      y: 4,
    },
    {
      id: 'forest_soldier_2',
      name: 'Forest Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 24, maxHp: 24, str: 9, mag: 0, skl: 7, spd: 6, luk: 3, def: 9, res: 1, mov: 5 }),
      x: 14,
      y: 7,
    },
    {
      id: 'forest_archer',
      name: 'Forest Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 22, maxHp: 22, str: 9, mag: 0, skl: 10, spd: 8, luk: 5, def: 5, res: 2, mov: 5 }),
      x: 13,
      y: 9,
    },
  ],
};

export const LEVEL_5: LevelDefinition = {
  id: 'level-5',
  name: 'The Iron Bridge',
  fogOfWar: false,
  cols: 16,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if (y === 5) {
          terrain.push({ x, y, type: TerrainType.WATER });
        } else if (y === 4 || y === 6) {
          terrain.push({ x, y, type: TerrainType.SHALLOW_WATER });
        } else if ((x === 7 || x === 8) && y >= 3 && y <= 7) {
          terrain.push({ x, y, type: TerrainType.BRIDGE });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 28, maxHp: 28, str: 11, mag: 3, skl: 10, spd: 11, luk: 9, def: 9, res: 5, mov: 5 }),
      x: 2,
      y: 3,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 22, maxHp: 22, str: 2, mag: 12, skl: 9, spd: 10, luk: 8, def: 4, res: 10, mov: 5 }),
      x: 3,
      y: 4,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 3, skl: 11, spd: 14, luk: 9, def: 7, res: 7, mov: 7 }),
      x: 1,
      y: 2,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 1, skl: 13, spd: 11, luk: 9, def: 10, res: 4, mov: 5 }),
      x: 2,
      y: 5,
    },
    {
      id: 'bridge_soldier_1',
      name: 'Bridge Guard',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 10, res: 1, mov: 5 }),
      x: 10,
      y: 3,
    },
    {
      id: 'bridge_soldier_2',
      name: 'Bridge Guard',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 10, res: 1, mov: 5 }),
      x: 12,
      y: 4,
    },
    {
      id: 'bridge_archer',
      name: 'Bridge Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 24, maxHp: 24, str: 10, mag: 0, skl: 11, spd: 9, luk: 5, def: 5, res: 2, mov: 5 }),
      x: 11,
      y: 2,
    },
    {
      id: 'bridge_bandit_1',
      name: 'Bridge Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 7, spd: 8, luk: 4, def: 7, res: 1, mov: 5 }),
      x: 13,
      y: 7,
    },
    {
      id: 'bridge_bandit_2',
      name: 'Bridge Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 7, spd: 8, luk: 4, def: 7, res: 1, mov: 5 }),
      x: 14,
      y: 9,
    },
    {
      id: 'bridge_mage',
      name: 'Bridge Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 20, maxHp: 20, str: 1, mag: 11, skl: 7, spd: 8, luk: 5, def: 3, res: 8, mov: 5 }),
      x: 12,
      y: 8,
    },
  ],
};

export const LEVEL_6: LevelDefinition = {
  id: 'level-6',
  name: 'The Siege of Fort Granius',
  fogOfWar: false,
  cols: 16,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if (x >= 10 && x <= 14 && y >= 2 && y <= 5) {
          terrain.push({ x, y, type: TerrainType.WALL });
        } else if (x === 10 && y === 4) {
          terrain.push({ x, y, type: TerrainType.GATE });
        } else if (x >= 11 && x <= 13 && y === 6) {
          terrain.push({ x, y, type: TerrainType.FORT });
        } else if ((x + y) % 7 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 4, skl: 11, spd: 12, luk: 10, def: 10, res: 5, mov: 5 }),
      x: 2,
      y: 5,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 24, maxHp: 24, str: 2, mag: 13, skl: 10, spd: 11, luk: 9, def: 5, res: 11, mov: 5 }),
      x: 3,
      y: 6,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 28, maxHp: 28, str: 11, mag: 4, skl: 12, spd: 15, luk: 10, def: 8, res: 8, mov: 7 }),
      x: 1,
      y: 4,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 32, maxHp: 32, str: 13, mag: 1, skl: 14, spd: 12, luk: 10, def: 11, res: 4, mov: 5 }),
      x: 2,
      y: 7,
    },
    {
      id: 'fort_commander',
      name: 'Fort Commander',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 32, maxHp: 32, str: 12, mag: 0, skl: 10, spd: 8, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 12,
      y: 4,
      aiBehavior: AiBehavior.BOSS_GUARD,
    },
    {
      id: 'fort_soldier_1',
      name: 'Fort Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 28, maxHp: 28, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 11, res: 1, mov: 5 }),
      x: 11,
      y: 3,
      aiBehavior: AiBehavior.GUARD,
    },
    {
      id: 'fort_soldier_2',
      name: 'Fort Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 28, maxHp: 28, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 11, res: 1, mov: 5 }),
      x: 13,
      y: 3,
      aiBehavior: AiBehavior.GUARD,
    },
    {
      id: 'fort_archer',
      name: 'Fort Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 24, maxHp: 24, str: 10, mag: 0, skl: 11, spd: 9, luk: 5, def: 5, res: 2, mov: 5 }),
      x: 12,
      y: 2,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'fort_bandit_1',
      name: 'Fort Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 7, spd: 8, luk: 4, def: 7, res: 1, mov: 5 }),
      x: 9,
      y: 8,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'fort_bandit_2',
      name: 'Fort Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 7, spd: 8, luk: 4, def: 7, res: 1, mov: 5 }),
      x: 13,
      y: 9,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'fort_mage',
      name: 'Fort Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 22, maxHp: 22, str: 1, mag: 12, skl: 8, spd: 9, luk: 5, def: 3, res: 9, mov: 5 }),
      x: 11,
      y: 8,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
  ],
  reinforcements: [
    {
      groupId: 'fort_reinforcements',
      spawnTurn: 4,
      faction: Faction.ENEMY,
      units: [
        {
          id: 'reinforcement_soldier',
          name: 'Reinforcement Soldier',
          unitClass: UnitClass.SOLDIER,
          stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 10, res: 1, mov: 5 }),
          spawnX: 14,
          spawnY: 10,
        },
        {
          id: 'reinforcement_bandit',
          name: 'Reinforcement Raider',
          unitClass: UnitClass.BRIGAND,
          stats: createStats({ hp: 28, maxHp: 28, str: 11, mag: 0, skl: 6, spd: 7, luk: 3, def: 6, res: 1, mov: 5 }),
          spawnX: 1,
          spawnY: 10,
        },
      ],
      oneShot: true,
    },
  ],
};

export const LEVEL_7: LevelDefinition = {
  id: 'level-7',
  name: 'The Canyon Escape',
  fogOfWar: false,
  cols: 20,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 20; x++) {
        if (x === 0 || x === 19 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if (x >= 4 && x <= 6 && y >= 2 && y <= 9) {
          terrain.push({ x, y, type: TerrainType.CLIFF });
        } else if (x >= 14 && x <= 16 && y >= 2 && y <= 9) {
          terrain.push({ x, y, type: TerrainType.CLIFF });
        } else if (x === 18 && y >= 4 && y <= 7) {
          terrain.push({ x, y, type: TerrainType.ESCAPE });
        } else if ((x + y) % 6 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 32, maxHp: 32, str: 13, mag: 4, skl: 12, spd: 13, luk: 11, def: 11, res: 6, mov: 5 }),
      x: 2,
      y: 5,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 26, maxHp: 26, str: 2, mag: 14, skl: 11, spd: 12, luk: 10, def: 5, res: 12, mov: 5 }),
      x: 3,
      y: 6,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 4, skl: 13, spd: 16, luk: 11, def: 9, res: 9, mov: 7 }),
      x: 1,
      y: 4,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 34, maxHp: 34, str: 14, mag: 1, skl: 15, spd: 13, luk: 11, def: 12, res: 5, mov: 5 }),
      x: 2,
      y: 7,
    },
    {
      id: 'lyra',
      name: 'Lyra',
      faction: Faction.PLAYER,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 26, maxHp: 26, str: 11, mag: 1, skl: 14, spd: 12, luk: 10, def: 7, res: 4, mov: 5 }),
      x: 3,
      y: 4,
    },
    {
      id: 'canyon_soldier_1',
      name: 'Canyon Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 30, maxHp: 30, str: 11, mag: 0, skl: 9, spd: 8, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 10,
      y: 3,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'canyon_soldier_2',
      name: 'Canyon Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 30, maxHp: 30, str: 11, mag: 0, skl: 9, spd: 8, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 12,
      y: 5,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'canyon_archer_1',
      name: 'Canyon Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 26, maxHp: 26, str: 11, mag: 0, skl: 12, spd: 10, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 11,
      y: 2,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'canyon_archer_2',
      name: 'Canyon Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 26, maxHp: 26, str: 11, mag: 0, skl: 12, spd: 10, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 13,
      y: 8,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'canyon_bandit_1',
      name: 'Canyon Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 32, maxHp: 32, str: 13, mag: 0, skl: 8, spd: 9, luk: 4, def: 8, res: 1, mov: 5 }),
      x: 8,
      y: 9,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'canyon_bandit_2',
      name: 'Canyon Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 32, maxHp: 32, str: 13, mag: 0, skl: 8, spd: 9, luk: 4, def: 8, res: 1, mov: 5 }),
      x: 15,
      y: 9,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'canyon_mage',
      name: 'Canyon Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 24, maxHp: 24, str: 1, mag: 13, skl: 9, spd: 10, luk: 6, def: 4, res: 10, mov: 5 }),
      x: 9,
      y: 7,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'canyon_cavalry',
      name: 'Canyon Lancer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 32, maxHp: 32, str: 12, mag: 0, skl: 10, spd: 11, luk: 6, def: 9, res: 3, mov: 7 }),
      x: 17,
      y: 6,
      aiBehavior: AiBehavior.PURSUE,
    },
  ],
  objectives: [
    {
      type: 'escape',
      escapeUnitId: 'rowan',
      escapeTile: { x: 18, y: 5 },
    },
  ],
  reinforcements: [
    {
      groupId: 'canyon_reinforce_1',
      spawnTurn: 3,
      faction: Faction.ENEMY,
      units: [
        {
          id: 'canyon_rein_soldier',
          name: 'Canyon Reinforcement',
          unitClass: UnitClass.SOLDIER,
          stats: createStats({ hp: 28, maxHp: 28, str: 10, mag: 0, skl: 8, spd: 7, luk: 3, def: 11, res: 1, mov: 5 }),
          spawnX: 1,
          spawnY: 10,
        },
      ],
      oneShot: true,
    },
    {
      groupId: 'canyon_reinforce_2',
      spawnTurn: 5,
      faction: Faction.ENEMY,
      units: [
        {
          id: 'canyon_rein_bandit',
          name: 'Canyon Reinforcement',
          unitClass: UnitClass.BRIGAND,
          stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 7, spd: 8, luk: 4, def: 7, res: 1, mov: 5 }),
          spawnX: 18,
          spawnY: 1,
        },
      ],
      oneShot: true,
    },
    {
      groupId: 'canyon_reinforce_3',
      spawnTurn: 7,
      faction: Faction.ENEMY,
      units: [
        {
          id: 'canyon_rein_archer',
          name: 'Canyon Reinforcement',
          unitClass: UnitClass.ARCHER,
          stats: createStats({ hp: 24, maxHp: 24, str: 10, mag: 0, skl: 11, spd: 9, luk: 5, def: 5, res: 2, mov: 5 }),
          spawnX: 10,
          spawnY: 1,
        },
      ],
      oneShot: true,
    },
  ],
};

export const LEVEL_8: LevelDefinition = {
  id: 'level-8',
  name: 'The Fog of Ruins',
  fogOfWar: true,
  cols: 16,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if (x >= 6 && x <= 9 && y >= 3 && y <= 8) {
          terrain.push({ x, y, type: TerrainType.WALL });
        } else if (x === 7 && y === 5) {
          terrain.push({ x, y, type: TerrainType.CHEST });
        } else if ((x + y) % 5 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        } else if ((x * y) % 13 === 0) {
          terrain.push({ x, y, type: TerrainType.WATER });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 34, maxHp: 34, str: 14, mag: 4, skl: 13, spd: 14, luk: 12, def: 12, res: 6, mov: 5 }),
      x: 2,
      y: 5,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 28, maxHp: 28, str: 2, mag: 15, skl: 12, spd: 13, luk: 11, def: 5, res: 13, mov: 5 }),
      x: 3,
      y: 6,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 32, maxHp: 32, str: 13, mag: 4, skl: 14, spd: 17, luk: 12, def: 10, res: 10, mov: 7 }),
      x: 1,
      y: 4,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 36, maxHp: 36, str: 15, mag: 1, skl: 16, spd: 14, luk: 12, def: 13, res: 5, mov: 5 }),
      x: 2,
      y: 7,
    },
    {
      id: 'ruins_wraith_1',
      name: 'Ruins Wraith',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 10, spd: 9, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 11,
      y: 3,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'ruins_wraith_2',
      name: 'Ruins Wraith',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 10, spd: 9, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 13,
      y: 5,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'ruins_archer',
      name: 'Ruins Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 26, maxHp: 26, str: 11, mag: 0, skl: 12, spd: 10, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 12,
      y: 2,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'ruins_mage',
      name: 'Ruins Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 24, maxHp: 24, str: 1, mag: 13, skl: 9, spd: 10, luk: 6, def: 4, res: 10, mov: 5 }),
      x: 10,
      y: 8,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'ruins_boss',
      name: 'Ruins Guardian',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 34, maxHp: 34, str: 14, mag: 1, skl: 13, spd: 12, luk: 7, def: 10, res: 4, mov: 5 }),
      x: 13,
      y: 9,
      aiBehavior: AiBehavior.BOSS_GUARD,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },
    {
      id: 'ruins_thief',
      name: 'Ruins Thief',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 28, maxHp: 28, str: 11, mag: 0, skl: 8, spd: 12, luk: 7, def: 5, res: 1, mov: 5 }),
      x: 5,
      y: 9,
      aiBehavior: AiBehavior.THIEF,
    },
  ],
  objectives: [
    {
      type: 'rout',
      routEnabled: true,
    },
  ],
};

export const LEVEL_9: LevelDefinition = {
  id: 'level-9',
  name: 'The Coastal Siege',
  fogOfWar: false,
  cols: 20,
  rows: 14,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 14; y++) {
      for (let x = 0; x < 20; x++) {
        if (x === 0 || x === 19 || y === 0 || y === 13) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if (y >= 9) {
          terrain.push({ x, y, type: TerrainType.WATER });
        } else if (y === 8) {
          terrain.push({ x, y, type: TerrainType.SHALLOW_WATER });
        } else if ((x >= 8 && x <= 11) && y === 7) {
          terrain.push({ x, y, type: TerrainType.BRIDGE });
        } else if ((x + y) % 6 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 36, maxHp: 36, str: 15, mag: 5, skl: 14, spd: 15, luk: 13, def: 13, res: 7, mov: 5 }),
      x: 3,
      y: 4,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 30, maxHp: 30, str: 2, mag: 16, skl: 13, spd: 14, luk: 12, def: 6, res: 14, mov: 5 }),
      x: 4,
      y: 5,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 34, maxHp: 34, str: 14, mag: 5, skl: 15, spd: 18, luk: 13, def: 11, res: 11, mov: 7 }),
      x: 2,
      y: 3,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 38, maxHp: 38, str: 16, mag: 1, skl: 17, spd: 15, luk: 13, def: 14, res: 5, mov: 5 }),
      x: 3,
      y: 6,
    },
    {
      id: 'ally_captain',
      name: 'Captain Aldric',
      faction: Faction.ALLY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 32, maxHp: 32, str: 13, mag: 0, skl: 11, spd: 9, luk: 6, def: 13, res: 3, mov: 5 }),
      x: 5,
      y: 4,
    },
    {
      id: 'ally_militia',
      name: 'Militia',
      faction: Faction.ALLY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 0, skl: 8, spd: 7, luk: 4, def: 10, res: 1, mov: 5 }),
      x: 6,
      y: 5,
    },
    {
      id: 'coast_soldier_1',
      name: 'Coast Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 32, maxHp: 32, str: 12, mag: 0, skl: 10, spd: 9, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 14,
      y: 3,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'coast_soldier_2',
      name: 'Coast Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 32, maxHp: 32, str: 12, mag: 0, skl: 10, spd: 9, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 16,
      y: 5,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'coast_archer',
      name: 'Coast Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 28, maxHp: 28, str: 12, mag: 0, skl: 13, spd: 11, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 15,
      y: 2,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'coast_mage',
      name: 'Coast Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 26, maxHp: 26, str: 1, mag: 14, skl: 10, spd: 11, luk: 6, def: 4, res: 11, mov: 5 }),
      x: 13,
      y: 6,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'coast_captain',
      name: 'Coast Captain',
      faction: Faction.ENEMY,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 12, luk: 7, def: 10, res: 3, mov: 7 }),
      x: 17,
      y: 4,
      aiBehavior: AiBehavior.PURSUE,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },
  ],
  objectives: [
    {
      type: 'rout',
      routEnabled: true,
      allyMustSurvive: true,
    },
  ],
};

export const LEVEL_10: LevelDefinition = {
  id: 'level-10',
  name: 'The Thornwood Ambush',
  fogOfWar: false,
  cols: 16,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if ((x >= 2 && x <= 5 && y >= 2 && y <= 9) || (x >= 10 && x <= 13 && y >= 2 && y <= 9)) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        } else if ((x + y) % 4 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 38, maxHp: 38, str: 16, mag: 5, skl: 15, spd: 16, luk: 14, def: 14, res: 7, mov: 5 }),
      x: 2,
      y: 5,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 32, maxHp: 32, str: 3, mag: 17, skl: 14, spd: 15, luk: 13, def: 6, res: 15, mov: 5 }),
      x: 3,
      y: 6,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 36, maxHp: 36, str: 15, mag: 5, skl: 16, spd: 19, luk: 14, def: 12, res: 12, mov: 7 }),
      x: 1,
      y: 4,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 40, maxHp: 40, str: 17, mag: 1, skl: 18, spd: 16, luk: 14, def: 15, res: 5, mov: 5 }),
      x: 2,
      y: 7,
    },
    {
      id: 'lyra',
      name: 'Lyra',
      faction: Faction.PLAYER,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 30, maxHp: 30, str: 13, mag: 1, skl: 16, spd: 14, luk: 12, def: 8, res: 4, mov: 5 }),
      x: 3,
      y: 4,
    },
    {
      id: 'thorn_soldier_1',
      name: 'Thorn Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 32, maxHp: 32, str: 12, mag: 0, skl: 10, spd: 9, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 10,
      y: 3,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'thorn_soldier_2',
      name: 'Thorn Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 32, maxHp: 32, str: 12, mag: 0, skl: 10, spd: 9, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 12,
      y: 5,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'thorn_soldier_3',
      name: 'Thorn Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 32, maxHp: 32, str: 12, mag: 0, skl: 10, spd: 9, luk: 4, def: 12, res: 2, mov: 5 }),
      x: 11,
      y: 8,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'thorn_archer_1',
      name: 'Thorn Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 28, maxHp: 28, str: 12, mag: 0, skl: 14, spd: 11, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 13,
      y: 2,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'thorn_archer_2',
      name: 'Thorn Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 28, maxHp: 28, str: 12, mag: 0, skl: 14, spd: 11, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 14,
      y: 6,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'thorn_archer_3',
      name: 'Thorn Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 28, maxHp: 28, str: 12, mag: 0, skl: 14, spd: 11, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 13,
      y: 9,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'thorn_mage_1',
      name: 'Thorn Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 26, maxHp: 26, str: 1, mag: 14, skl: 10, spd: 11, luk: 6, def: 4, res: 11, mov: 5 }),
      x: 9,
      y: 7,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'thorn_mage_2',
      name: 'Thorn Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 26, maxHp: 26, str: 1, mag: 14, skl: 10, spd: 11, luk: 6, def: 4, res: 11, mov: 5 }),
      x: 14,
      y: 4,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'thorn_bandit_1',
      name: 'Thorn Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 34, maxHp: 34, str: 14, mag: 0, skl: 9, spd: 10, luk: 4, def: 8, res: 1, mov: 5 }),
      x: 8,
      y: 9,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'thorn_bandit_2',
      name: 'Thorn Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 34, maxHp: 34, str: 14, mag: 0, skl: 9, spd: 10, luk: 4, def: 8, res: 1, mov: 5 }),
      x: 14,
      y: 10,
      aiBehavior: AiBehavior.PURSUE,
    },
  ],
  objectives: [
    {
      type: 'rout',
      routEnabled: true,
    },
  ],
};

export const LEVEL_11: LevelDefinition = {
  id: 'level-11',
  name: 'The Hall of the Mountain King',
  fogOfWar: false,
  cols: 16,
  rows: 14,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 14; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 13) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if (x >= 5 && x <= 10 && y >= 4 && y <= 9) {
          terrain.push({ x, y, type: TerrainType.WALL });
        } else if (x === 7 && y === 6) {
          terrain.push({ x, y, type: TerrainType.THRONE });
        } else if (x === 7 && y === 5) {
          terrain.push({ x, y, type: TerrainType.GATE });
        } else if ((x + y) % 7 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 40, maxHp: 40, str: 17, mag: 6, skl: 16, spd: 17, luk: 15, def: 15, res: 8, mov: 5 }),
      x: 2,
      y: 6,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 34, maxHp: 34, str: 3, mag: 18, skl: 15, spd: 16, luk: 14, def: 7, res: 16, mov: 5 }),
      x: 3,
      y: 7,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 38, maxHp: 38, str: 16, mag: 6, skl: 17, spd: 20, luk: 15, def: 13, res: 13, mov: 7 }),
      x: 1,
      y: 5,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 42, maxHp: 42, str: 18, mag: 1, skl: 19, spd: 17, luk: 15, def: 16, res: 6, mov: 5 }),
      x: 2,
      y: 8,
    },
    {
      id: 'lyra',
      name: 'Lyra',
      faction: Faction.PLAYER,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 32, maxHp: 32, str: 14, mag: 1, skl: 17, spd: 15, luk: 13, def: 9, res: 4, mov: 5 }),
      x: 3,
      y: 5,
    },
    {
      id: 'mountain_soldier_1',
      name: 'Mountain Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 9, luk: 4, def: 13, res: 2, mov: 5 }),
      x: 12,
      y: 4,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'mountain_soldier_2',
      name: 'Mountain Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 9, luk: 4, def: 13, res: 2, mov: 5 }),
      x: 13,
      y: 6,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'mountain_soldier_3',
      name: 'Mountain Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 9, luk: 4, def: 13, res: 2, mov: 5 }),
      x: 12,
      y: 9,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'mountain_archer_1',
      name: 'Mountain Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 30, maxHp: 30, str: 13, mag: 0, skl: 15, spd: 12, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 13,
      y: 3,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'mountain_archer_2',
      name: 'Mountain Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 30, maxHp: 30, str: 13, mag: 0, skl: 15, spd: 12, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 14,
      y: 8,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'mountain_mage',
      name: 'Mountain Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 28, maxHp: 28, str: 1, mag: 15, skl: 11, spd: 12, luk: 6, def: 4, res: 12, mov: 5 }),
      x: 11,
      y: 7,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'general_boros',
      name: 'General Boros',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 40, maxHp: 40, str: 17, mag: 1, skl: 15, spd: 14, luk: 8, def: 12, res: 5, mov: 5 }),
      x: 7,
      y: 6,
      aiBehavior: AiBehavior.BOSS_GUARD,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },
  ],
  objectives: [
    {
      type: 'rout',
      routEnabled: true,
    },
  ],
};

export const LEVEL_12: LevelDefinition = {
  id: 'level-12',
  name: "The Battle of Karra's Gate",
  fogOfWar: false,
  cols: 24,
  rows: 16,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 24; x++) {
        if (x === 0 || x === 23 || y === 0 || y === 15) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if (x >= 16 && x <= 20 && y >= 4 && y <= 11) {
          terrain.push({ x, y, type: TerrainType.WALL });
        } else if (x === 16 && y === 7) {
          terrain.push({ x, y, type: TerrainType.GATE });
        } else if (x >= 17 && x <= 19 && y === 5) {
          terrain.push({ x, y, type: TerrainType.FORT });
        } else if ((x + y) % 6 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 42, maxHp: 42, str: 18, mag: 6, skl: 17, spd: 18, luk: 16, def: 16, res: 8, mov: 5 }),
      x: 3,
      y: 7,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 36, maxHp: 36, str: 3, mag: 19, skl: 16, spd: 17, luk: 15, def: 7, res: 17, mov: 5 }),
      x: 4,
      y: 8,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 40, maxHp: 40, str: 17, mag: 6, skl: 18, spd: 21, luk: 16, def: 14, res: 14, mov: 7 }),
      x: 2,
      y: 6,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 44, maxHp: 44, str: 19, mag: 1, skl: 20, spd: 18, luk: 16, def: 17, res: 6, mov: 5 }),
      x: 3,
      y: 9,
    },
    {
      id: 'lyra',
      name: 'Lyra',
      faction: Faction.PLAYER,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 34, maxHp: 34, str: 15, mag: 1, skl: 18, spd: 16, luk: 14, def: 9, res: 4, mov: 5 }),
      x: 4,
      y: 6,
    },
    {
      id: 'karra_ally',
      name: 'Karra Knight',
      faction: Faction.PLAYER,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 36, maxHp: 36, str: 14, mag: 0, skl: 12, spd: 13, luk: 8, def: 11, res: 4, mov: 7 }),
      x: 1,
      y: 8,
    },
    {
      id: 'karra_lancer_1',
      name: 'Karra Lancer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 12, luk: 6, def: 10, res: 3, mov: 7 }),
      x: 18,
      y: 5,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'karra_lancer_2',
      name: 'Karra Lancer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 12, luk: 6, def: 10, res: 3, mov: 7 }),
      x: 20,
      y: 7,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'karra_lancer_3',
      name: 'Karra Lancer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 12, luk: 6, def: 10, res: 3, mov: 7 }),
      x: 19,
      y: 10,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'karra_archer_1',
      name: 'Karra Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 30, maxHp: 30, str: 13, mag: 0, skl: 15, spd: 12, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 21,
      y: 4,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'karra_archer_2',
      name: 'Karra Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 30, maxHp: 30, str: 13, mag: 0, skl: 15, spd: 12, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 21,
      y: 11,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'karra_mage',
      name: 'Karra Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 28, maxHp: 28, str: 1, mag: 15, skl: 11, spd: 12, luk: 6, def: 4, res: 12, mov: 5 }),
      x: 17,
      y: 9,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'karra_soldier',
      name: 'Karra Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 9, luk: 4, def: 13, res: 2, mov: 5 }),
      x: 15,
      y: 6,
      aiBehavior: AiBehavior.GUARD,
    },
    {
      id: 'captain_voss',
      name: 'Captain Voss',
      faction: Faction.ENEMY,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 40, maxHp: 40, str: 16, mag: 0, skl: 14, spd: 15, luk: 9, def: 12, res: 4, mov: 7 }),
      x: 18,
      y: 8,
      aiBehavior: AiBehavior.PURSUE,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },
  ],
  objectives: [
    {
      type: 'rout',
      routEnabled: true,
    },
  ],
};

export const LEVEL_13: LevelDefinition = {
  id: 'level-13',
  name: 'The Crimson Throne (Finale)',
  fogOfWar: false,
  cols: 100,
  rows: 60,
  terrain: (() => {
    const COLS = 100;
    const ROWS = 60;
    const grid: TerrainType[][] = [];
    for (let y = 0; y < ROWS; y++) {
      grid[y] = [];
      for (let x = 0; x < COLS; x++) {
        grid[y][x] = TerrainType.PLAINS;
      }
    }

    // Outer wall ring
    for (let x = 0; x < COLS; x++) {
      grid[0][x] = TerrainType.MOUNTAIN;
      grid[ROWS - 1][x] = TerrainType.MOUNTAIN;
    }
    for (let y = 0; y < ROWS; y++) {
      grid[y][0] = TerrainType.MOUNTAIN;
      grid[y][COLS - 1] = TerrainType.MOUNTAIN;
    }

    // Throne room (SE quadrant)
    for (let y = 40; y < 55; y++) {
      for (let x = 70; x < 90; x++) {
        grid[y][x] = TerrainType.WALL;
      }
    }
    for (let y = 42; y < 53; y++) {
      for (let x = 72; x < 88; x++) {
        grid[y][x] = TerrainType.PLAINS;
      }
    }
    grid[47][80] = TerrainType.THRONE;
    grid[52][80] = TerrainType.GATE;

    // Second throne room (NE quadrant)
    for (let y = 10; y < 25; y++) {
      for (let x = 70; x < 90; x++) {
        grid[y][x] = TerrainType.WALL;
      }
    }
    for (let y = 12; y < 23; y++) {
      for (let x = 72; x < 88; x++) {
        grid[y][x] = TerrainType.PLAINS;
      }
    }
    grid[17][80] = TerrainType.THRONE;
    grid[22][80] = TerrainType.GATE;

    // Central courtyard
    for (let y = 25; y < 35; y++) {
      for (let x = 35; x < 65; x++) {
        if (x === 35 || x === 64 || y === 25 || y === 34) {
          grid[y][x] = TerrainType.WALL;
        }
      }
    }
    grid[29][35] = TerrainType.GATE;
    grid[29][64] = TerrainType.GATE;

    // Scattered forests
    for (let y = 2; y < ROWS - 2; y++) {
      for (let x = 2; x < COLS - 2; x++) {
        if (grid[y][x] === TerrainType.PLAINS && (x * y) % 11 === 0) {
          grid[y][x] = TerrainType.FOREST;
        }
      }
    }

    // Water moat on west side
    for (let y = 10; y < 50; y++) {
      for (let x = 10; x < 15; x++) {
        grid[y][x] = TerrainType.WATER;
      }
    }
    for (let y = 10; y < 50; y++) {
      grid[y][9] = TerrainType.SHALLOW_WATER;
      grid[y][15] = TerrainType.SHALLOW_WATER;
    }

    // Bridges over moat
    for (let y = 20; y <= 22; y++) grid[y][12] = TerrainType.BRIDGE;
    for (let y = 38; y <= 40; y++) grid[y][12] = TerrainType.BRIDGE;

    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        terrain.push({ x, y, type: grid[y][x] });
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'rowan',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 45, maxHp: 45, str: 20, mag: 7, skl: 19, spd: 20, luk: 18, def: 18, res: 10, mov: 5 }),
      x: 20,
      y: 30,
    },
    {
      id: 'elara',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 38, maxHp: 38, str: 3, mag: 21, skl: 18, spd: 19, luk: 17, def: 8, res: 19, mov: 5 }),
      x: 21,
      y: 31,
    },
    {
      id: 'sylvie',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 42, maxHp: 42, str: 19, mag: 7, skl: 20, spd: 23, luk: 18, def: 16, res: 16, mov: 7 }),
      x: 19,
      y: 29,
    },
    {
      id: 'gareth',
      name: 'Gareth',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 46, maxHp: 46, str: 21, mag: 1, skl: 22, spd: 20, luk: 18, def: 19, res: 7, mov: 5 }),
      x: 20,
      y: 32,
    },
    {
      id: 'lyra',
      name: 'Lyra',
      faction: Faction.PLAYER,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 36, maxHp: 36, str: 17, mag: 1, skl: 20, spd: 18, luk: 16, def: 10, res: 5, mov: 5 }),
      x: 21,
      y: 29,
    },
    {
      id: 'karra_ally',
      name: 'Karra Knight',
      faction: Faction.PLAYER,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 38, maxHp: 38, str: 16, mag: 0, skl: 14, spd: 15, luk: 9, def: 12, res: 4, mov: 7 }),
      x: 18,
      y: 31,
    },
    {
      id: 'ally_aldric',
      name: 'Aldric',
      faction: Faction.ALLY,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 42, maxHp: 42, str: 18, mag: 5, skl: 17, spd: 16, luk: 14, def: 15, res: 8, mov: 5 }),
      x: 22,
      y: 30,
    },
    {
      id: 'ally_militia_captain',
      name: 'Militia Captain',
      faction: Faction.ALLY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 36, maxHp: 36, str: 14, mag: 0, skl: 12, spd: 10, luk: 7, def: 14, res: 3, mov: 5 }),
      x: 23,
      y: 31,
    },
    {
      id: 'throne_soldier_1',
      name: 'Throne Guard',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 36, maxHp: 36, str: 14, mag: 0, skl: 12, spd: 10, luk: 5, def: 14, res: 2, mov: 5 }),
      x: 75,
      y: 45,
      aiBehavior: AiBehavior.GUARD,
    },
    {
      id: 'throne_soldier_2',
      name: 'Throne Guard',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 36, maxHp: 36, str: 14, mag: 0, skl: 12, spd: 10, luk: 5, def: 14, res: 2, mov: 5 }),
      x: 85,
      y: 45,
      aiBehavior: AiBehavior.GUARD,
    },
    {
      id: 'throne_soldier_3',
      name: 'Throne Guard',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 36, maxHp: 36, str: 14, mag: 0, skl: 12, spd: 10, luk: 5, def: 14, res: 2, mov: 5 }),
      x: 80,
      y: 50,
      aiBehavior: AiBehavior.GUARD,
    },
    {
      id: 'throne_archer_1',
      name: 'Throne Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 32, maxHp: 32, str: 14, mag: 0, skl: 16, spd: 13, luk: 7, def: 7, res: 2, mov: 5 }),
      x: 73,
      y: 43,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'throne_archer_2',
      name: 'Throne Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 32, maxHp: 32, str: 14, mag: 0, skl: 16, spd: 13, luk: 7, def: 7, res: 2, mov: 5 }),
      x: 87,
      y: 43,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'throne_mage_1',
      name: 'Throne Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 30, maxHp: 30, str: 1, mag: 17, skl: 12, spd: 13, luk: 7, def: 5, res: 14, mov: 5 }),
      x: 78,
      y: 48,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'throne_mage_2',
      name: 'Throne Mage',
      faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 30, maxHp: 30, str: 1, mag: 17, skl: 12, spd: 13, luk: 7, def: 5, res: 14, mov: 5 }),
      x: 82,
      y: 48,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE,
    },
    {
      id: 'throne_cavalry_1',
      name: 'Throne Lancer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 36, maxHp: 36, str: 15, mag: 0, skl: 13, spd: 14, luk: 7, def: 11, res: 3, mov: 7 }),
      x: 60,
      y: 30,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'throne_cavalry_2',
      name: 'Throne Lancer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.CAVALRY,
      stats: createStats({ hp: 36, maxHp: 36, str: 15, mag: 0, skl: 13, spd: 14, luk: 7, def: 11, res: 3, mov: 7 }),
      x: 65,
      y: 35,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'throne_brigand_1',
      name: 'Throne Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 38, maxHp: 38, str: 16, mag: 0, skl: 10, spd: 11, luk: 5, def: 9, res: 1, mov: 5 }),
      x: 50,
      y: 40,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'throne_brigand_2',
      name: 'Throne Raider',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 38, maxHp: 38, str: 16, mag: 0, skl: 10, spd: 11, luk: 5, def: 9, res: 1, mov: 5 }),
      x: 55,
      y: 25,
      aiBehavior: AiBehavior.PURSUE,
    },
    {
      id: 'throne_boss_1',
      name: 'Crimson Chancellor',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SAGE,
      stats: createStats({ hp: 42, maxHp: 42, str: 3, mag: 20, skl: 16, spd: 15, luk: 10, def: 8, res: 16, mov: 5 }),
      x: 80,
      y: 46,
      aiBehavior: AiBehavior.BOSS_GUARD,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },
    {
      id: 'throne_boss_2',
      name: 'Iron Regent',
      faction: Faction.ENEMY,
      unitClass: UnitClass.GENERAL,
      stats: createStats({ hp: 48, maxHp: 48, str: 18, mag: 0, skl: 14, spd: 10, luk: 8, def: 18, res: 4, mov: 5 }),
      x: 80,
      y: 16,
      aiBehavior: AiBehavior.BOSS_GUARD,
      aiPersonality: AiPersonality.AGGRESSIVE,
    },
    {
      id: 'throne_assassin',
      name: 'Throne Assassin',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ASSASSIN,
      stats: createStats({ hp: 30, maxHp: 30, str: 14, mag: 0, skl: 16, spd: 17, luk: 10, def: 6, res: 2, mov: 6 }),
      x: 70,
      y: 20,
      aiBehavior: AiBehavior.PURSUE,
      aiPersonality: AiPersonality.BERSERKER,
    },
  ],
  objectives: [
    {
      type: 'seize',
      seizeTile: { x: 80, y: 47 },
    },
    {
      type: 'seize',
      seizeTile: { x: 80, y: 17 },
    },
  ],
  reinforcements: [
    {
      groupId: 'throne_reinforce_1',
      spawnTurn: 6,
      faction: Faction.ENEMY,
      units: [
        {
          id: 'rein_soldier_1',
          name: 'Reinforcement Guard',
          unitClass: UnitClass.SOLDIER,
          stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 9, luk: 4, def: 13, res: 2, mov: 5 }),
          spawnX: 75,
          spawnY: 55,
        },
        {
          id: 'rein_soldier_2',
          name: 'Reinforcement Guard',
          unitClass: UnitClass.SOLDIER,
          stats: createStats({ hp: 34, maxHp: 34, str: 13, mag: 0, skl: 11, spd: 9, luk: 4, def: 13, res: 2, mov: 5 }),
          spawnX: 85,
          spawnY: 55,
        },
      ],
      oneShot: true,
    },
    {
      groupId: 'throne_reinforce_2',
      spawnTurn: 10,
      faction: Faction.ENEMY,
      units: [
        {
          id: 'rein_cavalry_1',
          name: 'Reinforcement Lancer',
          unitClass: UnitClass.CAVALRY,
          stats: createStats({ hp: 36, maxHp: 36, str: 15, mag: 0, skl: 13, spd: 14, luk: 7, def: 11, res: 3, mov: 7 }),
          spawnX: 50,
          spawnY: 55,
        },
        {
          id: 'rein_cavalry_2',
          name: 'Reinforcement Lancer',
          unitClass: UnitClass.CAVALRY,
          stats: createStats({ hp: 36, maxHp: 36, str: 15, mag: 0, skl: 13, spd: 14, luk: 7, def: 11, res: 3, mov: 7 }),
          spawnX: 55,
          spawnY: 55,
        },
      ],
      oneShot: true,
    },
  ],
};

export const LEVELS: LevelDefinition[] = [
  LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, LEVEL_6,
  LEVEL_7, LEVEL_8, LEVEL_9, LEVEL_10, LEVEL_11, LEVEL_12, LEVEL_13,
];

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
