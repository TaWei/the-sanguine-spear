# Fire Emblem-Style Gameplay-Triggered Cutscenes

> **Status:** Infrastructure complete. BattleScene integration is the remaining work.
> **Goal:** Cutscenes trigger automatically during gameplay (attacking, killing, turn start, etc.) and play as overlays without destroying BattleScene.

---

## What's Already Built

| Component | Location | Status |
|---|---|---|
| Trigger types & context | `src/game/cutscene/CutsceneTrigger.ts` | Done |
| Trigger evaluation engine | `src/game/cutscene/TriggerEngine.ts` | Done + tested |
| GameEngine integration | `src/game/GameEngine.ts` | Done + tested |
| Overlay mode for CutsceneScene | `src/scenes/CutsceneScene.ts` | Done |
| Level trigger definitions | `src/game/levels/LevelDefinition.ts` | Done |
| Example triggers in levels | `src/game/levels/LevelData.ts` | Done |
| Example gameplay cutscenes | `src/game/cutscene/gameplayTriggers.ts` | Done |
| Cutscene registration | `src/scenes/BootScene.ts` | Done |

**Tests:** `TriggerEngine.test.ts` (11 tests) + `GameEngine.triggers.test.ts` (6 tests) — all passing.

---

## What's Missing: BattleScene Integration

This is the only remaining work. BattleScene must:
1. Evaluate triggers at the right gameplay moments.
2. Launch CutsceneScene as an overlay when a trigger matches.
3. Resume gameplay exactly where it left off after the cutscene ends.
4. Handle multiple triggers firing in sequence (queue system).

---

## Architecture Decisions (Already Locked In)

- **Overlay mode:** `CutsceneScene` runs via `scene.launch()` + `scene.pause()` on BattleScene. No camera fade. Semi-transparent black backdrop (alpha 0.6) so the grid is visible behind the dialog.
- **Pure trigger logic:** `TriggerEngine` has zero Phaser deps — 100% unit testable.
- **One-shot triggers:** Consumed triggers are tracked in a `Set<string>` so they never re-fire.
- **Resume semantics:** `inputEnabled = false` during cutscene, restored on completion. Game state is never destroyed.

---

## Remaining Task Breakdown

### Task 1: Cutscene Queue + Launch Helper in BattleScene

**File:** `src/scenes/BattleScene.ts`

BattleScene already has queue fields (`pendingCutscenes`, `isPlayingCutsceneQueue`, `queueCompletionCallback`) but no logic uses them.

**1.1 Add the core helper:**

```typescript
/**
 * Evaluates a trigger context. If a cutscene matches, queues it and begins
 * sequential playback. Returns true if playback was initiated.
 */
private playCutsceneForTrigger(ctx: TriggerContext, onComplete?: () => void): boolean {
  const trigger = this.engine.evaluateTrigger(ctx);
  if (!trigger) return false;

  this.pendingCutscenes.push(trigger.cutsceneId);
  if (!this.isPlayingCutsceneQueue) {
    this.processCutsceneQueue(onComplete);
  }
  return true;
}
```

**1.2 Add queue processor:**

```typescript
private processCutsceneQueue(onComplete?: () => void): void {
  if (this.pendingCutscenes.length === 0) {
    this.isPlayingCutsceneQueue = false;
    onComplete?.();
    return;
  }

  this.isPlayingCutsceneQueue = true;
  this.inputEnabled = false;

  const cutsceneId = this.pendingCutscenes.shift()!;

  this.scene.launch('CutsceneScene', {
    cutsceneId,
    overlay: true,
    onComplete: () => {
      this.scene.stop('CutsceneScene');
      this.processCutsceneQueue(onComplete);
    },
  });
}
```

**1.3 Add a shutdown/reset helper for scene restarts:**

```typescript
private clearCutsceneQueue(): void {
  this.pendingCutscenes = [];
  this.isPlayingCutsceneQueue = false;
  this.queueCompletionCallback = null;
}
```

Call `clearCutsceneQueue()` inside `create()` before loading a level (prevents stale queue data from a previous level).

---

### Task 2: Hook Triggers into Combat Flow

**File:** `src/scenes/BattleScene.ts`

All hooks follow the same pattern: evaluate the trigger, and if it fires, the callback continues the original flow. If no trigger fires, continue immediately.

**2.1 Level start** — `create()`, line 108

Replace unconditional `this.beginPlayerPhase()` with:

```typescript
const started = this.playCutsceneForTrigger(
  { eventType: 'on_level_start' },
  () => this.beginPlayerPhase()
);
if (!started) {
  this.beginPlayerPhase();
}
```

**2.2 Player initiates attack** — `handleMenuInput()`, line 1213

Replace `this.startBattleMode(unit, validTarget)` with:

```typescript
const started = this.playCutsceneForTrigger(
  { eventType: 'on_attack', attackerId: unit.id, defenderId: validTarget.id },
  () => {
    this.engine.markFirstCombat();
    this.startBattleMode(unit, validTarget);
  }
);
if (!started) {
  this.engine.markFirstCombat();
  this.startBattleMode(unit, validTarget);
}
```

**2.3 After combat resolves** — `finishBattleMode()`, line 1653

Before the win/loss check, evaluate death and kill triggers. Because `removeDeadUnits()` was already called in `endBattleMode()`, the dead units list must be captured earlier or queried from the engine before removal.

Option A (simplest): Capture dead unit IDs in `endBattleMode()` before `removeDeadUnits()`:

```typescript
// In endBattleMode(), before removeDeadUnits:
const deadUnitIds = this.engine.getAllUnits()
  .filter(u => !u.isAlive)
  .map(u => u.id);
// ... then pass deadUnitIds into afterFade or store as a field
```

Then in `finishBattleMode()`:

```typescript
// Check death/kill triggers for each dead unit
for (const unitId of this.recentDeadUnitIds) {
  this.playCutsceneForTrigger({ eventType: 'on_death', unitId });
}

// Also check on_kill with the attacker as killer
if (this.battleDisplayState?.attacker && this.recentDeadUnitIds.length > 0) {
  for (const victimId of this.recentDeadUnitIds) {
    this.playCutsceneForTrigger({
      eventType: 'on_kill',
      killerId: this.battleDisplayState.attacker.id,
      victimId,
    });
  }
}

// Clear the captured list
this.recentDeadUnitIds = [];

// Then continue to win/loss check
const objectives = this.engine.checkObjectives();
```

> **Important:** If `playCutsceneForTrigger` returns true here, the win/loss check must be deferred until the queue completes. Use a callback wrapper.

**Refactored finishBattleMode() after triggers:**

```typescript
const continueToObjectives = () => {
  const objectives = this.engine.checkObjectives();
  if (objectives.victory) { this.showVictoryScreen(); }
  else if (objectives.defeat) { this.showDefeatScreen(); }
  else { this.checkAutoEndTurn(); }
  this.battleDisplayState = null;
  this.combatResult = null;
  this.battleMenu.reset();
  this.pendingBattleCallback?.();
  this.pendingBattleCallback = null;
};

// Check triggers, then continue
const anyCutscene = this.checkPostCombatTriggers();
if (anyCutscene) {
  // Wait for queue to finish before objectives check
  const oldOnComplete = this.queueCompletionCallback;
  this.queueCompletionCallback = () => {
    oldOnComplete?.();
    continueToObjectives();
  };
} else {
  continueToObjectives();
}
```

**2.4 Enemy attack initiated** — `executeEnemyActions()`, line 677

Wrap `startBattleMode(action.actor, target, ...)`:

```typescript
const started = this.playCutsceneForTrigger(
  { eventType: 'on_attack', attackerId: action.actor.id, defenderId: target.id },
  () => {
    this.engine.markFirstCombat();
    this.startBattleMode(action.actor, target, () => processNext(index + 1));
  }
);
if (!started) {
  this.engine.markFirstCombat();
  this.startBattleMode(action.actor, target, () => processNext(index + 1));
}
```

**2.5 Turn start** — `beginPlayerPhase()`, line 1808

Wrap the banner logic:

```typescript
private beginPlayerPhase(): void {
  const started = this.playCutsceneForTrigger(
    {
      eventType: 'on_turn_start',
      faction: 'player',
      turnNumber: this.engine.turnManager.turnNumber,
    },
    () => this.continueBeginPlayerPhase()
  );
  if (started) return;
  this.continueBeginPlayerPhase();
}

private continueBeginPlayerPhase(): void {
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

**2.6 Turn end** — `triggerEndTurn()`, line 525

Evaluate `on_turn_end` before transitioning to enemy phase:

```typescript
// After showHazardDamage(report) and removeDeadUnits()
// Before the enemy phase branch:

const started = this.playCutsceneForTrigger(
  {
    eventType: 'on_turn_end',
    faction: 'player',
    turnNumber: this.engine.turnManager.turnNumber,
  },
  () => this.continueTriggerEndTurn()
);
if (started) return;
this.continueTriggerEndTurn();
```

Extract the rest of `triggerEndTurn()` after the turn-end trigger point into `continueTriggerEndTurn()`.

---

### Task 3: Handle Multiple Triggers in One Event

The queue system (Task 1.2) already handles sequential playback. The only extra work is in **Task 2.3** (post-combat deaths): multiple units can die in one combat, and each may have its own trigger. The queue naturally plays them one after another.

**Edge case:** If a death trigger fires AND a kill trigger fires for the same combat, both go into the queue. The queue processes them in insertion order (death first, then kill, or whichever order you push).

**Edge case:** If a turn-end trigger fires and there are pending cutscenes, the queue system holds the phase transition until all cutscenes finish.

---

### Task 4: Add `recentDeadUnitIds` Tracking

**File:** `src/scenes/BattleScene.ts`

Add a field:

```typescript
private recentDeadUnitIds: string[] = [];
```

In `endBattleMode()`, capture dead units **before** `removeDeadUnits()`:

```typescript
// Before: this.engine.removeDeadUnits();
this.recentDeadUnitIds = this.engine.getAllUnits()
  .filter(u => !u.isAlive)
  .map(u => u.id);

this.engine.removeDeadUnits();
```

Clear it in `create()` alongside the cutscene queue:

```typescript
this.recentDeadUnitIds = [];
```

---

### Task 5: Testing

**5.1 Unit tests for BattleScene trigger helpers**

Create `src/scenes/__tests__/BattleScene.triggers.test.ts` if feasible, or test indirectly via GameEngine integration tests.

Because BattleScene is a Phaser scene, pure unit testing is hard. Instead, verify via:

- `GameEngine.triggers.test.ts` — already covers trigger evaluation.
- Manual end-to-end test (see Task 5.2).

**5.2 Manual end-to-end verification checklist**

1. Start level-1. Confirm `on_level_start` cutscene plays as overlay (grid visible behind dialog).
2. Attack a bandit. Confirm `on_first_combat` cutscene plays before the battle mode overlay.
3. Kill the boss unit (`boss-bandit`). Confirm `on_kill` + `on_death` cutscenes play after combat, before victory screen.
4. Verify no camera fade during overlay cutscenes.
5. Verify input is disabled during cutscene and restored after.
6. Verify that after the cutscene, gameplay resumes exactly where it was (same turn, same unit selection state).

---

## Files Likely to Change (Summary)

| File | Change |
|---|---|
| `src/scenes/BattleScene.ts` | Add `playCutsceneForTrigger`, `processCutsceneQueue`, `clearCutsceneQueue`, `continueBeginPlayerPhase`, `continueTriggerEndTurn`, `recentDeadUnitIds` field. Hook 6 trigger points. |
| `src/game/GameEngine.ts` | Add `getRecentlyDiedUnits()` if you want to avoid BattleScene tracking dead IDs manually (optional refactor). |

---

## Open Questions / Decisions

1. **Boss encounter trigger:** The `on_boss_encounter` condition exists in `CutsceneTrigger.ts` but has no hook point yet. When should it fire — when the boss is selected as a target? When the boss is first visible on screen? Decide later when needed.
2. **HP threshold triggers:** Not yet defined in the trigger system. If needed later, add `on_hp_threshold` with `unitId` + `threshold` fields.
3. **Ally phase triggers:** The current hooks only cover player and enemy turns. Ally phase (`triggerEndTurn` → ally → player) has no turn-start/turn-end triggers. Add if needed.

---

## Deliverable Definition of Done

- [ ] `playCutsceneForTrigger` and `processCutsceneQueue` implemented in BattleScene.
- [ ] All 6 hook points wired (level start, player attack, enemy attack, post-combat death/kill, turn start, turn end).
- [ ] `recentDeadUnitIds` captured and cleared correctly.
- [ ] Overlay cutscenes render correctly (no fade, grid visible behind).
- [ ] Gameplay resumes after cutscene with correct state.
- [ ] All existing tests still pass (`npx vitest run`).
- [ ] Manual end-to-end checklist verified.
