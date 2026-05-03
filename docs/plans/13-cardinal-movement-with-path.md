# Phase 13: Cardinal Movement with Path Visualization

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task. All logic is pure — zero Phaser imports in `src/game/`.

**Goal:** Replace the current "teleport" movement with true Fire Emblem-style cardinal (N/S/E/W) pathing. When a player selects a unit and hovers over a tile in their move range, the exact path to that tile is computed and previewed as an arrow trail. When the player clicks to confirm, the unit steps through each tile along that path. The path must respect terrain costs and occupied tiles, and must be reconstructible for any reachable destination.

**Why this matters:** The current `computeMoveRange` only tells us *which* tiles are reachable, not *how* to get there. The sprite teleports via tween. This phase adds path reconstruction and stepwise movement — the heart of FE tactical feel.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phases 0–12 complete (Grid, Unit, MoveRange, TurnManager, BattleScene all exist).

---

## Architecture Overview

### New Components

```
src/game/
  movement/
    Pathfinder.ts       # Dijkstra with predecessor tracking → path reconstruction
    Pathfinder.test.ts  # Path shape, terrain cost, obstacles, cardinal-only
  map/
    Grid.ts             # Add getNeighbors(x,y) for cardinal neighbor iteration
src/scenes/
  BattleScene.ts        # Preview path overlay + stepwise unit animation
```

### How It Works

1. **Path computation** — `findPath(unit, grid, destX, destY)` runs Dijkstra identical to `computeMoveRange`, but stores a `predecessor` map for every visited tile. After the search, backtrack from the destination to the start using predecessors to build the path array.
2. **Cardinal-only** — Only four directions (`[0,-1]`, `[0,1]`, `[-1,0]`, `[1,0]`) are ever explored. This is already true in `computeMoveRange`, but we explicitly test and enforce it.
3. **Preview** — `BattleScene` draws a dotted arrow or line on top of the hovered tile showing the path from the selected unit to the cursor.
4. **Step movement** — When the player clicks a destination, instead of a single tween, the unit tweens from tile to tile along the path with a brief pause at each step.
5. **Undo** — `undoMove` already stores `preMovePosition`. No change needed.

---

## Task 13.1: Add `getNeighbors(x, y)` to Grid

**Objective:** Provide a clean API for iterating cardinal neighbors that filters out-of-bounds automatically.

**Files:**
- Modify: `src/game/map/Grid.ts`
- Modify: `src/game/map/__tests__/Grid.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/map/__tests__/Grid.test.ts
it('getNeighbors returns only in-bounds cardinal neighbors', () => {
  const grid = new Grid(5, 5);
  const neighbors = grid.getNeighbors(0, 0);
  const keys = neighbors.map((n) => `${n.x},${n.y}`);
  expect(keys).toContain('1,0');
  expect(keys).toContain('0,1');
  expect(keys).not.toContain('-1,0');
  expect(keys).not.toContain('0,-1');
  expect(keys).toHaveLength(2);
});

it('getNeighbors returns 4 neighbors for interior tiles', () => {
  const grid = new Grid(5, 5);
  const neighbors = grid.getNeighbors(2, 2);
  expect(neighbors).toHaveLength(4);
});
```

**Step 2: Run test to verify RED**

```bash
npx vitest run src/game/map/__tests__/Grid.test.ts
```

Expected: FAIL — `getNeighbors` does not exist.

**Step 3: Write minimal implementation**

```typescript
// src/game/map/Grid.ts
export interface GridNeighbor {
  x: number;
  y: number;
}

// Add to Grid class:
getNeighbors(x: number, y: number): GridNeighbor[] {
  const result: GridNeighbor[] = [];
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];
  for (const { dx, dy } of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (this.isInBounds(nx, ny)) {
      result.push({ x: nx, y: ny });
    }
  }
  return result;
}
```

**Step 4: Run test to verify GREEN**

```bash
npx vitest run src/game/map/__tests__/Grid.test.ts
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/game/map/Grid.ts src/game/map/__tests__/Grid.test.ts
git commit -m "feat: add Grid.getNeighbors for cardinal neighbor iteration"
```

---

## Task 13.2: Implement Pathfinder with predecessor tracking

**Objective:** Build a `findPath` function that returns the exact sequence of tiles from unit start to destination, respecting terrain costs, occupied tiles, and movement stat. Cardinal directions only.

**Files:**
- Create: `src/game/movement/Pathfinder.ts`
- Create: `src/game/movement/__tests__/Pathfinder.test.ts`

**Design:**
- `findPath(unit, grid, destX, destY)` returns `GridNeighbor[] | null`
- `null` means the destination is unreachable
- The returned array includes the destination but NOT the start tile (the unit is already there)
- Uses Dijkstra with a `Map<string, string>` predecessor map: `"x,y" → "prevX,prevY"`
- After search, backtrack from `"destX,destY"` to `"startX,startY"` via predecessors, reverse to get forward path

**Step 1: Write failing test**

```typescript
// src/game/movement/__tests__/Pathfinder.test.ts
import { describe, it, expect } from 'vitest';
import { findPath } from '../Pathfinder';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('findPath', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('returns null when destination is the start tile', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 2, 2);
    expect(path).toBeNull();
  });

  it('finds a straight horizontal path', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 4, 2);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
    expect(path![0]).toEqual({ x: 3, y: 2 });
    expect(path![1]).toEqual({ x: 4, y: 2 });
  });

  it('finds a straight vertical path', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 2, 0);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
    expect(path![0]).toEqual({ x: 2, y: 1 });
    expect(path![1]).toEqual({ x: 2, y: 0 });
  });

  it('finds a path around an obstacle', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 3, TerrainType.MOUNTAIN); // impassable wall at x=2, y=3
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 2, 4);
    // Must go around: (2,2) → (3,2) → (3,3) → (3,4) → (2,4) OR similar
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(2);
    // The destination must be the last tile
    const last = path![path!.length - 1];
    expect(last.x).toBe(2);
    expect(last.y).toBe(4);
  });

  it('returns null when destination is out of move range', () => {
    const grid = new Grid(10, 10);
    const shortStats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 2 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, shortStats, 5, 5);
    const path = findPath(unit, grid, 8, 5); // distance 3 > mov 2
    expect(path).toBeNull();
  });

  it('returns null when destination is occupied by another unit', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const blocker = new Unit('e1', 'Block', Faction.ENEMY, UnitClass.BRIGAND, stats, 3, 2);
    grid.placeUnit(blocker, 3, 2);
    const path = findPath(unit, grid, 3, 2);
    expect(path).toBeNull();
  });

  it('path is purely cardinal (no diagonal steps)', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const path = findPath(unit, grid, 2, 2);
    expect(path).not.toBeNull();
    let prevX = 0;
    let prevY = 0;
    for (const step of path!) {
      const dx = Math.abs(step.x - prevX);
      const dy = Math.abs(step.y - prevY);
      expect(dx + dy).toBe(1); // exactly one cardinal step
      prevX = step.x;
      prevY = step.y;
    }
  });

  it('prefers lower-cost terrain when multiple paths exist', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(1, 2, TerrainType.FOREST); // cost 2
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const path = findPath(unit, grid, 0, 2);
    // Direct: (2,2) → (1,2) forest cost 2 → (0,2) plains cost 1 = total 3
    // Around:  (2,2) → (2,1) cost 1 → (1,1) cost 1 → (0,1) cost 1 → (0,2) cost 1 = total 4
    // The direct path is cheaper (3 < 4), so it should be chosen
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
    expect(path![0]).toEqual({ x: 1, y: 2 });
    expect(path![1]).toEqual({ x: 0, y: 2 });
  });

  it('does not pass through occupied tiles', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 1, 2);
    const blocker = new Unit('e1', 'Block', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 2);
    grid.placeUnit(blocker, 2, 2);
    const path = findPath(unit, grid, 3, 2);
    // Must go around the blocker: (1,2) → (1,1) → (2,1) → (3,1) → (3,2)
    expect(path).not.toBeNull();
    for (const step of path!) {
      expect(step.x === 2 && step.y === 2).toBe(false);
    }
  });
});
```

**Step 2: Run test to verify RED**

```bash
npx vitest run src/game/movement/__tests__/Pathfinder.test.ts
```

Expected: FAIL — module does not exist.

**Step 3: Write minimal implementation**

```typescript
// src/game/movement/Pathfinder.ts
import { Grid, GridNeighbor } from '../map/Grid';
import { Unit } from '../units/Unit';

export function findPath(unit: Unit, grid: Grid, destX: number, destY: number): GridNeighbor[] | null {
  const maxMov = unit.stats.mov;
  const startX = unit.gridX;
  const startY = unit.gridY;
  const startKey = `${String(startX)},${String(startY)}`;
  const destKey = `${String(destX)},${String(destY)}`;

  if (startX === destX && startY === destY) return null;

  const queue: [number, number, number][] = [[0, startX, startY]];
  const visited = new Map<string, number>();
  const predecessor = new Map<string, string>();
  visited.set(startKey, 0);

  while (queue.length > 0) {
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i][0] < queue[minIdx][0]) minIdx = i;
    }
    const [cost, x, y] = queue.splice(minIdx, 1)[0];

    for (const neighbor of grid.getNeighbors(x, y)) {
      const nx = neighbor.x;
      const ny = neighbor.y;
      const terrainCost = grid.getTerrainData(nx, ny).moveCost;

      if (terrainCost >= 99) continue;

      const newCost = cost + terrainCost;
      if (newCost > maxMov) continue;

      const key = `${String(nx)},${String(ny)}`;
      const prevCost = visited.get(key);
      if (prevCost !== undefined && prevCost <= newCost) continue;

      if (grid.isOccupied(nx, ny) && !(nx === startX && ny === startY)) continue;

      visited.set(key, newCost);
      predecessor.set(key, `${String(x)},${String(y)}`);
      queue.push([newCost, nx, ny]);
    }
  }

  if (!visited.has(destKey)) return null;

  // Backtrack to build path
  const path: GridNeighbor[] = [];
  let current = destKey;
  while (current !== startKey) {
    const [x, y] = current.split(',').map(Number);
    path.push({ x, y });
    const prev = predecessor.get(current);
    if (!prev) return null; // should never happen if visited has destKey
    current = prev;
  }

  path.reverse();
  return path;
}
```

**Step 4: Run test to verify GREEN**

```bash
npx vitest run src/game/movement/__tests__/Pathfinder.test.ts
```

Expected: all 10 tests pass.

**Step 5: Commit**

```bash
git add src/game/movement/Pathfinder.ts src/game/movement/__tests__/Pathfinder.test.ts
git commit -m "feat: add Pathfinder with predecessor tracking and cardinal-only pathing"
```

---

## Task 13.3: Refactor `computeMoveRange` to delegate to Pathfinder internals (optional cleanup)

**Objective:** Avoid duplicating the Dijkstra algorithm. Extract a shared `computeReachable` helper used by both `computeMoveRange` and `findPath`.

**Decision:** **Skip for now** — duplication is acceptable across two small functions (~40 lines each). Refactor after both are stable. The plan already works; premature abstraction is the enemy. Add a `TODO` comment instead.

---

## Task 13.4: Add path preview rendering in BattleScene

**Objective:** When the player hovers over a tile in the selected unit's move range, draw a visible path (arrow trail) from the unit to the hovered tile.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Design:**
- On `handleTileClick` (or better, on `pointermove` while a unit is selected), compute `findPath` to the tile under the cursor
- If the path exists and the tile is in move range, draw it on a new `pathGraphics` layer (or reuse `moveGraphics`)
- Path style: small arrow sprites or a dotted line. Use `Graphics.lineStyle` + `lineTo` for a clean dotted path.
- When the cursor leaves the move range or no unit is selected, clear the preview

**Step 1: Write failing test**

This is a Phaser scene rendering concern, not pure game logic. We cannot unit-test Phaser graphics directly in Vitest. Instead, we test the **integration** — the scene calls `findPath` correctly and stores the path.

Create a thin testable wrapper:

```typescript
// src/game/movement/PathPreview.ts
import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { findPath } from './Pathfinder';
import { GridNeighbor } from '../map/Grid';
import { computeMoveRange } from './MoveRange';

export interface PathPreviewState {
  path: GridNeighbor[] | null;
  destination: { x: number; y: number } | null;
}

export function computePathPreview(
  unit: Unit,
  grid: Grid,
  hoverX: number,
  hoverY: number,
): PathPreviewState {
  const range = computeMoveRange(unit, grid);
  const key = `${String(hoverX)},${String(hoverY)}`;
  if (!range.has(key)) {
    return { path: null, destination: null };
  }
  const path = findPath(unit, grid, hoverX, hoverY);
  return { path, destination: { x: hoverX, y: hoverY } };
}
```

```typescript
// src/game/movement/__tests__/PathPreview.test.ts
import { describe, it, expect } from 'vitest';
import { computePathPreview } from '../PathPreview';
import { Grid } from '../../map/Grid';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('computePathPreview', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('returns null path when hover tile is out of range', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const preview = computePathPreview(unit, grid, 4, 2);
    expect(preview.path).toBeNull();
    expect(preview.destination).toBeNull();
  });

  it('returns a path when hover tile is in range', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const preview = computePathPreview(unit, grid, 3, 2);
    expect(preview.path).not.toBeNull();
    expect(preview.destination).toEqual({ x: 3, y: 2 });
  });

  it('returns path with correct length for adjacent tile', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const preview = computePathPreview(unit, grid, 3, 2);
    expect(preview.path).toHaveLength(1);
    expect(preview.path![0]).toEqual({ x: 3, y: 2 });
  });
});
```

**Step 2: Run test to verify RED**

```bash
npx vitest run src/game/movement/__tests__/PathPreview.test.ts
```

Expected: FAIL.

**Step 3: Write minimal implementation**

Write the `PathPreview.ts` file shown in Step 1.

**Step 4: Run test to verify GREEN**

```bash
npx vitest run src/game/movement/__tests__/PathPreview.test.ts
```

Expected: 3 tests pass.

**Step 5: Commit**

```bash
git add src/game/movement/PathPreview.ts src/game/movement/__tests__/PathPreview.test.ts
git commit -m "feat: add computePathPreview helper for path-on-hover logic"
```

---

## Task 13.5: Integrate path preview into BattleScene hover handling

**Objective:** Wire `computePathPreview` into `BattleScene` so the path draws on hover and clears on move/click.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Design:**
- Add `private pathGraphics!: Phaser.GameObjects.Graphics;`
- In `create()`, initialize `this.pathGraphics = this.add.graphics(); this.pathGraphics.setDepth(2);`
- Add `private hoverPath: GridNeighbor[] | null = null;`
- On `pointermove`, if a unit is selected and no menu is open:
  - Compute gx, gy from pointer
  - Call `computePathPreview(selectedUnit, this.engine.grid, gx, gy)`
  - If path returned, store it and draw with `pathGraphics`
  - If no path, clear `pathGraphics`
- On `pointerdown` (confirm move), clear `pathGraphics`
- On `undoMove`, `triggerEndTurn`, or selecting a new unit, clear `pathGraphics`

**Path drawing style:**

```typescript
private drawPathPreview(path: GridNeighbor[]): void {
  this.pathGraphics.clear();
  if (!path || path.length === 0) return;

  this.pathGraphics.lineStyle(3, 0xffffff, 0.8);
  const startX = this.offsetX + this.selectedUnit!.gridX * TILE_SIZE + TILE_SIZE / 2;
  const startY = this.offsetY + this.selectedUnit!.gridY * TILE_SIZE + TILE_SIZE / 2;
  this.pathGraphics.beginPath();
  this.pathGraphics.moveTo(startX, startY);

  for (const step of path) {
    const px = this.offsetX + step.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.offsetY + step.y * TILE_SIZE + TILE_SIZE / 2;
    this.pathGraphics.lineTo(px, py);
  }
  this.pathGraphics.strokePath();

  // Draw arrowhead at destination
  const dest = path[path.length - 1];
  const dx = this.offsetX + dest.x * TILE_SIZE + TILE_SIZE / 2;
  const dy = this.offsetY + dest.y * TILE_SIZE + TILE_SIZE / 2;
  this.pathGraphics.fillStyle(0xffffff, 0.9);
  this.pathGraphics.fillCircle(dx, dy, 4);
}
```

**Step 1: Write failing test**

No new pure-logic test needed — the integration is covered by:
1. `PathPreview.test.ts` (logic)
2. Manual verification in browser (rendering)

But we add a test that the scene-level `findPath` integration returns correct data:

```typescript
// src/game/__tests__/GameEngine.test.ts
it('can find path to a reachable tile', () => {
  const engine = new GameEngine(10, 10);
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
  const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
  // Import findPath directly or expose via GameEngine
  const { findPath } = await import('../movement/Pathfinder');
  const path = findPath(unit, engine.grid, 7, 5);
  expect(path).not.toBeNull();
  expect(path).toHaveLength(2);
});
```

Add `findPath` re-export to `GameEngine.ts`:

```typescript
import { findPath } from './movement/Pathfinder';
// ... inside GameEngine class:
findPath(unit: Unit, destX: number, destY: number) {
  return findPath(unit, this.grid, destX, destY);
}
```

**Step 2: Run test to verify RED**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```

Expected: FAIL — `findPath` not on `GameEngine`.

**Step 3: Write minimal implementation**

Add the re-export to `GameEngine.ts` and implement the BattleScene changes described above.

**Step 4: Run test to verify GREEN**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
npx vitest run src/game/movement/__tests__/PathPreview.test.ts
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/scenes/BattleScene.ts
git commit -m "feat: integrate path preview into BattleScene hover"
```

---

## Task 13.6: Implement stepwise unit movement animation

**Objective:** When the player clicks a destination, the unit does not teleport. It steps through each tile in the path with a short tween delay between tiles.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Design:**
- In `handleTileClick`, after confirming the destination is in range and unoccupied:
  - Call `this.engine.findPath(this.selectedUnit, gx, gy)` to get the path
  - Store `preMovePosition`
  - Start a sequential tween chain: for each step in the path, tween the sprite to that tile's pixel position with `duration: 150`
  - After all steps complete, call the existing post-move logic (`engine.moveUnit`, `showPostMoveMenu`)

```typescript
private animatePathMovement(unit: Unit, path: GridNeighbor[], onComplete: () => void): void {
  const sprite = this.unitSprites.get(unit.id);
  if (!sprite) {
    onComplete();
    return;
  }

  let stepIndex = 0;
  const processStep = () => {
    if (stepIndex >= path.length) {
      onComplete();
      return;
    }
    const step = path[stepIndex];
    const targetX = this.offsetX + step.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = this.offsetY + step.y * TILE_SIZE + TILE_SIZE / 2;
    this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration: 150,
      ease: 'Linear',
      onComplete: () => {
        stepIndex++;
        processStep();
      },
    });
  };
  processStep();
}
```

Update `handleTileClick` move branch:

```typescript
if (range.has(key) && !clickedUnit) {
  const unitToMove = this.selectedUnit;
  this.preMovePosition = { x: unitToMove.gridX, y: unitToMove.gridY };
  const path = this.engine.findPath(unitToMove, gx, gy);
  if (!path) return;
  this.animatePathMovement(unitToMove, path, () => {
    this.engine.moveUnit(unitToMove, gx, gy);
    unitToMove.state.transition(UNIT_STATE.MOVING);
    unitToMove.state.transition(UNIT_STATE.MENU);
    this.showPostMoveMenu(unitToMove);
  });
  return;
}
```

**Step 1: Write failing test**

We test the stepwise logic at the pure level by asserting `findPath` returns the correct sequence, and at the scene level by mocking the tween system. However, mocking Phaser tweens is brittle. Instead, we verify:

1. `findPath` returns a valid path (already tested in Task 13.2)
2. The `GameEngine.moveUnit` is called with the final destination (existing test)

No new test file is needed — the integration is covered by existing tests plus the new `GameEngine.findPath` test from Task 13.5. The sequential animation is a Phaser concern tested manually.

**Step 2–4: Implement, verify existing tests pass**

```bash
npx vitest run
```

Expected: all tests pass (no regressions).

**Step 5: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: stepwise unit movement along computed path"
```

---

## Task 13.7: Polish — path styles and edge cases

**Objective:** Ensure the path preview and movement feel good and handle edge cases correctly.

### Edge cases to handle

1. **Hover over occupied tile** — no path drawn, cursor shows "blocked"
2. **Hover outside move range** — path cleared
3. **Player clicks during step animation** — input is disabled during `animatePathMovement`; already guarded by `inputEnabled` or add a new `isMoving` flag
4. **Undo during step animation** — disable undo while moving; add `this.isAnimatingMovement` flag
5. **Path preview should not draw over menu** — `pathGraphics.setDepth(1)` below menu texts (depth 10+)

### Add `isAnimatingMovement` guard

```typescript
private isAnimatingMovement = false;

// In animatePathMovement:
this.isAnimatingMovement = true;
// ... onComplete:
this.isAnimatingMovement = false;

// In handleTileClick top:
if (this.isAnimatingMovement) return;
```

**Step 1: Regression test**

```bash
npx vitest run
```

All tests must still pass.

**Step 2: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: add movement animation guards and path preview polish"
```

---

## Task 13.8: Update EnemyPreview to also show path (optional)

**Objective:** When previewing an enemy unit (Phase 12 feature), also draw the enemy's potential path to the nearest player unit. Purely informational.

**Decision:** **Defer.** This requires enemy AI pathing to a target, which is out of scope for this plan. The enemy preview already shows move + attack range. A path to a target belongs in the AI/Commander module.

---

## Verification Checklist

Before marking this phase complete:

- [ ] `findPath` computes correct paths for all 8+ test cases
- [ ] `computePathPreview` returns null for out-of-range tiles
- [ ] BattleScene draws a visible path on hover
- [ ] BattleScene clears the path on click, undo, end turn, or new selection
- [ ] Unit steps through each tile when moving (not teleport)
- [ ] `isAnimatingMovement` blocks input during step animation
- [ ] All existing tests pass (258+) with no regressions
- [ ] All new code has tests written first (TDD)
- [ ] No Phaser imports in `src/game/movement/`

---

## Commit Summary for This Phase

```
feat: add Grid.getNeighbors for cardinal neighbor iteration
feat: add Pathfinder with predecessor tracking and cardinal-only pathing
feat: add computePathPreview helper for path-on-hover logic
feat: integrate path preview into BattleScene hover
feat: stepwise unit movement along computed path
feat: add movement animation guards and path preview polish
```

---

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `src/game/map/Grid.ts` | Modify | Add `getNeighbors()` |
| `src/game/map/__tests__/Grid.test.ts` | Modify | Test `getNeighbors()` |
| `src/game/movement/Pathfinder.ts` | Create | Dijkstra + predecessor → path reconstruction |
| `src/game/movement/__tests__/Pathfinder.test.ts` | Create | 10 pathfinding test cases |
| `src/game/movement/PathPreview.ts` | Create | `computePathPreview` wrapper |
| `src/game/movement/__tests__/PathPreview.test.ts` | Create | Hover-in-range / out-of-range tests |
| `src/game/GameEngine.ts` | Modify | Re-export `findPath` |
| `src/game/__tests__/GameEngine.test.ts` | Modify | Add `findPath` integration test |
| `src/scenes/BattleScene.ts` | Modify | Path preview overlay + stepwise animation |
