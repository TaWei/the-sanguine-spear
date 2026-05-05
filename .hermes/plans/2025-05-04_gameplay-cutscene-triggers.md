# Gameplay-Triggered Cutscenes (Fire Emblem Style)

> **For Hermes:** Use `subagent-driven-development` or `bored-games-implementation-workflow` skill to implement this plan task-by-task. Prioritize TDD for all `src/game/` additions.

**Goal:** Enable cutscenes to trigger during gameplay based on conditions (e.g., attacking a specific enemy, first kill, unit death, turn start). The cutscene plays as an overlay on top of `BattleScene`, pausing gameplay. When finished, gameplay resumes exactly where it left off.

**Architecture:** Pure logic in `src/game/cutscene/` for trigger definitions and evaluation. Phaser scene overlay in `src/scenes/` for execution.

**Tech Stack:** TypeScript, Vitest, Phaser 3

**Prerequisite:** Phase 7 (cutscene system) complete.

---

## Current Context

The repo has:
- `CutsceneScene` — standalone Phaser scene with dialog box, portraits, typewriter text, backgrounds. Launches via `scene.start()` which destroys the previous scene.
- `CutscenePlayer` + `CutsceneRegistry` + `CutsceneTypes` — pure logic cutscene engine in `src/game/cutscene/`.
- `BattleScene` — tactical gameplay with unit movement, combat, menus, turn phases.
- `GameEngine` — pure logic facade for all game rules.
- `LevelDefinition` — level data (terrain, units). No trigger support yet.
- Scene transitions: `BootScene → MainMenuScene → BattleScene`.

**Missing:** No way to trigger a cutscene mid-combat and resume. No trigger definitions. No overlay launch mode.

---

## Proposed Approach

### 1. Overlay Launch Mode for CutsceneScene

`CutsceneScene` currently does `cameras.main.fadeIn(300)` on create and `cameras.main.fadeOut(300)` on finish, then calls `onComplete()`. For overlay mode:
- Add an `overlay` flag to `init(data)`.
- When `overlay=true`: do NOT fade the camera (the BattleScene camera stays visible behind), render with a semi-transparent backdrop so the grid is still dimly visible, and resume the paused scene on completion.

### 2. Trigger System (Pure Logic)

Add to `src/game/cutscene/`:
- `CutsceneTrigger` — condition + cutsceneId + one-shot flag.
- `TriggerCondition` — discriminated union of condition types.
- `TriggerContext` — snapshot of game state at the moment of evaluation.
- `CutsceneTriggerEngine` — evaluates all registered triggers against a context, returns the first matching cutsceneId (or all, depending on design), and marks one-shot triggers as consumed.

All trigger logic is 100% unit-testable with Vitest.

### 3. Level Definition Extension

Extend `LevelDefinition` with an optional `triggers: CutsceneTrigger[]` array. `LevelData.ts` factories populate them.

### 4. BattleScene Integration Points

Evaluate triggers at these exact moments in `BattleScene` flow:

1. **Level start** — after `create()` finishes, before `beginPlayerPhase()`.
2. **Player attacks enemy** — after target is selected, BEFORE `startBattleMode()` runs.
3. **Combat resolves** — after `endBattleMode()` / `finishBattleMode()`, before EXP popup or auto-end-turn.
4. **Enemy attacks player** — in `executeEnemyActions()`, before `startBattleMode()` for enemy attacks.
5. **Unit dies** — after `removeDeadUnits()`, before win/loss check.
6. **Turn start** — at the beginning of `beginPlayerPhase()` or enemy phase entry.
7. **Turn end** — after `triggerEndTurn()` resolves.

For each point: build a `TriggerContext`, call `triggerEngine.evaluate()`, if a cutscene is returned:
- Set `this.inputEnabled = false` (pause input).
- Pause all active tweens/timers (or just rely on `inputEnabled` guard).
- `this.scene.launch('CutsceneScene', { cutsceneId, overlay: true, onComplete: () => { this.scene.resume(); resumeGameplay(); } })`.
- `this.scene.pause()` pauses the update loop but the scene object stays alive.

### 5. Resume Semantics

After cutscene completes:
- `this.scene.resume()` resumes `BattleScene`.
- Restore `inputEnabled`.
- Continue from the exact next line of code (use callbacks / Promise wrappers if needed to make async flow readable).

---

## Task Breakdown

---

### Task 1: Cutscene Overlay Mode

**Objective:** Allow `CutsceneScene` to run as an overlay without destroying the underlying `BattleScene`.

**Files:**
- Modify: `src/scenes/CutsceneScene.ts`
- Modify: `src/game/cutscene/CutscenePlayer.ts` (add `reset()` if needed)

**Step 1.1: Add overlay mode flag and backdrop**

In `CutsceneScene`:
```typescript
interface CutsceneData {
  cutsceneId: string;
  overlay?: boolean;
  onComplete?: () => void;
}

private isOverlay = false;
private backdrop!: Phaser.GameObjects.Rectangle;
```

In `init(data)`:
```typescript
this.isOverlay = data.overlay ?? false;
```

In `create()`:
- If `isOverlay`: skip `cameras.main.fadeIn`. Create a semi-transparent black rectangle (`0x000000`, `alpha: 0.6`) at depth 0 as a backdrop so the battlefield is visible but dimmed.
- If NOT overlay: keep existing fade-in behavior (standalone mode).

**Step 1.2: Overlay-aware finish**

In `finishCutscene()`:
- If `isOverlay`: skip `cameras.main.fadeOut`. Destroy the backdrop. Call `onComplete()` immediately.
- If NOT overlay: keep existing fade-out + `onComplete()` behavior.

Add cleanup in `finishCutscene()` or a `shutdown()` method to destroy all created game objects (portraits, timers, etc.) to avoid leaks when launched multiple times as an overlay.

**Step 1.3: Test manually**
- From `MainMenuScene` or browser console, launch a test: `game.scene.getScene('BattleScene').scene.launch('CutsceneScene', { cutsceneId: 'prologue_intro', overlay: true, onComplete: () => console.log('done') })`.
- Verify the dialog renders on top of the grid.

---

### Task 2: Trigger Types & Engine (Pure Logic)

**Objective:** Define trigger conditions and build the evaluation engine.

**Files:**
- Create: `src/game/cutscene/CutsceneTrigger.ts`
- Create: `src/game/cutscene/TriggerEngine.ts`
- Create: `src/game/cutscene/__tests__/TriggerEngine.test.ts`

**Step 2.1: Define trigger types**

```typescript
// src/game/cutscene/CutsceneTrigger.ts

export type TriggerCondition =
  | { type: 'on_level_start' }
  | { type: 'on_attack'; attackerId?: string; defenderId?: string }
  | { type: 'on_kill'; killerId?: string; victimId?: string }
  | { type: 'on_death'; unitId?: string }
  | { type: 'on_turn_start'; faction?: 'player' | 'enemy' | 'ally'; turnNumber?: number }
  | { type: 'on_turn_end'; faction?: 'player' | 'enemy' | 'ally'; turnNumber?: number }
  | { type: 'on_first_combat' }
  | { type: 'on_boss_encounter'; bossId: string };

export interface CutsceneTrigger {
  id: string;               // unique within the level
  cutsceneId: string;       // maps to CutsceneRegistry
  condition: TriggerCondition;
  oneShot: boolean;         // true = remove after first trigger
}
```

**Step 2.2: Define trigger context**

```typescript
export interface TriggerContext {
  eventType: TriggerCondition['type'];
  attackerId?: string;
  defenderId?: string;
  killerId?: string;
  victimId?: string;
  unitId?: string;
  faction?: 'player' | 'enemy' | 'ally';
  turnNumber?: number;
  bossId?: string;
  firstCombat?: boolean;
}
```

**Step 2.3: Implement TriggerEngine**

```typescript
export class CutsceneTriggerEngine {
  private triggers: CutsceneTrigger[] = [];
  private consumed = new Set<string>();
  private firstCombatOccurred = false;

  register(triggers: CutsceneTrigger[]): void { this.triggers = triggers; }

  evaluate(ctx: TriggerContext): CutsceneTrigger | null {
    for (const t of this.triggers) {
      if (t.oneShot && this.consumed.has(t.id)) continue;
      if (this.matches(t.condition, ctx)) {
        if (t.oneShot) this.consumed.add(t.id);
        return t;
      }
    }
    return null;
  }

  markFirstCombat(): void { this.firstCombatOccurred = true; }

  private matches(cond: TriggerCondition, ctx: TriggerContext): boolean {
    if (cond.type !== ctx.eventType) return false;
    switch (cond.type) {
      case 'on_level_start': return true;
      case 'on_attack':
        return (!cond.attackerId || cond.attackerId === ctx.attackerId) &&
               (!cond.defenderId || cond.defenderId === ctx.defenderId);
      case 'on_kill':
        return (!cond.killerId || cond.killerId === ctx.killerId) &&
               (!cond.victimId || cond.victimId === ctx.victimId);
      case 'on_death':
        return !cond.unitId || cond.unitId === ctx.unitId;
      case 'on_turn_start':
      case 'on_turn_end':
        return (!cond.faction || cond.faction === ctx.faction) &&
               (!cond.turnNumber || cond.turnNumber === ctx.turnNumber);
      case 'on_first_combat':
        return !this.firstCombatOccurred;
      case 'on_boss_encounter':
        return cond.bossId === ctx.bossId;
    }
  }
}
```

**Step 2.4: Write tests**

Cover:
- `on_level_start` always matches.
- `on_attack` with specific attacker/defender IDs.
- `on_kill` with specific killer/victim.
- `on_turn_start` with faction and turnNumber filters.
- One-shot triggers are consumed after first match.
- No match returns null.
- `on_first_combat` matches only before `markFirstCombat()`.

---

### Task 3: Extend LevelDefinition with Triggers

**Objective:** Allow levels to declare their gameplay cutscene triggers.

**Files:**
- Modify: `src/game/levels/LevelDefinition.ts`
- Modify: `src/game/levels/LevelData.ts`

**Step 3.1: Add triggers to LevelDefinition**

```typescript
import { CutsceneTrigger } from '../cutscene/CutsceneTrigger';

export interface LevelDefinition {
  id: string;
  name: string;
  cols: number;
  rows: number;
  terrain: TerrainPlacement[];
  units: UnitPlacement[];
  triggers?: CutsceneTrigger[];  // NEW
}
```

**Step 3.2: Add triggers to existing levels**

In `LevelData.ts`, add an example trigger to `level-1` (or a new `level-1a` if you prefer):

```typescript
{
  id: 'level-1',
  name: 'The Eastern Approach',
  cols: 16,
  rows: 12,
  terrain: [ /* ... */ ],
  units: [ /* ... */ ],
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
      condition: { type: 'on_kill', victimId: 'boss-bandit' },
      oneShot: true,
    },
  ],
}
```

**Step 3.3: Register example cutscenes**

In `src/game/cutscene/examples.ts` (or a new file like `gameplayTriggers.ts`), add short cutscenes for the example triggers:

```typescript
export const firstBattleWarningCutscene: CutsceneScript = {
  id: 'first_battle_warning',
  title: 'First Blood',
  frames: [
    { type: 'enter', characterId: 'elara', position: 'left', expression: 'neutral' },
    { type: 'speak', speakerId: 'elara', text: 'Careful! These bandits are no pushovers.' },
    { type: 'end' },
  ],
};

export const bossDefeatedCutscene: CutsceneScript = {
  id: 'boss_defeated',
  title: 'Victory in Reach',
  frames: [
    { type: 'enter', characterId: 'rowan', position: 'left', expression: 'happy' },
    { type: 'speak', speakerId: 'rowan', text: 'The bandit leader has fallen! Finish the rest!' },
    { type: 'end' },
  ],
};
```

Register them in `CutsceneRegistry` at game bootstrap (or lazily in `BattleScene.create`).

---

### Task 4: Integrate TriggerEngine into GameEngine

**Objective:** GameEngine owns the trigger engine and exposes evaluation methods.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Create: `src/game/__tests__/GameEngine.triggers.test.ts`

**Step 4.1: Add TriggerEngine to GameEngine**

```typescript
import { CutsceneTriggerEngine } from './cutscene/TriggerEngine';
import { CutsceneTrigger, TriggerContext } from './cutscene/CutsceneTrigger';

export class GameEngine {
  // ... existing fields ...
  private triggerEngine = new CutsceneTriggerEngine();

  loadLevel(def: LevelDefinition): void {
    // ... existing reset logic ...
    this.triggerEngine.register(def.triggers ?? []);
    // ... rest ...
  }

  evaluateTrigger(ctx: TriggerContext): CutsceneTrigger | null {
    return this.triggerEngine.evaluate(ctx);
  }

  markFirstCombat(): void {
    this.triggerEngine.markFirstCombat();
  }
}
```

**Step 4.2: Write tests**

- Load a level with triggers, evaluate a matching context, expect the correct cutscene trigger back.
- Evaluate a non-matching context, expect null.
- Verify one-shot triggers are consumed (call twice, second returns null).

---

### Task 5: BattleScene Trigger Hooks

**Objective:** Insert trigger evaluation at the correct gameplay flow points.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 5.1: Helper method for launching overlay cutscenes**

```typescript
private tryTriggerCutscene(ctx: import('../game/cutscene/CutsceneTrigger').TriggerContext, onResume: () => void): boolean {
  const trigger = this.engine.evaluateTrigger(ctx);
  if (!trigger) {
    return false;
  }

  this.inputEnabled = false;
  this.scene.launch('CutsceneScene', {
    cutsceneId: trigger.cutsceneId,
    overlay: true,
    onComplete: () => {
      this.scene.stop('CutsceneScene');
      this.inputEnabled = true;
      onResume();
    },
  });
  return true;
}
```

**Step 5.2: Hook — Level start**

In `create()`, at the end (after `createUI()` and `battleMenu` init):
```typescript
const triggered = this.tryTriggerCutscene(
  { eventType: 'on_level_start' },
  () => { this.beginPlayerPhase(); }
);
if (!triggered) {
  this.beginPlayerPhase();
}
```
Remove the direct `this.beginPlayerPhase()` call that currently happens unconditionally.

**Step 5.3: Hook — Player attack initiated**

In `handleMenuInput()`, when `validTarget` is chosen (before `startBattleMode()`):

Change:
```typescript
this.startBattleMode(unit, validTarget);
```

To:
```typescript
this.inputEnabled = false;
const triggered = this.tryTriggerCutscene(
  { eventType: 'on_attack', attackerId: unit.id, defenderId: validTarget.id },
  () => {
    this.engine.markFirstCombat();
    this.startBattleMode(unit, validTarget);
  }
);
if (!triggered) {
  this.engine.markFirstCombat();
  this.startBattleMode(unit, validTarget);
}
```

**Step 5.4: Hook — After combat resolves**

In `finishBattleMode()`, before checking win/loss:

Change:
```typescript
const objectives = this.engine.checkObjectives();
if (objectives.victory) { ... }
```

To:
```typescript
const objectives = this.engine.checkObjectives();

// Check death triggers for any units that died this combat
const deadUnits = this.engine.getAllUnits().filter(u => !u.isAlive);
for (const dead of deadUnits) {
  const ctx: TriggerContext = {
    eventType: 'on_death',
    unitId: dead.id,
  };
  // ... evaluate and handle overlay (this gets complex if multiple death triggers fire)
}

if (objectives.victory) { ... }
```

**Important:** If multiple triggers could fire in sequence, we need a queue. See Task 6.

**Step 5.5: Hook — Enemy attack initiated**

In `executeEnemyActions()`, when `action.type === 'attack'`:

Same pattern as player attack — evaluate `on_attack` trigger with enemy as attacker, then proceed.

**Step 5.6: Hook — Turn start**

In `beginPlayerPhase()`, at the very top:
```typescript
const triggered = this.tryTriggerCutscene(
  { eventType: 'on_turn_start', faction: 'player', turnNumber: this.engine.turnManager.turnNumber },
  () => { this.continueBeginPlayerPhase(); }
);
if (triggered) return;
this.continueBeginPlayerPhase();
```

Refactor `beginPlayerPhase()` body into `continueBeginPlayerPhase()` so the banner logic still works.

**Step 5.7: Hook — Turn end**

In `triggerEndTurn()`, after `this.showHazardDamage(report)` and before enemy phase processing:

```typescript
const triggered = this.tryTriggerCutscene(
  { eventType: 'on_turn_end', faction: 'player', turnNumber: this.engine.turnManager.turnNumber },
  () => { this.continueTriggerEndTurn(); }
);
if (triggered) return;
this.continueTriggerEndTurn();
```

Refactor the rest of `triggerEndTurn()` into `continueTriggerEndTurn()`.

---

### Task 6: Cutscene Queue (Multiple Triggers)

**Objective:** Handle cases where multiple triggers match at the same evaluation point (e.g., two units die in the same combat).

**Files:**
- Create: `src/game/cutscene/CutsceneQueue.ts`
- Modify: `src/scenes/BattleScene.ts`

**Step 6.1: Simple queue design**

Instead of `tryTriggerCutscene` launching immediately, collect all matching triggers and play them sequentially.

```typescript
private pendingCutscenes: string[] = [];
private isPlayingCutsceneQueue = false;

private enqueueCutscene(cutsceneId: string): void {
  this.pendingCutscenes.push(cutsceneId);
  if (!this.isPlayingCutsceneQueue) {
    this.playNextCutsceneInQueue();
  }
}

private playNextCutsceneInQueue(): void {
  if (this.pendingCutscenes.length === 0) {
    this.isPlayingCutsceneQueue = false;
    return;
  }
  this.isPlayingCutsceneQueue = true;
  const id = this.pendingCutscenes.shift()!;
  this.inputEnabled = false;
  this.scene.launch('CutsceneScene', {
    cutsceneId: id,
    overlay: true,
    onComplete: () => {
      this.scene.stop('CutsceneScene');
      this.playNextCutsceneInQueue();
    },
  });
}
```

Add a `resumeCallback` per queue batch so we know what to do when the queue empties.

```typescript
private queueCompletionCallback: (() => void) | null = null;

private flushCutsceneQueue(onComplete: () => void): void {
  if (this.pendingCutscenes.length === 0) {
    onComplete();
    return;
  }
  this.queueCompletionCallback = onComplete;
  this.playNextCutsceneInQueue();
}

// In playNextCutsceneInQueue, when queue empties:
if (this.pendingCutscenes.length === 0) {
  this.isPlayingCutsceneQueue = false;
  this.inputEnabled = true;
  this.queueCompletionCallback?.();
  this.queueCompletionCallback = null;
}
```

**Step 6.2: Apply queue to death triggers**

In `finishBattleMode()`:
```typescript
const deadIds = this.engine.getAllUnits().filter(u => !u.isAlive).map(u => u.id);
for (const id of deadIds) {
  const trigger = this.engine.evaluateTrigger({ eventType: 'on_death', unitId: id });
  if (trigger) this.enqueueCutscene(trigger.cutsceneId);
}

this.flushCutsceneQueue(() => {
  // Continue with win/loss check
  const objectives = this.engine.checkObjectives();
  ...
});
```

**Step 6.3: Refactor all hooks to use the queue pattern**

For each hook, instead of `tryTriggerCutscene` with an immediate callback, use:
1. Evaluate trigger(s).
2. `enqueueCutscene()` for each match.
3. `flushCutsceneQueue(() => { /* resume gameplay */ })`.
4. If queue empty, the callback fires immediately (no pause).

---

### Task 7: GameState Freeze During Cutscene

**Objective:** Ensure game state does not mutate while cutscene plays.

**Step 7.1: Input guard**

`BattleScene` already has `this.inputEnabled`. Setting it to `false` before launching and `true` after resuming is sufficient to block clicks.

**Step 7.2: Timer/tween guard**

Phaser's `scene.pause()` stops the update loop but does NOT pause active tweens/timers by default. Options:
1. Use `this.scene.pause()` + `this.scene.resume()` — the paused scene's update loop stops, which stops most custom logic. Tweens created by the paused scene continue running unless explicitly paused.
2. Better: Don't call `this.scene.pause()`. Just set `inputEnabled = false` and rely on the fact that no game logic runs between the cutscene launch and its callback. The overlay cutscene scene receives input, BattleScene does not.

**Recommendation:** Do NOT pause the scene. Just disable input. This avoids tween desync issues. The cutscene overlay captures all input. BattleScene's update loop continues but `inputEnabled=false` blocks interactions. No game logic runs mid-cutscene because all flow is callback-driven.

If future features add real-time elements (e.g., hazard tick animations), those may need explicit pausing. Document this in code comments.

---

### Task 8: Register Gameplay Cutscenes

**Objective:** Ensure example cutscenes are registered before BattleScene needs them.

**Files:**
- Modify: `src/scenes/BootScene.ts` or `src/main.ts`

**Step 8.1: Register at boot**

In `BootScene.create()` or `main.ts`:
```typescript
import { registerCutscene } from './game/cutscene';
import { prologueCutscene, firstBattleWarningCutscene, bossDefeatedCutscene } from './game/cutscene/examples';

registerCutscene(prologueCutscene);
registerCutscene(firstBattleWarningCutscene);
registerCutscene(bossDefeatedCutscene);
```

---

### Task 9: Manual Integration Test

**Objective:** Walk through a full gameplay flow and verify cutscenes trigger correctly.

**Test steps:**
1. Start dev server (`npm run dev`).
2. Start Level 1.
3. **Expected:** If level-1 has `on_level_start` trigger, dialog overlay appears immediately over the grid.
4. Click through cutscene.
5. **Expected:** Turn banner appears, gameplay resumes.
6. Move a player unit adjacent to an enemy and attack.
7. **Expected:** If `on_first_combat` trigger exists, dialog overlay appears BEFORE the VS screen.
8. Click through cutscene.
9. **Expected:** VS screen appears, combat animation plays normally.
10. Kill a boss unit.
11. **Expected:** If `on_kill` trigger exists for that boss, dialog overlay appears AFTER combat resolves but BEFORE victory screen.
12. Click through cutscene.
13. **Expected:** Victory screen appears.

---

### Task 10: Edge Cases & Polish

**10.1: Cutscene already playing**
If a trigger fires while a cutscene is already active (shouldn't happen with queue, but guard anyway):
```typescript
if (this.isPlayingCutsceneQueue) {
  // Just enqueue, don't double-launch
}
```

**10.2: Missing cutscene ID**
If `getCutscene(id)` returns undefined, log a warning and skip to the next queue item.

**10.3: Save/load compatibility**
If a save/load system is added later, `CutsceneTriggerEngine.consumed` must be serialized/deserialized alongside game state. Document this.

**10.4: Skip cutscene button**
Add a small "Skip" button in the top-right corner of `CutsceneScene` when in overlay mode (or always). Useful for repeat playthroughs. This can be a fast-follow, not required for MVP.

---

## Files Likely to Change

| File | Action |
|------|--------|
| `src/scenes/CutsceneScene.ts` | Add overlay mode, backdrop, skip fade when overlay |
| `src/game/cutscene/CutsceneTrigger.ts` | **Create** — trigger types and context |
| `src/game/cutscene/TriggerEngine.ts` | **Create** — evaluation engine |
| `src/game/cutscene/CutsceneQueue.ts` | **Create** — sequential queue (or inline in BattleScene) |
| `src/game/cutscene/examples.ts` | Add gameplay trigger example cutscenes |
| `src/game/cutscene/index.ts` | Export new types |
| `src/game/levels/LevelDefinition.ts` | Add `triggers?: CutsceneTrigger[]` |
| `src/game/levels/LevelData.ts` | Add trigger examples to level-1 |
| `src/game/GameEngine.ts` | Wire in TriggerEngine |
| `src/scenes/BattleScene.ts` | Add trigger hooks at all integration points |
| `src/scenes/BootScene.ts` | Register new cutscenes |
| `src/game/cutscene/__tests__/TriggerEngine.test.ts` | **Create** — TDD for trigger logic |
| `src/game/__tests__/GameEngine.triggers.test.ts` | **Create** — integration with GameEngine |

---

## Tests / Validation

### Unit Tests (Vitest)

1. `TriggerEngine.evaluate` — all condition types match correctly.
2. `TriggerEngine.evaluate` — non-matching conditions return null.
3. `TriggerEngine` — one-shot triggers consumed after first match.
4. `TriggerEngine` — `on_first_combat` matches only before `markFirstCombat()`.
5. `TriggerEngine` — multiple triggers registered, only first match returned.
6. `GameEngine` — `loadLevel` populates trigger engine.
7. `GameEngine` — `evaluateTrigger` delegates correctly.

### Manual Tests (Browser)

1. Overlay cutscene renders on top of grid without destroying BattleScene.
2. Clicking through overlay cutscene restores input.
3. `on_level_start` triggers at level begin.
4. `on_attack` triggers before VS screen.
5. `on_kill` triggers after combat, before victory/defeat.
6. `on_turn_start` triggers before turn banner.
7. Multiple death triggers in one combat play sequentially.

---

## Risks, Tradeoffs, and Open Questions

| Risk | Mitigation |
|------|------------|
| Scene pause/resume causes tween desync | Do NOT pause scene; only disable input |
| Multiple triggers fire at once, overlapping | Use sequential queue (Task 6) |
| Callback pyramid in BattleScene gets deep | Extract queue helper; consider async/await wrapper if it gets unwieldy |
| CutsceneScene leaks game objects across overlay launches | Add robust cleanup in `shutdown()` or `finishCutscene()` |
| Fire emblem actually shows cutscenes *during* attack animation (critical hits, boss intros) | Out of scope for MVP. Future enhancement: `BattleAnimationScene` overlay that plays short animated sequences |
| Save/load doesn't remember consumed triggers | Document; add serialization when save system exists |

**Open Questions:**
1. Should `on_attack` trigger before the attack animation (current plan) or during/after? Fire Emblem typically shows boss introductions BEFORE combat. For MVP, before is correct.
2. Should triggers support `weight` / priority for ordering? Not needed for MVP; array order is sufficient.
3. Should the backdrop show the battlefield or a black screen? Semi-transparent dim (alpha 0.6) over battlefield is more Fire Emblem-like for in-battle dialog.

---

## Success Criteria

- [ ] A cutscene can be defined in a level's `triggers` array and plays automatically at the specified condition.
- [ ] Gameplay pauses during the cutscene (input disabled, no state changes).
- [ ] Gameplay resumes exactly where it left off after the cutscene ends.
- [ ] Multiple triggers can fire from the same event and play sequentially.
- [ ] All new `src/game/` code has Vitest unit tests.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
