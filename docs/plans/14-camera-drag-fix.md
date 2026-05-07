# Camera Drag-to-Scroll Fix — Implementation Plan

> **Goal:** Make click-and-drag camera panning work correctly on large maps (Level 3).

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest

---

## Root Cause Analysis

Three bugs block camera dragging:

### Bug 1: Drag only starts outside grid bounds (critical)
**File:** `src/scenes/BattleScene.ts`, `setupInput()` ~line 308

```typescript
// CURRENT (broken):
if (!this.engine.grid.isInBounds(gx, gy)) {
  this.isDragging = true;  // Only drags when clicking OUTSIDE grid
```

On a large map with `offsetX=0, offsetY=0` and camera setBounds, the grid fills the entire world. Every click lands inside bounds → `isDragging` never set → drag never activates.

**Fix:** Start a potential drag on ANY pointerdown. Use a movement threshold (e.g., 5px) to distinguish clicks from drags. If the pointer moves < threshold before pointerup, it's a tile click. If > threshold, it's a drag.

### Bug 2: Scroll direction is inverted
**File:** `src/scenes/BattleScene.ts`, `setupInput()`, pointermove handler ~line 324

```typescript
// CURRENT (broken):
const dx = this.dragLastX - pointer.x;  // inverted sign
const dy = this.dragLastY - pointer.y;
this.cameras.main.scrollX += dx;  // wrong direction
this.cameras.main.scrollY += dy;
this.dragLastX = pointer.x + dx;  // stores original start, not last position
this.dragLastY = pointer.y + dy;
```

When dragging right (pointer.x increases), `dx = old - new` is negative, `scrollX += negative` decreases scrollX, moving the camera LEFT in world space — opposite of expected.

**Fix:** Use standard frame-by-frame delta:
```typescript
const dx = pointer.x - this.dragLastX;
const dy = pointer.y - this.dragLastY;
this.cameras.main.scrollX -= dx;
this.cameras.main.scrollY -= dy;
this.dragLastX = pointer.x;
this.dragLastY = pointer.y;
```

### Bug 3: Hover path drawing interferes with drag
When `isDragging` is true but `pointer.isDown` flips to false mid-drag (edge case), or when the drag starts on a tile with a unit, the hover handler fires and draws move range graphics over the dragged view.

**Fix:** The pointermove handler already checks `isDragging` first and returns early — this is correct. The fix for Bug 1 ensures `isDragging` is set properly.

---

## Tasks

### Task 1: Fix drag activation with movement threshold

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Changes:**

1. Add new fields:
```typescript
private dragStartX = 0;
private dragStartY = 0;
private readonly DRAG_THRESHOLD = 5; // px — movement below this = click
private wasDragging = false; // tracks whether pointerup was a drag
```

2. Rewrite `pointerdown` handler:
```typescript
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  this.dragStartX = pointer.x;
  this.dragStartY = pointer.y;
  this.dragLastX = pointer.x;
  this.dragLastY = pointer.y;
  this.isDragging = false;
  this.wasDragging = false;

  const gx = Math.floor((pointer.x - this.offsetX) / TILE_SIZE);
  const gy = Math.floor((pointer.y - this.offsetY) / TILE_SIZE);
  if (!this.engine.grid.isInBounds(gx, gy)) {
    if (this.battleMenu.isVisible && !this.isPointerOverMenuText(pointer.x, pointer.y)) {
      this.handleOutsideMenuClick();
    }
    return;
  }
  // Don't call handleTileClick here — defer to pointerup
});
```

3. Rewrite `pointermove` handler:
```typescript
this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
  // Check if we've moved past the drag threshold
  if (!this.isDragging && pointer.isDown) {
    const dist = Math.abs(pointer.x - this.dragStartX) + Math.abs(pointer.y - this.dragStartY);
    if (dist > this.DRAG_THRESHOLD) {
      this.isDragging = true;
      this.wasDragging = true;
    }
  }

  // Handle drag-to-scroll
  if (this.isDragging && pointer.isDown) {
    const dx = pointer.x - this.dragLastX;
    const dy = pointer.y - this.dragLastY;
    this.cameras.main.scrollX -= dx;
    this.cameras.main.scrollY -= dy;
    this.dragLastX = pointer.x;
    this.dragLastY = pointer.y;
    this.updateVisibleTiles();
    return;
  }

  // Normal hover (only if not in a drag)
  if (
    !this.inputEnabled ||
    !this.engine.turnManager.isPlayerPhase() ||
    this.inBattleMode ||
    this.isAnimatingMovement
  ) {
    return;
  }
  const gx = Math.floor((pointer.x - this.offsetX) / TILE_SIZE);
  const gy = Math.floor((pointer.y - this.offsetY) / TILE_SIZE);
  if (!this.engine.grid.isInBounds(gx, gy)) {
    this.pathGraphics.clear();
    return;
  }
  this.handleTileHover(gx, gy);
});
```

4. Rewrite `pointerup` handler:
```typescript
this.input.on('pointerup', () => {
  if (this.isDragging) {
    this.isDragging = false;
    return; // was a drag, don't process as click
  }
  
  // It was a click (not a drag) — process tile click
  // Compute the grid position from the original click (dragStartX/Y)
  const gx = Math.floor((this.dragStartX - this.offsetX) / TILE_SIZE);
  const gy = Math.floor((this.dragStartY - this.offsetY) / TILE_SIZE);
  if (this.engine.grid.isInBounds(gx, gy)) {
    this.handleTileClick(gx, gy, this.dragStartX, this.dragStartY);
  }
});
```

### Task 2: Verify on both map sizes

1. `npm run dev` → load Level 1 — click to select units works normally, no accidental drags
2. Level 3 — drag on water scrolls the camera in the correct direction
3. Level 3 — click on a unit selects it (short click, no movement)
4. Level 3 — drag on a tile with a unit does NOT select the unit
5. `npx vitest run` — 650 tests pass, no regressions

### Task 3: Commit

```bash
git add -A && git commit -m "fix: correct camera drag-to-scroll activation, direction, and click vs drag detection"
```

---

## Verification Checklist

- [ ] Level 1: click-to-select works, no accidental drags
- [ ] Level 3: drag-to-scroll works in all 4 directions
- [ ] Level 3: scroll direction matches finger movement (drag right → camera moves right)
- [ ] Level 3: short click on unit selects it, drag on same unit scrolls instead
- [ ] Level 3: tiles render correctly during and after scroll
- [ ] `npx vitest run` — all 650 tests pass

---

## Design Decision: Click vs Drag

Using a **movement threshold** (5px Manhattan distance) rather than time-based detection:
- Simpler — no timer management
- Works better on trackpads where taps can have sub-pixel movement
- Standard pattern used by Phaser examples and game engines
- 5px is small enough that intentional clicks don't feel laggy, large enough to filter accidental micro-movements
