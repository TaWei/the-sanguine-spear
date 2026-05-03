# Phase 12: Move Undo, Cardinal-Only Adjacency, Attack-Range Highlighting

> **For Hermes:** Implement task-by-task. Each task is independent enough to test in isolation.

---

## Task 12.1: Allow undoing a unit move before committing the turn

**Objective:** When a player moves a unit and the post-move menu (Fight / End Turn) appears, clicking anywhere outside that menu reverts the move and returns the unit to its original position.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Implementation plan:**

1. Add a private field to track the pre-move position:
   ```typescript
   private preMovePosition: { unit: Unit; x: number; y: number } | null = null;
   ```

2. In `handleTileClick`, before the tween that moves the unit, capture the original position:
   ```typescript
   this.preMovePosition = { unit: unitToMove, x: unitToMove.gridX, y: unitToMove.gridY };
   ```

3. In `showPostMoveMenu`, set a flag so we know the menu is showing post-move. The existing `battleMenu.isVisible` is sufficient.

4. Add an input listener on the scene (or handle in `handleTileClick`) that detects clicks outside the menu when `battleMenu.isVisible` is true. If the click is not on the Fight or End Turn text, undo the move:
   ```typescript
   private undoMove(): void {
     if (!this.preMovePosition) return;
     const { unit, x, y } = this.preMovePosition;
     // Revert engine position
     this.engine.moveUnit(unit, x, y);
     // Revert sprite position
     const sprite = this.unitSprites.get(unit.id);
     if (sprite) {
       sprite.setPosition(
         this.offsetX + x * TILE_SIZE + TILE_SIZE / 2,
         this.offsetY + y * TILE_SIZE + TILE_SIZE / 2,
       );
     }
     // Reset state
     unit.state.reset();
     this.battleMenu.reset();
     this.clearMenuTexts();
     this.moveGraphics.clear();
     this.preMovePosition = null;
     // Optionally re-select the unit
     this.selectedUnit = unit;
     this.showMoveRange(unit);
   }
   ```

5. Hook the undo into `handleTileClick`: when `battleMenu.isVisible` and the click is not on a valid menu target, call `undoMove()` instead of proceeding with target selection.

**Edge cases:**
- If the unit moved onto an enemy (shouldn't happen — move range excludes occupied tiles), don't allow undo into an occupied tile.
- If the player clicked Fight and is now in target-selection mode (`MenuState.CHOOSE_TARGET`), clicking outside should cancel target selection and return to the menu, not undo the move. Distinguish between `MenuState.CHOOSE_ACTION` (undo on outside click) and `MenuState.CHOOSE_TARGET` (cancel target selection).

---

## Task 12.2: Restrict attacks to cardinal directions only

**Objective:** Units may only attack enemies directly adjacent in the four cardinal directions (up, down, left, right). Diagonal adjacency must not count.

**Files:**
- Modify: `src/game/combat/Adjacency.ts`
- Verify: `src/game/combat/__tests__/Adjacency.test.ts`

**Implementation plan:**

1. Locate `getAdjacentEnemies` in `src/game/combat/Adjacency.ts`. It currently likely checks all 8 directions via `getNeighbors`.

2. Change the neighbor iteration to only the 4 cardinal offsets:
   ```typescript
   const cardinal = [
     { dx: 0, dy: -1 },
     { dx: 0, dy: 1 },
     { dx: -1, dy: 0 },
     { dx: 1, dy: 0 },
   ];
   ```

3. For each cardinal offset, check the tile and filter by enemy faction and weapon range (for melee weapons, range = 1; this is already handled).

4. Add or update a test in `src/game/combat/__tests__/Adjacency.test.ts` that places an enemy diagonally and asserts it is NOT returned by `getAdjacentEnemies`.

**Edge cases:**
- Ranged weapons (e.g., mage's tome, archer bow) may have range > 1. The cardinal restriction should only apply to melee-range (1 tile) adjacency attacks, OR it should apply to all attacks such that any attack must be in a cardinal direction at the weapon's max range. Given the current engine only supports melee (range 1), restrict to cardinal at range 1.

---

## Task 12.3: Highlight attackable boundary squares in red

**Objective:** When a unit is selected, in addition to blue move-range tiles, show red highlighting on squares at the outer boundary that the unit could attack if it moved to the edge of its movement range.

**Files:**
- Modify: `src/scenes/BattleScene.ts`
- Potentially modify: `src/game/combat/Adjacency.ts` or add a helper in `src/game/GameEngine.ts`

**Implementation plan:**

1. Add a helper method to `GameEngine` (or reuse existing logic) that computes the "threatened" tiles for a unit from its current position, considering move + weapon range:
   ```typescript
   getThreatenedTiles(unit: Unit): Set<string> {
     const moveRange = computeMoveRange(unit, this.grid);
     const weapon = this.getWeaponForUnit(unit);
     const threatened = new Set<string>();

     moveRange.forEach((_cost, moveKey) => {
       const [mx, my] = moveKey.split(',').map(Number);
       // From each reachable tile, find attackable tiles within weapon range
       const attackable = getAttackableTiles(mx, my, weapon.range, this.grid);
       for (const key of attackable) {
         if (!moveRange.has(key)) {
           threatened.add(key);
         }
       }
     });

     return threatened;
   }
   ```

   For melee weapons (range = 1), `getAttackableTiles` returns the 4 (or 8) adjacent tiles. Since we are combining with Task 12.2, it should return the 4 cardinal tiles.

2. In `BattleScene.showMoveRange`, after drawing blue move tiles, draw red tiles for the threatened set:
   ```typescript
   private showMoveRange(unit: Unit): void {
     this.moveGraphics.clear();
     const range = this.engine.getMoveRange(unit);
     const threatened = this.engine.getThreatenedTiles(unit);

     // Blue: move range
     range.forEach((_cost, key) => {
       const [x, y] = key.split(',').map(Number);
       this.moveGraphics.fillStyle(0x3498db, 0.4);
       this.moveGraphics.fillRect(
         this.offsetX + x * TILE_SIZE,
         this.offsetY + y * TILE_SIZE,
         TILE_SIZE,
         TILE_SIZE,
       );
     });

     // Red: threatened tiles outside move range
     threatened.forEach((key) => {
       if (range.has(key)) return; // don't double-draw over blue
       const [x, y] = key.split(',').map(Number);
       this.moveGraphics.fillStyle(0xe74c3c, 0.35);
       this.moveGraphics.fillRect(
         this.offsetX + x * TILE_SIZE,
         this.offsetY + y * TILE_SIZE,
         TILE_SIZE,
         TILE_SIZE,
       );
     });
   }
   ```

3. If a new helper is added to `GameEngine`, add a quick unit test in `GameEngine.test.ts`.

**Edge cases:**
- Red tiles should not obscure blue tiles — draw red only for keys not in the move range.
- Red tiles should include squares that contain enemies as well as empty squares (the player needs to see the full threat boundary).
- If the unit is already adjacent to an enemy, the enemy's tile may be in both move range and threatened set — ensure it stays blue (or blend colors). The simplest rule: move range takes precedence.

---

## Integration Verification

**Manual test checklist:**
1. Select a unit → blue move range appears, plus red outer ring showing potential attack reach.
2. Move the unit → post-move menu appears. Click on an empty tile away from the menu → unit snaps back to original position, can be moved again.
3. Move the unit, click Fight → target selection mode. Clicking outside target selection cancels back to menu (does NOT undo the move).
4. Place an enemy diagonally adjacent → unit cannot select it as a fight target.
5. Place an enemy cardinally adjacent → unit can fight it.

**Run tests:**
```bash
npx vitest run
```
