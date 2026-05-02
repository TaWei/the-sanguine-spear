# Phase 1: The Board (Foundation)

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Define the grid data structure, terrain system, and map bounds — all in pure logic with zero Phaser imports.

**Architecture:** `Grid` is a 2D array wrapper with terrain lookup and bounds checking. `Terrain` defines terrain types, movement costs, and combat modifiers. A `Cursor` tracks the currently highlighted grid position. Phaser rendering is NOT part of this phase — these are pure data structures with Vitest tests.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phase 0 (test infrastructure) complete.

---

### Task 1.1: Define Terrain Types and Terrain Data

**Objective:** Create the terrain type definitions and a lookup table for terrain properties (move cost, defense bonus, avoid bonus).

**Files:**
- Create: `src/game/map/Terrain.ts`
- Create: `src/game/map/__tests__/Terrain.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/map/__tests__/Terrain.test.ts
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
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/map/__tests__/Terrain.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

```typescript
// src/game/map/Terrain.ts
export type TerrainType = 'plains' | 'forest' | 'mountain' | 'water' | 'wall';

export interface TerrainData {
  type: TerrainType;
  moveCost: number;
  defenseBonus: number;
  avoidBonus: number;
}

export const TERRAIN_DEFS: Record<TerrainType, TerrainData> = {
  plains:    { type: 'plains',    moveCost: 1,  defenseBonus: 0, avoidBonus: 0 },
  forest:    { type: 'forest',    moveCost: 2,  defenseBonus: 1, avoidBonus: 20 },
  mountain:  { type: 'mountain',  moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  water:     { type: 'water',     moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  wall:      { type: 'wall',      moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
};
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/map/__tests__/Terrain.test.ts
```

Expected: 6 tests PASS.

**Step 5: Commit**

```bash
git add src/game/map/Terrain.ts src/game/map/__tests__/Terrain.test.ts
git commit -m "feat: add terrain type definitions with move costs and bonuses"
```

---

### Task 1.2: Create the Grid data structure

**Objective:** Build a 2D grid wrapper that stores terrain at each cell and provides bounds checking.

**Files:**
- Create: `src/game/map/Grid.ts`
- Create: `src/game/map/__tests__/Grid.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/map/__tests__/Grid.test.ts
import { describe, it, expect } from 'vitest';
import { Grid } from '../Grid';
import { TERRAIN_DEFS, TerrainType } from '../Terrain';

describe('Grid', () => {
  it('is created with the specified dimensions', () => {
    const grid = new Grid(10, 8);
    expect(grid.cols).toBe(10);
    expect(grid.rows).toBe(8);
  });

  it('defaults all tiles to plains', () => {
    const grid = new Grid(3, 3);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(grid.getTerrain(x, y)).toBe(TerrainType.PLAINS);
      }
    }
  });

  it('allows setting terrain at a specific tile', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 3, TerrainType.FOREST);
    expect(grid.getTerrain(2, 3)).toBe(TerrainType.FOREST);
  });

  it('returns true for in-bounds coordinates', () => {
    const grid = new Grid(4, 4);
    expect(grid.isInBounds(0, 0)).toBe(true);
    expect(grid.isInBounds(3, 3)).toBe(true);
  });

  it('returns false for out-of-bounds coordinates', () => {
    const grid = new Grid(4, 4);
    expect(grid.isInBounds(-1, 0)).toBe(false);
    expect(grid.isInBounds(0, -1)).toBe(false);
    expect(grid.isInBounds(4, 0)).toBe(false);
    expect(grid.isInBounds(0, 4)).toBe(false);
  });

  it('getTerrainData returns the full TerrainData object', () => {
    const grid = new Grid(3, 3);
    grid.setTerrain(1, 1, TerrainType.FOREST);
    const data = grid.getTerrainData(1, 1);
    expect(data).toEqual(TERRAIN_DEFS[TerrainType.FOREST]);
  });

  it('getTerrainData returns plains for out-of-bounds (safe fallback)', () => {
    const grid = new Grid(3, 3);
    const data = grid.getTerrainData(99, 99);
    expect(data).toEqual(TERRAIN_DEFS[TerrainType.PLAINS]);
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/map/__tests__/Grid.test.ts
```

Expected: FAIL — `Grid` not found.

**Step 3: Write minimal implementation**

```typescript
// src/game/map/Grid.ts
import { TERRAIN_DEFS, TerrainData, TerrainType } from './Terrain';

export class Grid {
  readonly cols: number;
  readonly rows: number;
  private tiles: TerrainType[][];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => TerrainType.PLAINS)
    );
  }

  setTerrain(x: number, y: number, type: TerrainType): void {
    if (this.isInBounds(x, y)) {
      this.tiles[y][x] = type;
    }
  }

  getTerrain(x: number, y: number): TerrainType {
    if (!this.isInBounds(x, y)) return TerrainType.PLAINS;
    return this.tiles[y][x];
  }

  getTerrainData(x: number, y: number): TerrainData {
    return TERRAIN_DEFS[this.getTerrain(x, y)];
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/map/__tests__/Grid.test.ts
```

Expected: 7 tests PASS.

**Step 5: Commit**

```bash
git add src/game/map/Grid.ts src/game/map/__tests__/Grid.test.ts
git commit -m "feat: add Grid data structure with terrain storage"
```

---

### Task 1.3: Create the Cursor

**Objective:** Track the currently highlighted grid position with clamp-to-bounds behavior.

**Files:**
- Create: `src/game/map/Cursor.ts`
- Create: `src/game/map/__tests__/Cursor.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/map/__tests__/Cursor.test.ts
import { describe, it, expect } from 'vitest';
import { Cursor } from '../Cursor';
import { Grid } from '../Grid';

describe('Cursor', () => {
  it('starts at (0, 0)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    expect(cursor.x).toBe(0);
    expect(cursor.y).toBe(0);
  });

  it('moves right within bounds', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(1, 0);
    expect(cursor.x).toBe(1);
    expect(cursor.y).toBe(0);
  });

  it('moves down within bounds', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(0, 1);
    expect(cursor.x).toBe(0);
    expect(cursor.y).toBe(1);
  });

  it('clamps x to left edge (0)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(-5, 0);
    expect(cursor.x).toBe(0);
  });

  it('clamps x to right edge (cols - 1)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(99, 0);
    expect(cursor.x).toBe(9);
  });

  it('clamps y to top edge (0)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(0, -5);
    expect(cursor.y).toBe(0);
  });

  it('clamps y to bottom edge (rows - 1)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(0, 99);
    expect(cursor.y).toBe(7);
  });

  it('setPosition clamps to bounds', () => {
    const grid = new Grid(5, 5);
    const cursor = new Cursor(grid);
    cursor.setPosition(-10, -10);
    expect(cursor.x).toBe(0);
    expect(cursor.y).toBe(0);
    cursor.setPosition(99, 99);
    expect(cursor.x).toBe(4);
    expect(cursor.y).toBe(4);
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/map/__tests__/Cursor.test.ts
```

Expected: FAIL — `Cursor` not found.

**Step 3: Write minimal implementation**

```typescript
// src/game/map/Cursor.ts
import { Grid } from './Grid';

export class Cursor {
  private _x: number = 0;
  private _y: number = 0;
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }

  move(dx: number, dy: number): void {
    this.setPosition(this._x + dx, this._y + dy);
  }

  setPosition(x: number, y: number): void {
    this._x = Math.max(0, Math.min(x, this.grid.cols - 1));
    this._y = Math.max(0, Math.min(y, this.grid.rows - 1));
  }
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/map/__tests__/Cursor.test.ts
```

Expected: 8 tests PASS.

**Step 5: Commit**

```bash
git add src/game/map/Cursor.ts src/game/map/__tests__/Cursor.test.ts
git commit -m "feat: add Cursor with grid-bound clamping"
```

---

### Task 1.4: Create map index barrel export

**Objective:** Provide a clean import path `from '../map'` for map module consumers.

**Files:**
- Create: `src/game/map/index.ts`

**Step 1: Write the barrel file**

```typescript
// src/game/map/index.ts
export { Grid } from './Grid';
export { Cursor } from './Cursor';
export { TERRAIN_DEFS } from './Terrain';
export type { TerrainType, TerrainData } from './Terrain';
```

**Step 2: Commit**

```bash
git add src/game/map/index.ts
git commit -m "chore: add map module barrel export"
```

---

## Verification Checklist

- [ ] `npx vitest run` passes all 21 tests (6 terrain + 7 grid + 8 cursor)
- [ ] No Phaser imports in any `src/game/` file
- [ ] Four commits on the branch

---

## Next Phase

Proceed to [Phase 2: Units and Movement](./02-units-and-movement.md).
