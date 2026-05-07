# 16:9 Viewport & Vertical Centering — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Change game resolution from 1024×768 (4:3) to 1280×720 (16:9) and ensure the grid is vertically centered on the canvas.

**Architecture:** Extract a pure `LayoutCalculator` class into `src/game/ui/` that computes grid offsets from canvas dimensions and grid dimensions. Test it in Vitest, then wire it into `BattleScene`. Update `constants.ts` to the new resolution, and fix `CutsceneScene.ts` which hardcodes the old dimensions.

**Tech Stack:** TypeScript, Vitest, Phaser 3 (rendering only — no Phaser imports in pure class)

---

## Current State

| File | Issue |
|------|-------|
| `src/constants.ts:1-2` | `GAME_WIDTH=1024, GAME_HEIGHT=768` (4:3) |
| `src/main.ts:10-11` | Uses constants — no change needed |
| `src/main.ts:16-17` | `Phaser.Scale.FIT` + `CENTER_BOTH` — already centers canvas in browser |
| `src/scenes/BattleScene.ts:117-118` | `offsetX = (width - cols*TILE) / 2; offsetY = (height - rows*TILE) / 2` — dimension-agnostic, correct |
| `src/scenes/CutsceneScene.ts:4-5` | **Hardcoded** `const GAME_WIDTH = 1024; const GAME_HEIGHT = 768;` — must be fixed |
| `index.html` | Body uses `display:flex; align-items:center; justify-content:center; height:100vh` — already centers |

## Design Decision: 1280×720 (720p)

The grid is 16 cols × 12 rows × 48px = 768×576.

| Resolution | Extra H space | Extra V space |
|-----------|---------------|---------------|
| 1024×768 (current) | 256px | 192px |
| 1024×576 | 256px | 0px ❌ |
| **1280×720** | **512px** | **144px** ✅ |

1280×720 gives comfortable breathing room for UI panels on both axes. Standard 16:9 resolution, well-supported everywhere.

---

### Task 1: Create LayoutCalculator pure class + tests

**Objective:** Extract grid offset computation into a testable pure class.

**Files:**
- Create: `src/game/ui/LayoutCalculator.ts`
- Create: `src/game/ui/__tests__/LayoutCalculator.test.ts`

**Architecture note:** The TDD pattern from the `test-driven-development` skill (Phaser reference doc) applies: extract pure logic into `src/game/ui/`, test with Vitest, wire into Phaser scene with thin glue. No Phaser imports in the pure class.

The `offsetX/offsetY` formulas in BattleScene (lines 117-118) are already dimension-agnostic:
```typescript
this.offsetX = (this.cameras.main.width - level.cols * TILE_SIZE) / 2;
this.offsetY = (this.cameras.main.height - level.rows * TILE_SIZE) / 2;
```

We'll extract these into a pure class that also documents what TILE_SIZE is being used.

**Step 1: Write failing test**

```typescript
// src/game/ui/__tests__/LayoutCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { LayoutCalculator } from '../LayoutCalculator';

describe('LayoutCalculator', () => {
  it('centers a 16×12 grid at 48px tiles on 1280×720 canvas', () => {
    const calc = new LayoutCalculator({ tileSize: 48 });

    const result = calc.computeOffsets({ canvasWidth: 1280, canvasHeight: 720, gridCols: 16, gridRows: 12 });

    // Grid size: 768×576
    // offsetX = (1280 - 768) / 2 = 256
    // offsetY = (720 - 576) / 2 = 72
    expect(result.offsetX).toBe(256);
    expect(result.offsetY).toBe(72);
  });

  it('centers grid on current 1024×768 canvas', () => {
    const calc = new LayoutCalculator({ tileSize: 48 });

    const result = calc.computeOffsets({ canvasWidth: 1024, canvasHeight: 768, gridCols: 16, gridRows: 12 });

    expect(result.offsetX).toBe(128);  // (1024 - 768) / 2
    expect(result.offsetY).toBe(96);   // (768 - 576) / 2
  });

  it('handles odd-sized grids', () => {
    const calc = new LayoutCalculator({ tileSize: 48 });

    const result = calc.computeOffsets({ canvasWidth: 800, canvasHeight: 600, gridCols: 10, gridRows: 8 });

    // Grid: 480×384, offsets: (800-480)/2=160, (600-384)/2=108
    expect(result.offsetX).toBe(160);
    expect(result.offsetY).toBe(108);
  });

  it('converts grid coordinates to pixel coordinates', () => {
    const calc = new LayoutCalculator({ tileSize: 48 });
    const offsets = { offsetX: 256, offsetY: 72 };

    // Center of tile at grid (3, 5)
    const pixel = calc.gridToPixel(3, 5, offsets);
    expect(pixel.x).toBe(256 + 3 * 48 + 24); // offset + col * tile + half tile
    expect(pixel.y).toBe(72 + 5 * 48 + 24);
  });

  it('converts pixel coordinates to grid coordinates (floor rounding)', () => {
    const calc = new LayoutCalculator({ tileSize: 48 });
    const offsets = { offsetX: 256, offsetY: 72 };

    // Click at pixel (400, 300)
    const grid = calc.pixelToGrid(400, 300, offsets);
    expect(grid.x).toBe(Math.floor((400 - 256) / 48)); // 3
    expect(grid.y).toBe(Math.floor((300 - 72) / 48));  // 4
  });
});
```

Run: `npx vitest run src/game/ui/__tests__/LayoutCalculator.test.ts`
Expected: FAIL — `LayoutCalculator` module not found

**Step 2: Write minimal implementation**

```typescript
// src/game/ui/LayoutCalculator.ts
export interface LayoutConfig {
  tileSize: number;
}

export interface CanvasDimensions {
  canvasWidth: number;
  canvasHeight: number;
  gridCols: number;
  gridRows: number;
}

export interface Offsets {
  offsetX: number;
  offsetY: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface GridPoint {
  x: number;
  y: number;
}

export class LayoutCalculator {
  readonly tileSize: number;

  constructor(config: LayoutConfig) {
    this.tileSize = config.tileSize;
  }

  computeOffsets(dims: CanvasDimensions): Offsets {
    return {
      offsetX: (dims.canvasWidth - dims.gridCols * this.tileSize) / 2,
      offsetY: (dims.canvasHeight - dims.gridRows * this.tileSize) / 2,
    };
  }

  gridToPixel(gx: number, gy: number, offsets: Offsets): PixelPoint {
    return {
      x: offsets.offsetX + gx * this.tileSize + this.tileSize / 2,
      y: offsets.offsetY + gy * this.tileSize + this.tileSize / 2,
    };
  }

  pixelToGrid(px: number, py: number, offsets: Offsets): GridPoint {
    return {
      x: Math.floor((px - offsets.offsetX) / this.tileSize),
      y: Math.floor((py - offsets.offsetY) / this.tileSize),
    };
  }
}
```

**Step 3: Run tests to verify pass**

Run: `npx vitest run src/game/ui/__tests__/LayoutCalculator.test.ts`
Expected: 5 PASS

**Step 4: Commit**

```bash
git add src/game/ui/LayoutCalculator.ts src/game/ui/__tests__/LayoutCalculator.test.ts
git commit -m "feat: add LayoutCalculator pure class for grid offset computations"
```

---

### Task 2: Update game resolution constants to 16:9

**Objective:** Change `GAME_WIDTH` and `GAME_HEIGHT` from 4:3 to 16:9.

**Files:**
- Modify: `src/constants.ts:1-2`

**Step 1: Change constants**

```typescript
// src/constants.ts — lines 1-2
export const GAME_WIDTH = 1280;   // was 1024
export const GAME_HEIGHT = 720;   // was 768
```

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All existing tests pass (existing tests don't depend on these constants directly)

**Step 3: Build check**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/constants.ts
git commit -m "feat: change game resolution to 1280×720 (16:9)"
```

---

### Task 3: Wire LayoutCalculator into BattleScene

**Objective:** Replace inline `offsetX/offsetY` computation in BattleScene with the new `LayoutCalculator`. This is the actual TDD integration step — the pure class was tested first, now we wire it in.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Add import and instantiate in BattleScene**

Add import at top (around line 2):
```typescript
import { LayoutCalculator } from '../game/ui/LayoutCalculator';
```

Add field (around line 48):
```typescript
private layoutCalc = new LayoutCalculator({ tileSize: TILE_SIZE });
```

**Step 2: Replace offset computation in `create()` (lines 117-118)**

Replace:
```typescript
this.offsetX = (this.cameras.main.width - level.cols * TILE_SIZE) / 2;
this.offsetY = (this.cameras.main.height - level.rows * TILE_SIZE) / 2;
```

With:
```typescript
const offsets = this.layoutCalc.computeOffsets({
  canvasWidth: this.cameras.main.width,
  canvasHeight: this.cameras.main.height,
  gridCols: level.cols,
  gridRows: level.rows,
});
this.offsetX = offsets.offsetX;
this.offsetY = offsets.offsetY;
```

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (LayoutCalculator tests verify the math)

**Step 4: Visual verification**

Run: `npm run dev`
Open browser at `http://localhost:5173` — verify:
- Grid is centered horizontally and vertically on the 16:9 canvas
- All UI elements (menus, overlays) render at correct positions
- No clipping or off-screen elements

**Step 5: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: wire LayoutCalculator into BattleScene"
```

---

### Task 4: Fix CutsceneScene hardcoded dimensions

**Objective:** Replace hardcoded `const GAME_WIDTH = 1024; const GAME_HEIGHT = 768;` in CutsceneScene with imports from `constants.ts`.

**Files:**
- Modify: `src/scenes/CutsceneScene.ts`

**Step 1: Replace hardcoded constants**

Delete lines 4-5:
```typescript
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;
```

Add import at top:
```typescript
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All pass

**Step 3: Build check**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Visual verification**

Trigger a cutscene in-game — verify dialog box, portraits, and text render correctly at 1280×720.

**Step 5: Commit**

```bash
git add src/scenes/CutsceneScene.ts
git commit -m "fix: replace hardcoded dimensions with constants in CutsceneScene"
```

---

### Task 5: Verify vertical centering end-to-end

**Objective:** Confirm the game viewport is vertically centered across all scenes.

**Verification checklist:**
- [ ] `Phaser.Scale.CENTER_BOTH` in `main.ts` (already present, line 17)
- [ ] `index.html` body flexbox centering (already present)
- [ ] Grid offsets computed with `LayoutCalculator` center the grid on canvas
- [ ] MainMenuScene renders centered
- [ ] BattleScene grid and UI render centered
- [ ] CutsceneScene overlays render centered

**No code changes in this task — verification only.** If any issues found, open follow-up tasks.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/game/ui/LayoutCalculator.ts` | **New** — pure grid offset calculator |
| `src/game/ui/__tests__/LayoutCalculator.test.ts` | **New** — 5 tests for LayoutCalculator |
| `src/constants.ts` | `GAME_WIDTH: 1024→1280`, `GAME_HEIGHT: 768→720` |
| `src/scenes/BattleScene.ts` | Import + wire `LayoutCalculator` |
| `src/scenes/CutsceneScene.ts` | Replace hardcoded dims with import from constants |

## Test Coverage

- `LayoutCalculator.computeOffsets()` — 16:9 canvas, current 4:3 canvas, odd grids
- `LayoutCalculator.gridToPixel()` — center of tile computation
- `LayoutCalculator.pixelToGrid()` — click-to-grid floor rounding
- All existing tests continue passing (tsconfig targets ES2020, no false positives)
