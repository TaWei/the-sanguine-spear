# Phase 11: Auto-End Turn & Turn Banner

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:**
1. Automatically end the player's global turn when all live player units have acted.
2. Show an animated "Turn X" banner at the center of the screen whenever the player phase begins.

**Architecture:**
- Pure logic (`src/game/`) provides the query; Phaser layer (`src/scenes/BattleScene.ts`) drives the timing.
- Banner is a pure Phaser visual — no engine state needed.
- Input must be blocked during the banner animation.

---

### Task 11.1: Add `allPlayerUnitsExhausted()` to GameEngine

**Objective:** A pure, testable method that returns `true` when every live player unit is in the `EXHAUSTED` state.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Create: test in `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**
```typescript
it('returns true when all live player units are exhausted', () => {
  const engine = new GameEngine(10, 8);
  const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
  engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MAGE, stats, 1, 1);
  expect(engine.allPlayerUnitsExhausted()).toBe(false);
  for (const u of engine.getUnitsByFaction(Faction.PLAYER)) {
    u.state.transition(UNIT_STATE.MOVING);
    u.state.transition(UNIT_STATE.MENU);
    u.state.transition(UNIT_STATE.EXHAUSTED);
  }
  expect(engine.allPlayerUnitsExhausted()).toBe(true);
});

it('ignores dead units', () => {
  const engine = new GameEngine(10, 8);
  const stats = createStats({ hp: 20, ... });
  const dead = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
  dead.takeDamage(999);
  engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MAGE, stats, 1, 1);
  expect(engine.allPlayerUnitsExhausted()).toBe(false);
});
```

**Step 2: Make it pass**
Add to `GameEngine`:
```typescript
allPlayerUnitsExhausted(): boolean {
  const livePlayers = this.getUnitsByFaction(Faction.PLAYER).filter((u) => u.isAlive);
  if (livePlayers.length === 0) return true;
  return livePlayers.every((u) => u.state.isExhausted());
}
```

---

### Task 11.2: Auto-end player turn

**Objective:** After any player unit becomes exhausted, check if all player units are exhausted. If yes, automatically trigger the global end turn after a short delay.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Hook points:**
1. After `endText.on('pointerdown')` in `showPostMoveMenu` — the player clicked "End Turn" on the unit menu.
2. After `endBattleMode()` completes — the player finished combat.

**Implementation:**
Add a private method:
```typescript
private checkAutoEndTurn(): void {
  if (this.engine.allPlayerUnitsExhausted()) {
    this.time.delayedCall(400, () => {
      if (!this.engine.turnManager.isPlayerPhase()) return;
      // Simulate clicking the End Turn button
      const endTurnBtn = ... // or just call the same logic
      this.triggerEndTurn();
    });
  }
}
```

Refactor the end-turn logic out of the UI button callback into a reusable `triggerEndTurn()` private method, then call it from:
- The UI button pointerdown
- `checkAutoEndTurn()`

Make sure `checkAutoEndTurn()` is called:
- Inside `endBattleMode()` after `this.battleMenu.reset()` and after win/loss checks
- Inside the "End Turn" menu button callback after `unit.state.transition(UNIT_STATE.EXHAUSTED)`

**Pitfall:** Do NOT auto-end if the battle ended in victory/defeat — the victory/defeat overlay should stay.

---

### Task 11.3: Turn banner animation

**Objective:** A reusable method that creates a centered "Turn X" banner, animates it in, holds, then fades out.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Design:**
- Dark semi-transparent rectangle spanning the screen width, centered vertically at 40% height.
- Large gold text: `"Turn ${turnNumber}"`
- Phaser tween sequence: fade in (300ms), hold (1200ms), fade out (300ms).
- Input is blocked during the animation.

**Implementation:**
```typescript
private showTurnBanner(turnNumber: number, onComplete: () => void): void {
  this.inputEnabled = false; // or use a flag
  const overlay = this.add.container(0, 0);
  const bg = this.add.rectangle(
    this.cameras.main.width / 2,
    this.cameras.main.height * 0.4,
    this.cameras.main.width,
    80,
    0x000000,
    0.7,
  );
  const text = this.add
    .text(this.cameras.main.width / 2, this.cameras.main.height * 0.4, `Turn ${turnNumber}`, {
      fontSize: '36px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setAlpha(0);
  overlay.add([bg, text]);

  this.tweens.add({
    targets: text,
    alpha: 1,
    duration: 300,
    onComplete: () => {
      this.time.delayedCall(1200, () => {
        this.tweens.add({
          targets: overlay,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            overlay.destroy();
            onComplete();
          },
        });
      });
    },
  });
}
```

---

### Task 11.4: Wire banner to player turn start

**Objective:** Show the banner every time the player phase begins.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Logic:**
- Track `private bannerShownForTurn = 0;`.
- After any phase change that lands on Player, if `bannerShownForTurn !== this.engine.turnManager.turnNumber`, show the banner and set `bannerShownForTurn`.
- Hook into `triggerEndTurn()` when the phase wraps back to Player (enemy → ally → player cycle completes).
- Also show on initial `create()` since turn 1 starts in player phase.

**Pseudocode:**
```typescript
private beginPlayerPhase(): void {
  if (this.bannerShownForTurn === this.engine.turnManager.turnNumber) {
    this.inputEnabled = true;
    return;
  }
  this.showTurnBanner(this.engine.turnManager.turnNumber, () => {
    this.inputEnabled = true;
  });
  this.bannerShownForTurn = this.engine.turnManager.turnNumber;
}
```

Call `beginPlayerPhase()`:
- At the end of `create()`
- At the end of `triggerEndTurn()` when transitioning back to Player phase

---

### Task 11.5: Block input during banner and enemy phase

**Objective:** Ensure tile clicks are ignored while the banner is showing or during enemy phase.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Implementation:**
Add a private flag `private inputEnabled = true;`.
In `handleTileClick`, guard with:
```typescript
if (!this.inputEnabled || !this.engine.turnManager.isPlayerPhase() || this.inBattleMode) {
  return;
}
```
Set `inputEnabled = false` when:
- Banner starts
- Enemy phase starts

Set `inputEnabled = true` when:
- Banner finishes
- Player phase begins (and banner already shown)

---

### Task 11.6: Integration verification

**Manual test checklist:**
1. Start game → "Turn 1" banner appears, then input unlocks.
2. Move both player units and end their turns → global turn auto-ends, enemy phase begins.
3. After enemy+ally phases → "Turn 2" banner appears, input unlocks.
4. Kill all enemies → victory screen, no auto-end triggered.
5. Let both player units die → defeat screen.

**Run tests:**
```bash
npm test
```
