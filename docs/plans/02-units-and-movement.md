# Phase 2: Units and Movement (The Hardest Math)

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Define unit data, spawn units on the grid, and implement terrain-aware movement range calculation using Dijkstra's algorithm.

**Architecture:** `Unit` holds stats, faction, position, and acted state. `Grid` gains unit placement/removal methods. `MoveRange` uses Dijkstra to compute reachable tiles accounting for terrain move costs and blocking units. All pure logic — zero Phaser.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phase 1 complete.

---

### Task 2.1: Define Unit interfaces and a UnitStats class

**Objective:** Create the unit stat interfaces and a builder/validator for unit stats.

**Files:**
- Create: `src/game/units/Stats.ts`
- Create: `src/game/units/__tests__/Stats.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/units/__tests__/Stats.test.ts
import { describe, it, expect } from 'vitest';
import { UnitStats, createStats } from '../Stats';

describe('UnitStats', () => {
  it('creates stats from required values', () => {
    const stats = createStats({
      hp: 20, str: 8, mag: 2, skl: 7, spd: 8,
      luk: 6, def: 6, res: 2, mov: 5,
    });
    expect(stats.hp).toBe(20);
    expect(stats.maxHp).toBe(20);
    expect(stats.str).toBe(8);
    expect(stats.mov).toBe(5);
  });

  it('hp starts at maxHp when not specified', () => {
    const stats = createStats({
      hp: 20, str: 5, mag: 5, skl: 5, spd: 5,
      luk: 5, def: 5, res: 5, mov: 5,
    });
    expect(stats.hp).toBe(20);
    expect(stats.maxHp).toBe(20);
  });

  it('hp can differ from maxHp', () => {
    const stats = createStats({
      hp: 15, maxHp: 22, str: 5, mag: 5, skl: 5, spd: 5,
      luk: 5, def: 5, res: 5, mov: 5,
    });
    expect(stats.hp).toBe(15);
    expect(stats.maxHp).toBe(22);
  });

  it('clamps hp to maxHp', () => {
    const stats = createStats({
      hp: 999, maxHp: 30, str: 5, mag: 5, skl: 5, spd: 5,
      luk: 5, def: 5, res: 5, mov: 5,
    });
    expect(stats.hp).toBe(30);
  });

  it('clamps hp to 0 minimum', () => {
    const stats = createStats({
      hp: -5, str: 5, mag: 5, skl: 5, spd: 5,
      luk: 5, def: 5, res: 5, mov: 5,
    });
    expect(stats.hp).toBe(0);
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/units/__tests__/Stats.test.ts
```

Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
// src/game/units/Stats.ts
export interface UnitStats {
  hp: number;
  maxHp: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export interface UnitStatsInput {
  hp: number;
  maxHp?: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export function createStats(input: UnitStatsInput): UnitStats {
  const maxHp = input.maxHp ?? input.hp;
  return {
    hp: Math.max(0, Math.min(input.hp, maxHp)),
    maxHp,
    str: input.str,
    mag: input.mag,
    skl: input.skl,
    spd: input.spd,
    luk: input.luk,
    def: input.def,
    res: input.res,
    mov: input.mov,
  };
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/units/__tests__/Stats.test.ts
```

Expected: 5 tests PASS.

**Step 5: Commit**

```bash
git add src/game/units/Stats.ts src/game/units/__tests__/Stats.test.ts
git commit -m "feat: add UnitStats with hp clamping"
```

---

### Task 2.2: Define the Unit class

**Objective:** A Unit has a unique ID, faction, class, stats, grid position, and acted flag.

**Files:**
- Create: `src/game/units/Unit.ts`
- Create: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/units/__tests__/Unit.test.ts
import { describe, it, expect } from 'vitest';
import { Unit, Faction, UnitClass } from '../Unit';
import { createStats } from '../Stats';

describe('Unit', () => {
  const stats = createStats({
    hp: 22, str: 8, mag: 2, skl: 7, spd: 8,
    luk: 6, def: 6, res: 2, mov: 5,
  });

  it('has an id, name, faction, class, stats, and position', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.id).toBe('p1');
    expect(unit.name).toBe('Rowan');
    expect(unit.faction).toBe('player');
    expect(unit.unitClass).toBe('lord');
    expect(unit.gridX).toBe(2);
    expect(unit.gridY).toBe(5);
  });

  it('starts not acted', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.hasActed).toBe(false);
  });

  it('can be marked as acted', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);
  });

  it('can be reset (un-acted)', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.hasActed = true;
    unit.hasActed = false;
    expect(unit.hasActed).toBe(false);
  });

  it('can be moved to a new grid position', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.moveTo(4, 7);
    expect(unit.gridX).toBe(4);
    expect(unit.gridY).toBe(7);
  });

  it('exposes stats immutably via getter', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.stats.hp).toBe(22);
    expect(unit.stats.mov).toBe(5);
  });

  it('isAlive returns true when hp > 0', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.isAlive).toBe(true);
  });

  it('isAlive returns false when hp is 0', () => {
    const deadStats = createStats({ hp: 0, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, deadStats, 2, 5);
    expect(unit.isAlive).toBe(false);
  });

  it('isPlayer returns true for player faction', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.isPlayer).toBe(true);
  });

  it('isEnemy returns true for enemy faction', () => {
    const enemyStats = createStats({ hp: 20, str: 7, mag: 0, skl: 6, spd: 5, luk: 2, def: 7, res: 1, mov: 5 });
    const unit = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 12, 4);
    expect(unit.isEnemy).toBe(true);
    expect(unit.isPlayer).toBe(false);
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```

Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
// src/game/units/Unit.ts
import { UnitStats } from './Stats';

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

export type Faction = (typeof Faction)[keyof typeof Faction];
export type UnitClass = (typeof UnitClass)[keyof typeof UnitClass];

export class Unit {
  readonly id: string;
  readonly name: string;
  readonly faction: Faction;
  readonly unitClass: UnitClass;
  private _stats: UnitStats;
  private _hasActed: boolean = false;
  private _gridX: number;
  private _gridY: number;

  constructor(
    id: string,
    name: string,
    faction: Faction,
    unitClass: UnitClass,
    stats: UnitStats,
    gridX: number,
    gridY: number,
  ) {
    this.id = id;
    this.name = name;
    this.faction = faction;
    this.unitClass = unitClass;
    this._stats = stats;
    this._gridX = gridX;
    this._gridY = gridY;
  }

  get stats(): Readonly<UnitStats> { return this._stats; }
  get hasActed(): boolean { return this._hasActed; }
  set hasActed(v: boolean) { this._hasActed = v; }
  get gridX(): number { return this._gridX; }
  get gridY(): number { return this._gridY; }
  get isAlive(): boolean { return this._stats.hp > 0; }
  get isPlayer(): boolean { return this.faction === Faction.PLAYER; }
  get isEnemy(): boolean { return this.faction === Faction.ENEMY; }

  moveTo(x: number, y: number): void {
    this._gridX = x;
    this._gridY = y;
  }
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```

Expected: 10 tests PASS.

**Step 5: Commit**

```bash
git add src/game/units/Unit.ts src/game/units/__tests__/Unit.test.ts
git commit -m "feat: add Unit class with faction, stats, position, and acted state"
```

---

### Task 2.3: Add unit placement to Grid

**Objective:** Grid must track which unit occupies each tile.

**Files:**
- Modify: `src/game/map/Grid.ts`
- Modify: `src/game/map/__tests__/Grid.test.ts`

**Step 1: Write failing test**

Add to `src/game/map/__tests__/Grid.test.ts`:

```typescript
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

// ... inside the existing describe('Grid', ...) block, add:

it('can place and retrieve a unit', () => {
  const grid = new Grid(5, 5);
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
  grid.placeUnit(unit, 2, 2);
  expect(grid.getUnit(2, 2)).toBe(unit);
});

it('returns null for empty tiles', () => {
  const grid = new Grid(5, 5);
  expect(grid.getUnit(0, 0)).toBeNull();
});

it('removes a unit when placing null', () => {
  const grid = new Grid(5, 5);
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
  grid.placeUnit(unit, 2, 2);
  grid.removeUnit(2, 2);
  expect(grid.getUnit(2, 2)).toBeNull();
});

it('isOccupied returns true when a unit is present', () => {
  const grid = new Grid(5, 5);
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
  grid.placeUnit(unit, 2, 2);
  expect(grid.isOccupied(2, 2)).toBe(true);
  expect(grid.isOccupied(0, 0)).toBe(false);
});

it('isOccupied returns false for out-of-bounds', () => {
  const grid = new Grid(5, 5);
  expect(grid.isOccupied(-1, 0)).toBe(false);
});

it('getUnit returns null for out-of-bounds', () => {
  const grid = new Grid(5, 5);
  expect(grid.getUnit(99, 99)).toBeNull();
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/map/__tests__/Grid.test.ts
```

**Step 3: Modify Grid.ts**

Add to `Grid` class:

```typescript
import { Unit } from '../units/Unit';

// Add field:
private units: Map<string, Unit> = new Map();

// Add key helper:
private key(x: number, y: number): string { return `${x},${y}`; }

// Add methods:
placeUnit(unit: Unit, x: number, y: number): void {
  if (!this.isInBounds(x, y)) return;
  this.units.set(this.key(x, y), unit);
}

removeUnit(x: number, y: number): void {
  this.units.delete(this.key(x, y));
}

getUnit(x: number, y: number): Unit | null {
  if (!this.isInBounds(x, y)) return null;
  return this.units.get(this.key(x, y)) ?? null;
}

isOccupied(x: number, y: number): boolean {
  return this.getUnit(x, y) !== null;
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/map/__tests__/Grid.test.ts
```

Expected: 13 tests PASS (7 original + 6 new).

**Step 5: Commit**

```bash
git add src/game/map/Grid.ts src/game/map/__tests__/Grid.test.ts
git commit -m "feat: add unit placement/retrieval to Grid"
```

---

### Task 2.4: Implement Dijkstra-based MoveRange

**Objective:** Calculate all reachable tiles given a movement stat and a grid with terrain costs. This is the core movement algorithm in Fire Emblem — Dijkstra is used (not A*) because we need all reachable tiles, not a single path.

**Files:**
- Create: `src/game/movement/MoveRange.ts`
- Create: `src/game/movement/__tests__/MoveRange.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/movement/__tests__/MoveRange.test.ts
import { describe, it, expect } from 'vitest';
import { computeMoveRange } from '../MoveRange';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('MoveRange', () => {
  it('includes the starting tile (cost 0)', () => {
    const grid = new Grid(8, 8);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 3, 3);
    const range = computeMoveRange(unit, grid);
    expect(range.has('3,3')).toBe(true);
  });

  it('reaches tiles within movement range on plains', () => {
    const grid = new Grid(10, 10);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const range = computeMoveRange(unit, grid);
    // With mov=3 on all plains: all tiles within Manhattan distance 3
    expect(range.has('5,2')).toBe(true);  // up 3
    expect(range.has('5,8')).toBe(true);  // down 3
    expect(range.has('2,5')).toBe(true);  // left 3
    expect(range.has('8,5')).toBe(true);  // right 3
    // Should NOT reach Manhattan distance 4
    expect(range.has('5,1')).toBe(false);
    expect(range.has('9,5')).toBe(false);
  });

  it('respects terrain movement costs', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.FOREST); // costs 2
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 2 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 2);
    const range = computeMoveRange(unit, grid);
    // 0,2 → 1,2 (plains, cost 1) → 2,2 (forest, cost 2) = total 3 > 2, so unreachable
    expect(range.has('2,2')).toBe(false);
    // But 0,2 → 0,1 (plains, cost 1) → reachable
    expect(range.has('0,1')).toBe(true);
  });

  it('cannot move through impassable terrain', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(1, 2, TerrainType.MOUNTAIN); // cost 99
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 2);
    const range = computeMoveRange(unit, grid);
    expect(range.has('1,2')).toBe(false);
  });

  it('cannot move onto tiles occupied by other units', () => {
    const grid = new Grid(5, 5);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const blocker = new Unit('e1', 'Block', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);
    grid.placeUnit(blocker, 2, 2);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 1, 2);
    const range = computeMoveRange(unit, grid);
    expect(range.has('2,2')).toBe(false);
  });

  it('starting tile is always included even if occupied (it is the unit itself)', () => {
    const grid = new Grid(5, 5);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 3, 3);
    grid.placeUnit(unit, 3, 3);
    const range = computeMoveRange(unit, grid);
    expect(range.has('3,3')).toBe(true);
  });

  it('returns only coordinates within grid bounds', () => {
    const grid = new Grid(3, 3);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 99 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    const range = computeMoveRange(unit, grid);
    for (const key of range.keys()) {
      const [x, y] = key.split(',').map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(3);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(3);
    }
  });

  it('returns tile costs in the map values', () => {
    const grid = new Grid(5, 5);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const range = computeMoveRange(unit, grid);
    expect(range.get('2,2')).toBe(0); // start tile
    expect(range.get('2,3')).toBe(1); // adjacent plains
    expect(range.get('2,4')).toBe(2); // two steps on plains
  });
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/movement/__tests__/MoveRange.test.ts
```

**Step 3: Write Dijkstra implementation**

```typescript
// src/game/movement/MoveRange.ts
import { Grid } from '../map/Grid';
import { Unit } from '../units/Unit';

/**
 * Compute all reachable tiles and their movement costs using Dijkstra's algorithm.
 * Returns a Map of "x,y" → accumulated movement cost.
 * The starting tile is always included with cost 0.
 */
export function computeMoveRange(unit: Unit, grid: Grid): Map<string, number> {
  const maxMov = unit.stats.mov;
  const startX = unit.gridX;
  const startY = unit.gridY;
  const startKey = `${startX},${startY}`;

  // Priority queue: [cost, x, y], ordered by cost ascending
  const queue: [number, number, number][] = [[0, startX, startY]];
  const visited = new Map<string, number>();
  visited.set(startKey, 0);

  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  while (queue.length > 0) {
    // Extract the lowest-cost entry (simple linear scan for clarity)
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i][0] < queue[minIdx][0]) minIdx = i;
    }
    const [cost, x, y] = queue.splice(minIdx, 1)[0];

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (!grid.isInBounds(nx, ny)) continue;

      const terrainData = grid.getTerrainData(nx, ny);
      const terrainCost = terrainData.moveCost;

      // Impassable terrain
      if (terrainCost >= 99) continue;

      const newCost = cost + terrainCost;
      if (newCost > maxMov) continue;

      const key = `${nx},${ny}`;
      const prevCost = visited.get(key);
      if (prevCost !== undefined && prevCost <= newCost) continue;

      // Cannot move through enemy units (but can move through allies? — skip for now, block all)
      if (grid.isOccupied(nx, ny)) {
        // Allow the starting tile
        if (nx === startX && ny === startY) continue;
        // Block occupied tiles
        continue;
      }

      visited.set(key, newCost);
      queue.push([newCost, nx, ny]);
    }
  }

  return visited;
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/movement/__tests__/MoveRange.test.ts
```

Expected: 8 tests PASS.

**Step 5: Run full suite to check for regressions**

```bash
npx vitest run
```

**Step 6: Commit**

```bash
git add src/game/movement/MoveRange.ts src/game/movement/__tests__/MoveRange.test.ts
git commit -m "feat: implement Dijkstra-based movement range with terrain costs"
```

---

### Task 2.5: Create barrel exports for units and movement

**Objective:** Clean import paths.

**Files:**
- Create: `src/game/units/index.ts`
- Create: `src/game/movement/index.ts`

**Step 1: units/index.ts**

```typescript
export { Unit, Faction, UnitClass } from './Unit';
export type { Faction as FactionType, UnitClass as UnitClassType } from './Unit';
export { createStats } from './Stats';
export type { UnitStats, UnitStatsInput } from './Stats';
```

**Step 2: movement/index.ts**

```typescript
export { computeMoveRange } from './MoveRange';
```

**Step 3: Commit**

```bash
git add src/game/units/index.ts src/game/movement/index.ts
git commit -m "chore: add barrel exports for units and movement modules"
```

---

## Verification Checklist

- [ ] `npx vitest run` passes all tests (6 terrain + 13 grid + 5 stats + 10 unit + 8 moverange = 42 tests)
- [ ] Dijkstra correctly handles terrain costs, impassable tiles, occupied tiles
- [ ] No Phaser imports in any `src/game/` file
- [ ] Six commits on the branch

---

## Next Phase

Proceed to [Phase 3: The Game Loop](./03-game-loop.md).
