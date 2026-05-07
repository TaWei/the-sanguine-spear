# Level 3: The Sunken Temple — Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** A colossal water-themed level (100×100 tiles) with islands, shallows, bridges, and pirate enemies — the map is too large to fit on one screen, requiring camera scrolling.

**Architecture:** Four phases — (A) camera scrolling to support maps larger than the viewport, (B) new water terrain types, (C) the Level 3 definition, (D) tile culling for 10,000-tile performance. All game logic is pure TypeScript in `src/game/`; Phaser rendering stays in `src/scenes/`.

**Tech Stack:** TypeScript 5.4, Phaser 3.80, Vite 5.2, Vitest 4.1

---

## The Big Picture

```
Current:  16×12 grid = 192 tiles → all fit on 1024×768 viewport (768×576 grid area)
Level 3:  100×100 grid = 10,000 tiles → 4800×4800px grid vs 1024×768 viewport
          → grid is 4.7× wider and 6.25× taller than the screen
          → MUST have camera scrolling + tile culling
```

### Why Camera Scrolling Is a Prerequisite

The game currently creates all 192 tiles as Phaser rectangles positioned via `offsetX`/`offsetY` centering math, with no camera movement. For 100×100, three things must change:

1. **Camera** must be able to pan across the grid (drag-to-scroll or edge-scrolling)
2. **UI elements** (phase text, save/gold buttons, menus) must be pinned to camera viewport with `setScrollFactor(0)`
3. **Tile culling** — we can't create 10,000 interactive Phaser rectangles; only render tiles within ±2 tiles of the camera viewport

### Level 3 Design (The Sunken Temple)

```
Legend:
  ~ = SHALLOW_WATER (passable, moveCost=3)
  █ = DEEP_WATER (impassable except flying)
  = = BRIDGE (passable, moveCost=1)
  ◌ = REEF (passable, defense bonus)
  T = Temple tiles (FOREST with flavor)

Concept: A sprawling archipelago. The player starts on the NW island.
They fight through pirate-held islands connected by narrow bridges
and reef shallows, working toward the sunken temple in the SE corner
where the boss awaits.
```

---

## Phase A: Camera Scrolling System

**Why first:** Without camera scrolling, you can't play a 100×100 map. This is the blocker.

### Task A1: Add camera world bounds to BattleScene

**Objective:** Let the Phaser camera scroll across a grid larger than the viewport.

**Files:**
- Modify: `src/scenes/BattleScene.ts` (create method, ~line 95-135)

**Step 1: Set camera bounds in create()**

After `this.engine = new GameEngine(level.cols, level.rows)`, add:

```typescript
// Camera setup for large maps
const worldWidth = level.cols * TILE_SIZE;
const worldHeight = level.rows * TILE_SIZE;
this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

// If grid is larger than viewport, center camera on player spawn
if (worldWidth > this.cameras.main.width || worldHeight > this.cameras.main.height) {
  this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
}
```

**Step 2: Replace offset-based positioning with world-space positioning**

Change `this.offsetX` / `this.offsetY` — instead of centering offsets, tiles sit at their natural world coordinates `(x * TILE_SIZE, y * TILE_SIZE)`. The camera handles positioning.

For small maps (16×12 current), this still centers correctly because `setBounds` + no scrolling places the camera at 0,0 and tiles render at `(x*48, y*48)` which with the old offset formula is just math. We need to verify Level 1 still looks centered.

Actually, the better approach: keep offset centering for small maps (cols*TILE_SIZE ≤ camera width) and use world-bounds camera for large maps. This preserves backward compatibility with zero risk.

```typescript
const gridPixelW = level.cols * TILE_SIZE;
const gridPixelH = level.rows * TILE_SIZE;
const cameraW = this.cameras.main.width;
const cameraH = this.cameras.main.height;

if (gridPixelW <= cameraW && gridPixelH <= cameraH) {
  // Small map: center on screen (existing behavior)
  this.offsetX = (cameraW - gridPixelW) / 2;
  this.offsetY = (cameraH - gridPixelH) / 2;
  this.cameras.main.setBounds(0, 0, cameraW, cameraH);
} else {
  // Large map: world-space coordinates, camera scrolls
  this.offsetX = 0;
  this.offsetY = 0;
  this.cameras.main.setBounds(0, 0, gridPixelW, gridPixelH);
  // Center camera on player units
  this.centerCameraOnPlayers();
}
```

**Verification:**
- `npm run dev` → Level 1 renders identically to before
- Level 1 grid is still centered on screen
- Level 1 input (click-to-select, tile clicks) still works

### Task A2: Add drag-to-scroll camera control

**Objective:** Player can drag the map to scroll when the grid is larger than the viewport.

**Files:**
- Modify: `src/scenes/BattleScene.ts` (setupInput method, ~line 211)

**Implementation:**

Add drag-scroll handling in `setupInput()`. When the user drags on the background (not on a tile/unit), the camera follows the pointer.

```typescript
// In BattleScene class:
private isDragging = false;
private dragStartX = 0;
private dragStartY = 0;
private lastPointerX = 0;
private lastPointerY = 0;

// In setupInput(), add:
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  // ... existing tile click logic ...
  // If click is outside grid bounds → start potential drag
  if (!this.engine.grid.isInBounds(gx, gy)) {
    this.isDragging = true;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;
  }
});

this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
  if (this.isDragging && pointer.isDown) {
    const dx = this.lastPointerX - pointer.x;
    const dy = this.lastPointerY - pointer.y;
    this.cameras.main.scrollX += dx;
    this.cameras.main.scrollY += dy;
    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;
  }
  // ... existing pointermove logic ...
});

this.input.on('pointerup', () => {
  this.isDragging = false;
});
```

**Verification:**
- On Level 1 (small map): drag does nothing (no scroll needed)
- On a test 30×30 map: drag pans the camera, tiles scroll smoothly
- Click-to-select unit still works; drag doesn't fire unit selection

### Task A3: Fix all fixed-position UI elements

**Objective:** UI overlays (phase text, save/gold, menus, status window, etc.) must stay pinned to the viewport during camera scrolling.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step: Audit all text/container objects that should be fixed to camera**

These already use `setScrollFactor(0)`:
- Save button (line ~546)
- Gold text (line ~570)

These need `setScrollFactor(0)` added:
- Phase text (line ~573 area)
- All menu overlays (status, items, weapons, trade, save, shop)
- Battle overlay
- Level-up / promotion sequences
- Exp popup

For each, add `.setScrollFactor(0)` after creation. Also, position them relative to `this.cameras.main.scrollX + this.cameras.main.width` instead of just `this.cameras.main.width` — but wait, `setScrollFactor(0)` means they stay at their canvas coordinates regardless of camera scroll, so `this.cameras.main.width` is correct.

**Verification:**
- Scroll camera far right → Phase text, Save button, Gold text stay visible in top-right
- Open status menu → overlay is centered on screen, not at world center
- All overlays work at scrolled positions

---

## Phase B: Water-Themed Terrain Types

### Task B1: Add new terrain type constants

**Objective:** Define `SHALLOW_WATER`, `DEEP_WATER`, `BRIDGE`, `REEF` terrain types.

**Files:**
- Modify: `src/constants.ts` (TerrainType object, ~line 25-31)
- Modify: `src/game/map/Terrain.ts`

**Step 1: Add to `src/game/map/Terrain.ts`** (the canonical definition):

```typescript
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

export type TerrainType = (typeof TerrainType)[keyof typeof TerrainType];
```

**Step 2: Add terrain definitions to `TERRAIN_DEFS`:**

```typescript
shallow_water: { type: 'shallow_water', moveCost: 3, defenseBonus: -1, avoidBonus: -10 },
deep_water:   { type: 'deep_water',   moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
bridge:       { type: 'bridge',       moveCost: 1, defenseBonus: 0, avoidBonus: 0 },
reef:         { type: 'reef',         moveCost: 2, defenseBonus: 2, avoidBonus: 15 },
```

**Step 3: Also update `src/constants.ts` TerrainType** (keep the two in sync until the duplicate is removed):

```typescript
export const TerrainType = {
  // ... existing ...
  SHALLOW_WATER: 'shallow_water',
  DEEP_WATER: 'deep_water',
  BRIDGE: 'bridge',
  REEF: 'reef',
} as const;
```

**Verification:**
- `npx vitest run` — existing terrain tests pass
- New terrain types are accessible via `TerrainType.SHALLOW_WATER`
- `TERRAIN_DEFS.shallow_water.moveCost === 3`

### Task B2: Add terrain colors and rendering

**Objective:** New terrain types render with distinct colors.

**Files:**
- Modify: `src/scenes/BattleScene.ts` (TERRAIN_COLORS map, ~line 25-33)

**Add color entries:**

```typescript
const TERRAIN_COLORS: Record<string, number> = {
  // ... existing ...
  shallow_water: 0x5dade2,  // light blue
  deep_water:    0x1b4f72,  // dark navy
  bridge:        0x8b4513,  // saddle brown (wooden planks)
  reef:          0x2ecc71,  // coral green
};
```

**Verification:**
- Create a small test map with new terrain types → colors render correctly
- `npm run dev` → visually confirm new colors

### Task B3: Update flying unit movement for water

**Objective:** Flying units (PEGASUS_KNIGHT, FALCON_KNIGHT) can cross DEEP_WATER (moveCost 99 for ground units, 1 for flying).

**Files:**
- Modify: `src/game/units/Unit.ts` (isFlying getter, ~line 129-131)

**Update `isFlying`:**

```typescript
get isFlying(): boolean {
  return this.unitClass === UnitClass.PEGASUS_KNIGHT
      || this.unitClass === UnitClass.FALCON_KNIGHT;
}
```

**Check:** `src/game/movement/` already has `getTerrainMoveCost(unit, terrain)` that checks `unit.isFlying` for CLIFF (moveCost 4→1). DEEP_WATER should follow the same pattern. Verify the movement system handles this.

**If not, update `getTerrainMoveCost` or the move range computation to check `unit.isFlying` for any terrain with moveCost=99.**

**Verification:**
- Pegasus knight can cross deep water tiles (moveCost 1)
- Ground unit cannot cross deep water (moveCost 99 → out of range)
- `npx vitest run src/game/movement/`

---

## Phase C: Level 3 — The Sunken Temple

### Task C1: Define LEVEL_3 data

**Objective:** Create the 100×100 Level 3 definition in `LevelData.ts`.

**Files:**
- Modify: `src/game/levels/LevelData.ts`

**Level design (textual map sketch):**

```
100×100 grid — "The Sunken Temple"

Terrain breakdown:
  - DEEP_WATER:    ~65% (ocean fill, the default)
  - SHALLOW_WATER: ~15% (coastlines, shallows between islands)
  - PLAINS:        ~10% (island interiors)
  - FOREST:        ~5%  (overgrown temple ruins)
  - BRIDGE:        ~2%  (wooden bridges connecting islands)
  - REEF:          ~1%  (scattered coral reefs)
  - MOUNTAIN:      ~1%  (rocky outcroppings on islands)
  - WALL:          ~1%  (temple walls in the SE quadrant)

Island layout (approximate):
  - NW (x:5-25, y:5-20): Starting island — player spawn zone
  - NC (x:40-55, y:30-45): Pirate camp island — first objective
  - NE (x:70-85, y:10-25): Abandoned watchtower — archer nest
  - C  (x:35-60, y:55-75): Central trade island — neutral
  - SW (x:10-25, y:60-80): Forgotten shrine — hidden treasure
  - SC (x:40-55, y:85-98): Sunken Temple entrance — boss fight
  - SE (x:70-90, y:65-90): Sunken Temple interior — final objective

Bridges connect:
  - NW → NC: x:30-35, y:25 (bridge)
  - NC → C:  x:48-52, y:45-55 (bridge)
  - C → SE:  x:60-65, y:75-85 (bridge)
  - C → SW:  x:30-35, y:65-75 (bridge)
```

**Implementation approach:** Use procedural generation in the LevelData IIFE to avoid hand-writing 10,000 tile entries. Define islands as rectangular regions with border shallows, inland plains, and scattered forests.

```typescript
export const LEVEL_3: LevelDefinition = {
  id: 'level-3',
  name: 'The Sunken Temple',
  cols: 100,
  rows: 100,
  terrain: (() => {
    const t: { x: number; y: number; type: TerrainType }[] = [];

    // Helper: fill a rect with a terrain type
    const fillRect = (
      x1: number, y1: number, x2: number, y2: number,
      type: TerrainType
    ) => {
      for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
          t.push({ x, y, type });
    };

    // Helper: fill a rect border (1-tile thick) with a type
    const borderRect = (
      x1: number, y1: number, x2: number, y2: number,
      type: TerrainType
    ) => {
      for (let x = x1; x <= x2; x++) {
        t.push({ x, y: y1, type });
        t.push({ x, y: y2, type });
      }
      for (let y = y1 + 1; y < y2; y++) {
        t.push({ x: x1, y, type });
        t.push({ x: x2, y, type });
      }
    };

    // 1. Default: DEEP_WATER everywhere (we'll subtract islands)
    // For efficiency, only push islands — the grid defaults to PLAINS,
    // so fill ocean first. But since new Grid() defaults to PLAINS,
    // we must explicitly fill the ocean.
    fillRect(0, 0, 99, 99, TerrainType.DEEP_WATER);

    // 2. Define islands (overwrite DEEP_WATER with island terrain)
    const makeIsland = (
      x: number, y: number, w: number, h: number,
      name: string
    ) => {
      // Shallow water border (2-tile)
      fillRect(x - 2, y - 2, x + w + 1, y + h + 1, TerrainType.SHALLOW_WATER);
      // Interior plains
      fillRect(x, y, x + w - 1, y + h - 1, TerrainType.PLAINS);
      // Scattered forests
      for (let iy = y; iy < y + h; iy++)
        for (let ix = x; ix < x + w; ix++)
          if ((ix + iy * 3) % 7 < 2)
            t.push({ x: ix, y: iy, type: TerrainType.FOREST });
      // Mountain corners
      t.push({ x, y, type: TerrainType.MOUNTAIN });
      t.push({ x: x + w - 1, y: y + h - 1, type: TerrainType.MOUNTAIN });
    };

    makeIsland(5, 5, 20, 15, 'Starting Isle');        // NW
    makeIsland(40, 30, 15, 15, 'Pirate Camp');        // NC
    makeIsland(70, 10, 15, 15, 'Watchtower');         // NE
    makeIsland(35, 55, 25, 20, 'Central Trade Isle'); // C
    makeIsland(10, 60, 15, 20, 'Forgotten Shrine');   // SW
    makeIsland(40, 85, 15, 13, 'Temple Approach');    // SC
    makeIsland(70, 65, 20, 25, 'Temple Interior');    // SE

    // 3. Bridges (overwrite shallow water with bridge)
    // NW → NC bridge
    for (let x = 30; x <= 35; x++) t.push({ x, y: 25, type: TerrainType.BRIDGE });
    // NC → C bridge  
    for (let y = 45; y <= 55; y++) t.push({ x: 50, y, type: TerrainType.BRIDGE });
    // C → SE bridge
    for (let x = 60; x <= 65; x++) t.push({ x, y: 75, type: TerrainType.BRIDGE });
    // C → SW bridge
    for (let x = 30; x <= 35; x++) t.push({ x, y: 65, type: TerrainType.BRIDGE });

    // 4. Scattered reefs
    const reefSpots = [[15, 35], [55, 20], [80, 45], [25, 50], [60, 50], [90, 35]];
    for (const [rx, ry] of reefSpots) {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          t.push({ x: rx + dx, y: ry + dy, type: TerrainType.REEF });
    }

    // 5. Temple interior walls (SE island — walled corridors)
    const templeWalls = [
      // Horizontal corridors
      ...Array.from({ length: 10 }, (_, i) => [
        { x: 75 + i, y: 72, type: TerrainType.WALL },
        { x: 75 + i, y: 80, type: TerrainType.WALL },
      ]).flat(),
      // Vertical corridors
      ...Array.from({ length: 7 }, (_, i) => [
        { x: 75, y: 73 + i, type: TerrainType.WALL },
        { x: 84, y: 73 + i, type: TerrainType.WALL },
      ]).flat(),
    ];
    t.push(...templeWalls);

    return t;
  })(),
  units: [
    // --- Player units (spawn on NW Starting Isle) ---
    {
      id: 'p1', name: 'Rowan', faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 28, maxHp: 28, str: 10, mag: 3, skl: 9, spd: 10, luk: 8, def: 8, res: 4, mov: 5 }),
      x: 8, y: 8,
    },
    {
      id: 'p2', name: 'Elara', faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 20, maxHp: 20, str: 1, mag: 12, skl: 8, spd: 9, luk: 7, def: 4, res: 9, mov: 5 }),
      x: 7, y: 10,
    },
    {
      id: 'p3', name: 'Sylvie', faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 22, maxHp: 22, str: 8, mag: 3, skl: 9, spd: 12, luk: 7, def: 5, res: 6, mov: 7 }),
      x: 10, y: 9,
    },
    {
      id: 'p4', name: 'Gareth', faction: Faction.PLAYER,
      unitClass: UnitClass.MERCENARY,
      stats: createStats({ hp: 26, maxHp: 26, str: 10, mag: 0, skl: 9, spd: 9, luk: 5, def: 7, res: 2, mov: 5 }),
      x: 9, y: 11,
    },
    {
      id: 'p5', name: 'Lyra', faction: Faction.PLAYER,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 21, maxHp: 21, str: 8, mag: 0, skl: 10, spd: 9, luk: 6, def: 5, res: 3, mov: 5 }),
      x: 6, y: 9,
    },

    // --- Enemy units ---
    // Pirate Camp (NC island)
    {
      id: 'e1', name: 'Pirate Boss', faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 32, maxHp: 32, str: 12, mag: 0, skl: 7, spd: 8, luk: 4, def: 7, res: 2, mov: 5 }),
      x: 45, y: 35,
      aiBehavior: AiBehavior.PURSUE, aiPersonality: AiPersonality.AGGRESSIVE,
    },
    {
      id: 'e2', name: 'Pirate Axeman', faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 28, maxHp: 28, str: 10, mag: 0, skl: 5, spd: 6, luk: 3, def: 6, res: 1, mov: 5 }),
      x: 42, y: 37,
      aiBehavior: AiBehavior.PURSUE, aiPersonality: AiPersonality.BALANCED,
    },
    {
      id: 'e3', name: 'Pirate Swabby', faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 24, maxHp: 24, str: 8, mag: 0, skl: 6, spd: 5, luk: 2, def: 7, res: 1, mov: 5 }),
      x: 48, y: 34,
      aiBehavior: AiBehavior.PURSUE,
    },

    // Watchtower (NE island) — archer nest
    {
      id: 'e4', name: 'Watchtower Sniper', faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 22, maxHp: 22, str: 9, mag: 0, skl: 11, spd: 9, luk: 5, def: 5, res: 3, mov: 5 }),
      x: 77, y: 17,
      aiBehavior: AiBehavior.ATTACK_IN_RANGE, aiPersonality: AiPersonality.CAUTIOUS,
    },
    {
      id: 'e5', name: 'Watchtower Guard', faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 26, maxHp: 26, str: 8, mag: 0, skl: 7, spd: 6, luk: 3, def: 8, res: 2, mov: 5 }),
      x: 75, y: 15,
      aiBehavior: AiBehavior.GUARD,
    },

    // Central trade isle — neutral pirates
    {
      id: 'e6', name: 'Smuggler', faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 25, maxHp: 25, str: 9, mag: 0, skl: 6, spd: 7, luk: 4, def: 6, res: 2, mov: 5 }),
      x: 45, y: 60,
      aiBehavior: AiBehavior.PURSUE, aiPersonality: AiPersonality.BALANCED,
    },
    {
      id: 'e7', name: 'Smuggler Mage', faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 20, maxHp: 20, str: 1, mag: 10, skl: 7, spd: 7, luk: 4, def: 3, res: 7, mov: 5 }),
      x: 50, y: 62,
      aiBehavior: AiBehavior.PURSUE, aiPersonality: AiPersonality.CAUTIOUS,
    },
    {
      id: 'e8', name: 'Smuggler', faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 27, maxHp: 27, str: 10, mag: 0, skl: 5, spd: 6, luk: 3, def: 5, res: 1, mov: 5 }),
      x: 48, y: 65,
      aiBehavior: AiBehavior.PURSUE,
    },

    // Temple Entrance (SC island)
    {
      id: 'e9', name: 'Temple Guardian', faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 30, maxHp: 30, str: 11, mag: 0, skl: 8, spd: 7, luk: 4, def: 10, res: 3, mov: 5 }),
      x: 47, y: 88,
      aiBehavior: AiBehavior.BOSS_GUARD, aiPersonality: AiPersonality.AGGRESSIVE,
    },
    {
      id: 'e10', name: 'Temple Guard', faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 28, maxHp: 28, str: 10, mag: 0, skl: 7, spd: 6, luk: 3, def: 9, res: 2, mov: 5 }),
      x: 49, y: 90,
      aiBehavior: AiBehavior.BOSS_GUARD,
    },

    // Temple Interior (SE island) — boss fight
    {
      id: 'boss', name: 'Coral Bishop', faction: Faction.ENEMY,
      unitClass: UnitClass.SAGE,
      stats: createStats({ hp: 35, maxHp: 35, str: 3, mag: 16, skl: 12, spd: 10, luk: 8, def: 7, res: 14, mov: 5 }),
      x: 80, y: 75,
      aiBehavior: AiBehavior.BOSS_GUARD, aiPersonality: AiPersonality.AGGRESSIVE,
    },
    {
      id: 'e11', name: 'Cultist', faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 22, maxHp: 22, str: 1, mag: 11, skl: 8, spd: 8, luk: 5, def: 4, res: 9, mov: 5 }),
      x: 78, y: 78,
      aiBehavior: AiBehavior.PURSUE, aiPersonality: AiPersonality.CAUTIOUS,
    },
    {
      id: 'e12', name: 'Cultist', faction: Faction.ENEMY,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 22, maxHp: 22, str: 1, mag: 11, skl: 8, spd: 8, luk: 5, def: 4, res: 9, mov: 5 }),
      x: 82, y: 78,
      aiBehavior: AiBehavior.PURSUE, aiPersonality: AiPersonality.CAUTIOUS,
    },

    // Patrolling enemies in shallows
    {
      id: 'e13', name: 'Reef Raider', faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 26, maxHp: 26, str: 9, mag: 0, skl: 5, spd: 7, luk: 3, def: 5, res: 1, mov: 5 }),
      x: 20, y: 40,
      aiBehavior: AiBehavior.THIEF, aiPersonality: AiPersonality.BALANCED,
    },
    {
      id: 'e14', name: 'Reef Raider', faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 26, maxHp: 26, str: 9, mag: 0, skl: 5, spd: 7, luk: 3, def: 5, res: 1, mov: 5 }),
      x: 65, y: 30,
      aiBehavior: AiBehavior.PURSUE, aiPersonality: AiPersonality.BERSERKER,
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
  startingGold: 3000,
};
```

**Step: Register LEVEL_3 in the exported arrays:**

```typescript
export const LEVELS: LevelDefinition[] = [LEVEL_1, LEVEL_2, LEVEL_3];
```

**Verification:**
- `npx vitest run src/game/levels/` — level loads with correct dimensions
- Level 3 has 100 cols × 100 rows
- Unit placements resolve to valid coordinates within bounds
- Terrain generation produces expected counts (deep_water ≈ 6500, shallow_water ≈ 1500, etc.)

### Task C2: Add Level 3 progression wiring

**Objective:** After completing Level 2, the player can advance to Level 3.

**Files:**
- Already handled by `getNextLevelId()` in `LevelData.ts` which iterates `LEVELS` array — just adding LEVEL_3 to the array is sufficient.

**Verification:**
- After Level 2 victory, `getNextLevelId('level-2')` returns `'level-3'`
- BattleScene transitions to Level 3 normally

---

## Phase D: Tile Culling (Performance)

### Task D1: Implement viewport-culled tile rendering

**Objective:** Only create and maintain Phaser rectangles for tiles visible within the camera viewport (± margin). When the camera scrolls, recycle tile rectangles for newly-visible tiles.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Approach:** Instead of creating all 192 (or 10,000) tiles at startup, create tiles on-demand for the visible area. Use a `Map<string, Phaser.GameObjects.Rectangle>` keyed by "x,y". On each camera scroll, compute the visible tile range, create rects for new tiles, destroy rects for tiles that scrolled out of view.

```typescript
// Replace tileRects: Rectangle[][] with:
private tileSpriteMap = new Map<string, Phaser.GameObjects.Rectangle>();
private readonly TILE_CULL_MARGIN = 2; // extra tiles beyond viewport edge

private createGridVisuals(): void {
  // Initial creation happens in updateVisibleTiles()
  this.updateVisibleTiles();
}

private updateVisibleTiles(): void {
  const cam = this.cameras.main;
  const margin = this.TILE_CULL_MARGIN;
  const tilePx = TILE_SIZE;

  const startCol = Math.max(0, Math.floor(cam.scrollX / tilePx) - margin);
  const endCol = Math.min(this.engine.grid.cols - 1,
    Math.ceil((cam.scrollX + cam.width) / tilePx) + margin);
  const startRow = Math.max(0, Math.floor(cam.scrollY / tilePx) - margin);
  const endRow = Math.min(this.engine.grid.rows - 1,
    Math.ceil((cam.scrollY + cam.height) / tilePx) + margin);

  const visible = new Set<string>();
  for (let y = startRow; y <= endRow; y++) {
    for (let x = startCol; x <= endCol; x++) {
      const key = `${x},${y}`;
      visible.add(key);
      if (!this.tileSpriteMap.has(key)) {
        const px = this.offsetX + x * tilePx;
        const py = this.offsetY + y * tilePx;
        const rect = this.add.rectangle(
          px + tilePx / 2, py + tilePx / 2,
          tilePx - 2, tilePx - 2,
          TERRAIN_COLORS.plains,
        );
        rect.setStrokeStyle(1, 0x1a1a2e);
        rect.setInteractive({ useHandCursor: true });
        const terrain = this.engine.grid.getTerrain(x, y);
        rect.setFillStyle(TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.plains);
        this.tileSpriteMap.set(key, rect);
      }
    }
  }

  // Remove tiles that scrolled out of view
  for (const [key, rect] of this.tileSpriteMap) {
    if (!visible.has(key)) {
      rect.destroy();
      this.tileSpriteMap.delete(key);
    }
  }
}

// Call updateVisibleTiles() when camera scrolls:
// In setupInput()'s drag handler or via camera scroll event:
this.cameras.main.on('scroll', () => this.updateVisibleTiles());
```

**Note:** Only enable tile culling when `gridPixelW > cameraW || gridPixelH > cameraH` (large maps). For small maps (Level 1, 2), keep the current `tileRects[][]` approach for backward compatibility.

**Performance verification:**
- Level 1 (16×12): all 192 tiles created at startup (no culling, no change)
- Level 3 (100×100): ~400-500 tiles created (viewport covers ~21×16 = 336 tiles + margin), instead of 10,000
- Scroll around Level 3: tiles appear/disappear smoothly, no memory leak
- `npm run build` succeeds

---

## Verification Checklist (Full Level 3)

- [ ] `npx vitest run` — all 250+ tests pass
- [ ] Level 3 loads from main menu (add level select button OR auto-advance from Level 2)
- [ ] Camera scrolls via drag across the 100×100 ocean
- [ ] Tiles render correctly: deep water (dark navy), shallow water (light blue), bridges (brown), islands (green), reefs (coral)
- [ ] Player units spawn on NW island
- [ ] Unit selection and movement works at scrolled camera positions
- [ ] Enemy AI pathfinds across islands and bridges (does not path through deep water except for flying units)
- [ ] Pegasus knight (Sylvie) can fly over deep water
- [ ] Ground units cannot enter deep water tiles
- [ ] Bridge tiles allow movement between islands
- [ ] All UI overlays stay pinned during camera scroll
- [ ] Boss encounter cutscene fires when player approaches Coral Bishop
- [ ] Victory triggers on boss kill
- [ ] Level 1 and Level 2 still play identically to before (no regression)
- [ ] `npm run build` produces a working bundle

---

## Design Decisions

1. **Dual-mode tile rendering:** Small maps (≤ viewport) use the original `tileRects[][]` approach for simplicity. Large maps use dynamic tile culling. This is pragmatic — avoids breaking existing functionality while enabling the 100×100 scale.

2. **No new unit classes for Level 3:** The existing `BRIGAND`, `SOLDIER`, `MAGE`, `ARCHER`, `SAGE`, `MERCENARY`, `PEGASUS_KNIGHT` classes suffice for pirates/smugglers/cultists. A dedicated "Pirate" class could be added later as aesthetic flavor but isn't needed for gameplay.

3. **Procedural terrain generation** in LevelData: Writing 10,000 tile entries by hand is unreasonable. Helper functions (`fillRect`, `makeIsland`) within the IIFE generate the level data programmatically while keeping the definition self-contained in one file.

4. **Camera drag rather than edge-scrolling:** Drag-to-pan is simpler to implement and works better on both desktop and mobile. Edge-scrolling can be added later.

5. **Default terrain is DEEP_WATER:** The 100×100 level first fills everything with DEEP_WATER, then overwrites with islands/shallows/bridges. This ensures there are no gaps.

6. **Deep water is FLYING_UNITS_ONLY:** Unlike the existing `WATER` type (moveCost 99 for everyone), DEEP_WATER allows flying units (Pegasus/Falcon Knights) to cross at moveCost 1. This creates strategic value for the flier on a water map.

---

## Common Pitfalls

1. **Forgetting to update `syncTileColors` and `syncUnitSprites`:** These methods iterate `this.engine.grid.rows × this.engine.grid.cols`. For a 100×100 map, `syncTileColors` would iterate 10,000 times even with culling. These must also be updated to only iterate visible tiles on large maps.

2. **Input coordinates:** In the current code, `pointer.x` and `pointer.y` are already in camera space. Setting camera bounds and scrolling should work transparently for input — Phaser transforms pointer coordinates to world space automatically. Verify this.

3. **Unit sprites outside viewport:** `syncUnitSprites()` creates sprites for all units. On a 100×100 map with enemies spread across the map, this is fine (only ~30 units total). But verify that off-screen sprites don't affect performance — Phaser's camera culls them automatically.

4. **AI pathfinding on 100×100 grid:** Dijkstra's algorithm runs on every enemy turn. 100×100 = 10,000 nodes. The existing `computeMoveRange` uses BFS/Dijkstra which is O(V log V). With move range of 5, only ~60 tiles are explored per unit — this should be fine. But verify with a perf test.

5. **Grid.clear() in loadLevel:** When loading a new level with different dimensions, `loadLevel()` re-creates the Grid. Verify this works correctly when switching from 16×12 → 100×100.
