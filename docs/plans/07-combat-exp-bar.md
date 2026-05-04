# Combat EXP Bar Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Show an animated experience bar popup after battle mode completes. Kills award strong EXP; non-kills award menial EXP. Level-ups are announced with stat gains.

**Architecture:** Pure logic (game engine) computes EXP amounts and applies progression. Phaser rendering (scene) displays the popup. The popup blocks input until dismissed, then normal cleanup continues.

**Tech Stack:** Phaser 3, TypeScript, existing `ProgressionEngine` / `LevelUpEngine` / `CombatEngine`.

---

## Design Decisions

- **Only the attacker (initiator) earns EXP.** This matches the user's request and keeps the first iteration simple.
- **EXP values (Fire Emblem GBA-style, scaled by level difference):**
  - **Hit EXP** = `floor((31 + enemyLv – attackerLv) / 3)`, minimum 1
  - **Kill bonus** = `max(0, (enemyLv – attackerLv) × 3 + 20)`
  - **Total kill EXP** = hit EXP + kill bonus
  - **Miss** = 0 EXP
  - Example: Lv1 vs Lv1 kill → ~30 EXP. Lv10 vs Lv1 kill → ~7 EXP. Lv1 vs Lv5 kill → ~43 EXP.
- **Popup timing:** Shown inside `endBattleMode()` after the battle overlay fades out but before dead-unit removal / objective checks. This ensures the player sees the result of the combat they just watched.
- **Level-up:** If `ProgressionResult.leveledUp === true`, the popup shows "LEVEL UP!" and lists the stat increases from `LevelUpResult.increases`.
- **Input blocking:** `inputEnabled` is set to `false` while the popup is visible. It is restored after the popup is dismissed.

---

### Task 1: Extend `CombatResult` with EXP fields

**Objective:** Allow the combat engine to communicate how much EXP the attacker earned.

**Files:**
- Modify: `src/game/combat/Engine.ts`

**Step 1: Add `expAward` to `CombatResult`**

```typescript
export interface CombatResult {
  log: CombatLogEntry[];
  attackerDied: boolean;
  defenderDied: boolean;
  expAward: number; // NEW — EXP granted to attacker
}
```

**Step 2: Update `resolveCombat` return sites to include `expAward: 0`**

There are three `return` statements inside `resolveCombat`. Add `expAward: 0` to each:

```typescript
return { log, attackerDied, defenderDied: true, expAward: 0 };
return { log, attackerDied: !attacker.isAlive, defenderDied: !defender.isAlive, expAward: 0 };
return { log, attackerDied: false, defenderDied: false, expAward: 0 };
```

**Step 3: Commit**

```bash
git add src/game/combat/Engine.ts
git commit -m "feat(combat): add expAward field to CombatResult"
```

---

### Task 2: Write failing test for EXP calculation

**Objective:** Ensure EXP is calculated correctly based on attacker/defender levels before wiring it into the engine.

**Files:**
- Create: `src/game/combat/__tests__/CombatExp.test.ts`

**Step 1: Create the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { Grid } from '../../map/Grid';
import { Unit } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { CombatEngine } from '../Engine';
import { WEAPON_DB } from '../Weapons';

function makeUnit(id: string, level: number, hp: number, str: number, spd: number) {
  return new Unit(id, id, 'player', 'lord', createStats({ hp, maxHp: hp, str, spd, def: 0, res: 0, skl: 10, luk: 10, mov: 5 }), 0, 0, { level });
}

describe('combat EXP calculation', () => {
  it('awards ~30 EXP for a same-level kill (Lv1 vs Lv1)', () => {
    const grid = new Grid(3, 3);
    const attacker = makeUnit('att', 1, 20, 20, 10); // high str = kill
    const defender = makeUnit('def', 1, 1, 0, 0);   // 1 hp = dies instantly
    grid.placeUnit(attacker, 0, 0);
    grid.placeUnit(defender, 1, 0);

    const engine = new CombatEngine(grid);
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Sword']);

    expect(result.defenderDied).toBe(true);
    expect(result.expAward).toBe(30); // floor(31/3)=10 hit + max(0,0+20)=20 kill = 30
  });

  it('awards more EXP when killing a higher-level enemy', () => {
    const grid = new Grid(3, 3);
    const attacker = makeUnit('att', 1, 20, 20, 10);
    const defender = makeUnit('def', 5, 1, 0, 0); // Lv5, dies instantly
    grid.placeUnit(attacker, 0, 0);
    grid.placeUnit(defender, 1, 0);

    const engine = new CombatEngine(grid);
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Sword']);

    expect(result.defenderDied).toBe(true);
    expect(result.expAward).toBe(43); // floor(35/3)=11 hit + max(0,12+20)=32 kill = 43
  });

  it('awards less EXP when a high-level unit kills a weak enemy', () => {
    const grid = new Grid(3, 3);
    const attacker = makeUnit('att', 10, 20, 20, 10);
    const defender = makeUnit('def', 1, 1, 0, 0);
    grid.placeUnit(attacker, 0, 0);
    grid.placeUnit(defender, 1, 0);

    const engine = new CombatEngine(grid);
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Sword']);

    expect(result.defenderDied).toBe(true);
    expect(result.expAward).toBe(7); // floor(22/3)=7 hit + max(0,-27+20)=0 kill = 7
  });

  it('awards hit EXP for a hit without kill', () => {
    const grid = new Grid(3, 3);
    const attacker = makeUnit('att', 1, 20, 5, 10);
    const defender = makeUnit('def', 1, 20, 0, 0); // enough hp to survive
    grid.placeUnit(attacker, 0, 0);
    grid.placeUnit(defender, 1, 0);

    const engine = new CombatEngine(grid);
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Sword']);

    expect(result.defenderDied).toBe(false);
    expect(result.expAward).toBe(10); // floor(31/3)=10 hit, no kill
  });

  it('awards 0 EXP for a miss', () => {
    const grid = new Grid(3, 3);
    const attacker = makeUnit('att', 1, 20, 20, 10);
    const defender = makeUnit('def', 1, 20, 0, 0);
    grid.placeUnit(attacker, 0, 0);
    grid.placeUnit(defender, 1, 0);

    const engine = new CombatEngine(grid);
    const alwaysMiss = () => 1.0;
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Sword'], alwaysMiss);

    expect(result.log[0].hit).toBe(false);
    expect(result.expAward).toBe(0);
  });
});
```

**Step 2: Run the test — expect failures**

```bash
npx vitest run src/game/combat/__tests__/CombatExp.test.ts
```

Expected: FAIL — `expAward` is always 0, kill test expects 40, hit test expects 10.

**Step 3: Commit**

```bash
git add src/game/combat/__tests__/CombatExp.test.ts
git commit -m "test(combat): add failing tests for combat EXP calculation"
```

---

### Task 3: Implement EXP calculation in `CombatEngine`

**Objective:** Compute `expAward` based on attacker/defender level difference, hit/miss, and kill.

**Files:**
- Modify: `src/game/combat/Engine.ts`

**Step 1: Add `calcCombatExp` helper at top of file**

```typescript
function calcCombatExp(attackerLevel: number, defenderLevel: number, hit: boolean, killed: boolean): number {
  if (!hit) return 0;

  const levelDiff = defenderLevel - attackerLevel;
  const hitExp = Math.max(1, Math.floor((31 + levelDiff) / 3));

  if (!killed) {
    return hitExp;
  }

  const killBonus = Math.max(0, levelDiff * 3 + 20);
  return hitExp + killBonus;
}
```

**Step 2: Compute `expAward` in `resolveCombat`**

Replace the three return statements with logic that computes `expAward`:

```typescript
// After the first attack resolves
const entry = this.resolveAttack(attacker, defender, attackerWeapon, defenderWeapon, rng);
log.push(entry);
let expAward = calcCombatExp(attacker.level, defender.level, entry.hit, !defender.isAlive);

if (!defender.isAlive) {
  return { log, attackerDied, defenderDied: true, expAward };
}

// Defender counterattack if in range
if (this.isInRange(defender.gridX, defender.gridY, attacker.gridX, attacker.gridY, defenderWeapon)) {
  const counter = this.resolveAttack(defender, attacker, defenderWeapon, attackerWeapon, rng);
  log.push(counter);
  if (!attacker.isAlive) {
    expAward = 0; // attacker died, no EXP
  }
  return { log, attackerDied: !attacker.isAlive, defenderDied: !defender.isAlive, expAward };
}

return { log, attackerDied: false, defenderDied: false, expAward };
```

**Step 3: Run tests — expect pass**

```bash
npx vitest run src/game/combat/__tests__/CombatExp.test.ts
```

Expected: 5 passed.

**Step 4: Commit**

```bash
git add src/game/combat/Engine.ts
git commit -m "feat(combat): calculate level-scaled expAward in CombatEngine"
```

---

### Task 4: Wire EXP award through `GameEngine`

**Objective:** `GameEngine.resolvePlayerCombat` must return the `expAward` from the underlying `CombatEngine`. Also add a convenience method to apply the EXP and return the `ProgressionResult`.

**Files:**
- Modify: `src/game/GameEngine.ts`

**Step 1: Import `ProgressionResult`**

```typescript
import { ProgressionResult } from './progression/ProgressionEngine';
```

**Step 2: Add `applyCombatExp` method**

```typescript
applyCombatExp(attacker: Unit, combatResult: import('./combat/Engine').CombatResult): ProgressionResult | null {
  if (!attacker.isAlive || combatResult.expAward <= 0) {
    return null;
  }
  return this.progressionEngine.grantExp(attacker, combatResult.expAward);
}
```

**Step 3: Update existing `awardCombatExp` to delegate (or remove it)**

The old `awardCombatExp` is unused. Replace its body to delegate:

```typescript
awardCombatExp(unit: Unit, _damageDealt: number, killed: boolean): ProgressionResult {
  const amount = killed ? 40 : 10;
  return this.progressionEngine.grantExp(unit, amount);
}
```

Or simply leave it alone — it is not called anywhere. The new `applyCombatExp` is what `BattleScene` will use.

**Step 4: Run tests**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
npx vitest run src/game/combat/__tests__/
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts
git commit -m "feat(engine): add applyCombatExp convenience method"
```

---

### Task 5: Add `ExpPopup` pure-logic state class

**Objective:** Encapsulate the data needed to render an EXP popup. No Phaser imports.

**Files:**
- Create: `src/game/ui/ExpPopup.ts`

**Step 1: Create the file**

```typescript
import { ProgressionResult } from '../progression/ProgressionEngine';

export interface ExpPopupData {
  unitName: string;
  unitLevel: number;
  oldExp: number;
  newExp: number;
  expGained: number;
  leveledUp: boolean;
  increases?: string[];
}

export class ExpPopup {
  private data: ExpPopupData | null = null;
  private visible = false;

  show(data: ExpPopupData): void {
    this.data = data;
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  get popupData(): ExpPopupData | null {
    return this.data;
  }
}
```

**Step 2: Export from `src/game/ui/index.ts` if it exists; otherwise ensure `BattleScene` can import it**

Check if `src/game/ui/index.ts` exists. If yes, add:

```typescript
export { ExpPopup, ExpPopupData } from './ExpPopup';
```

**Step 3: Commit**

```bash
git add src/game/ui/ExpPopup.ts
git commit -m "feat(ui): add ExpPopup state class"
```

---

### Task 6: Render EXP popup in `BattleScene`

**Objective:** After the battle overlay fades out, display the EXP popup. Animate the bar filling from `oldExp` to `newExp`. If a level-up occurred, show a "LEVEL UP!" banner with stat increases. Dismiss on click or after a short auto-delay.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Add `ExpPopup` import**

```typescript
import { ExpPopup, ExpPopupData } from '../game/ui/ExpPopup';
```

**Step 2: Add scene fields**

```typescript
private expPopup: ExpPopup = new ExpPopup();
private expPopupContainer: Phaser.GameObjects.Container | null = null;
```

**Step 3: Create `showExpPopup` method**

```typescript
private showExpPopup(data: ExpPopupData, onDismiss: () => void): void {
  this.inputEnabled = false;
  this.expPopup.show(data);

  const container = this.add.container(0, 0);
  container.setDepth(100);

  const cx = this.cameras.main.width / 2;
  const cy = this.cameras.main.height / 2;

  // Semi-transparent backdrop
  const bg = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.6);
  container.add(bg);

  // Panel
  const panel = this.add.container(cx, cy);
  const box = this.add.rectangle(0, 0, 320, 180, 0x2c3e50, 0.95);
  box.setStrokeStyle(2, 0xf1c40f);
  panel.add(box);

  // Unit name
  const nameText = this.add.text(0, -60, data.unitName, {
    fontSize: '20px',
    color: '#ecf0f1',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  panel.add(nameText);

  // Level label
  const levelText = this.add.text(0, -38, `Lv. ${String(data.unitLevel)}`, {
    fontSize: '14px',
    color: '#bdc3c7',
  }).setOrigin(0.5);
  panel.add(levelText);

  // EXP gained
  const gainedText = this.add.text(0, -16, `+${String(data.expGained)} EXP`, {
    fontSize: '18px',
    color: '#f1c40f',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  panel.add(gainedText);

  // EXP bar background
  const barBg = this.add.rectangle(0, 12, 240, 16, 0x000000);
  panel.add(barBg);

  // EXP bar fill (animated later)
  const oldRatio = data.oldExp / 100;
  const newRatio = data.newExp / 100;
  const barFill = this.add.rectangle(-120 + (240 * oldRatio) / 2, 12, 240 * oldRatio, 16, 0x3498db);
  barFill.setName('expFill');
  panel.add(barFill);

  // EXP text
  const expText = this.add.text(0, 36, `${String(data.oldExp)} / 100`, {
    fontSize: '12px',
    color: '#bdc3c7',
  }).setOrigin(0.5);
  expText.setName('expText');
  panel.add(expText);

  // Level-up banner (hidden initially)
  let levelUpContainer: Phaser.GameObjects.Container | null = null;
  if (data.leveledUp) {
    levelUpContainer = this.add.container(0, 66);
    const luBg = this.add.rectangle(0, 0, 280, 40, 0x000000, 0.8);
    levelUpContainer.add(luBg);

    const luTitle = this.add.text(0, -10, 'LEVEL UP!', {
      fontSize: '16px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    levelUpContainer.add(luTitle);

    if (data.increases && data.increases.length > 0) {
      const luStats = this.add.text(0, 8, data.increases.map((s) => `+${s}`).join('  '), {
        fontSize: '12px',
        color: '#2ecc71',
      }).setOrigin(0.5);
      levelUpContainer.add(luStats);
    }

    levelUpContainer.setAlpha(0);
    panel.add(levelUpContainer);
  }

  container.add(panel);
  this.expPopupContainer = container;

  // Animate bar fill
  this.tweens.add({
    targets: barFill,
    width: 240 * newRatio,
    x: -120 + (240 * newRatio) / 2,
    duration: 800,
    ease: 'Power2',
    onUpdate: () => {
      // Approximate current EXP value during tween
      const progress = this.tweens.getTweensOf(barFill)[0]?.progress ?? 1;
      const currentExp = Math.round(data.oldExp + (data.newExp - data.oldExp) * progress);
      expText.setText(`${String(currentExp)} / 100`);
    },
    onComplete: () => {
      expText.setText(`${String(data.newExp)} / 100`);
      if (levelUpContainer) {
        this.tweens.add({
          targets: levelUpContainer,
          alpha: 1,
          duration: 300,
        });
      }
      // Auto-dismiss after 1.5s, or allow click to dismiss sooner
      this.time.delayedCall(1500, () => {
        this.dismissExpPopup(onDismiss);
      });
    },
  });

  // Allow click to dismiss immediately
  bg.setInteractive({ useHandCursor: true });
  bg.once('pointerdown', () => {
    this.dismissExpPopup(onDismiss);
  });
}

private dismissExpPopup(onDismiss: () => void): void {
  if (!this.expPopupContainer) return;
  this.tweens.add({
    targets: this.expPopupContainer,
    alpha: 0,
    duration: 250,
    onComplete: () => {
      this.expPopupContainer?.destroy();
      this.expPopupContainer = null;
      this.expPopup.hide();
      this.inputEnabled = true;
      onDismiss();
    },
  });
}
```

**Step 4: Modify `endBattleMode` to show the popup**

Replace the `afterFade` callback in `endBattleMode` with a version that shows the EXP popup before continuing:

```typescript
private endBattleMode(): void {
  this.inBattleMode = false;

  const afterFade = () => {
    this.battleOverlay?.destroy();
    this.battleOverlay = null;

    // --- EXP POPUP START ---
    const attacker = this.battleDisplayState?.attacker;
    const combatResult = this.battleDisplayState
      ? { expAward: 0, log: this.battleDisplayState['log'] }
      : null;

    // Re-run combat resolution to get the official result with expAward
    // (or store it from startBattleMode). Better: store it.
    // See Step 5 for storing the result.
    // --- EXP POPUP END ---

    this.engine.removeDeadUnits();
    this.syncUnitSprites();
    // ... rest of existing cleanup
  };
  // ... existing tween
}
```

Actually, we need to store the `CombatResult` from `startBattleMode` so `endBattleMode` can read `expAward`. Let's do that.

**Step 5: Store `CombatResult` in `startBattleMode`**

Add a field:

```typescript
private lastCombatResult: import('../game/combat/Engine').CombatResult | null = null;
```

In `startBattleMode`, store the result:

```typescript
const result = this.engine.resolvePlayerCombat(attacker, defender);
this.lastCombatResult = result;
this.battleDisplayState = new BattleDisplayState(attacker, defender, result.log);
```

**Step 6: Rewrite `endBattleMode` to show popup**

```typescript
private endBattleMode(): void {
  this.inBattleMode = false;

  const doCleanup = () => {
    this.engine.removeDeadUnits();
    this.syncUnitSprites();

    if (this.battleDisplayState?.attacker.isPlayer) {
      this.battleDisplayState.attacker.hasActed = true;
    }

    const objectives = this.engine.checkObjectives();
    if (objectives.victory) {
      this.showVictoryScreen();
    } else if (objectives.defeat) {
      this.showDefeatScreen();
    } else {
      this.checkAutoEndTurn();
    }

    this.battleDisplayState = null;
    this.battleMenu.reset();
    this.pendingBattleCallback?.();
    this.pendingBattleCallback = null;
  };

  const afterFade = () => {
    this.battleOverlay?.destroy();
    this.battleOverlay = null;

    const attacker = this.battleDisplayState?.attacker;
    const result = this.lastCombatResult;
    this.lastCombatResult = null;

    if (attacker && attacker.isAlive && result && result.expAward > 0) {
      const progression = this.engine.applyCombatExp(attacker, result);
      if (progression) {
        const popupData: ExpPopupData = {
          unitName: attacker.name,
          unitLevel: attacker.level,
          oldExp: progression.expGained > 0 ? attacker.exp - progression.expGained : attacker.exp,
          newExp: attacker.exp,
          expGained: progression.expGained,
          leveledUp: progression.leveledUp,
          increases: progression.levelUpResult?.increases,
        };
        this.showExpPopup(popupData, doCleanup);
        return;
      }
    }

    doCleanup();
  };

  if (this.battleOverlay) {
    this.tweens.add({
      targets: this.battleOverlay,
      alpha: 0,
      duration: 400,
      onComplete: afterFade,
    });
  } else {
    afterFade();
  }
}
```

**Note:** The `oldExp` calculation needs care — `attacker.exp` is already the new value after `applyCombatExp`. So `oldExp = attacker.exp - progression.expGained`. This is correct because `gainExp` caps at 99, so if there was overflow into a level-up, `expGained` might exceed what was actually added to the bar. However, `ProgressionResult.expGained` stores the raw amount granted (e.g., 40), while `attacker.exp` after a level-up resets to 0 (plus overflow). So `oldExp = attacker.exp - progression.expGained` could be negative after a level-up.

A safer approach: capture `oldExp` **before** calling `applyCombatExp`.

Update `afterFade`:

```typescript
    if (attacker && attacker.isAlive && result && result.expAward > 0) {
      const oldExp = attacker.exp;
      const oldLevel = attacker.level;
      const progression = this.engine.applyCombatExp(attacker, result);
      if (progression) {
        const popupData: ExpPopupData = {
          unitName: attacker.name,
          unitLevel: oldLevel,
          oldExp,
          newExp: attacker.exp,
          expGained: progression.expGained,
          leveledUp: progression.leveledUp,
          increases: progression.levelUpResult?.increases,
        };
        this.showExpPopup(popupData, doCleanup);
        return;
      }
    }
```

This is correct because after `applyCombatExp`:
- If no level-up: `attacker.exp === oldExp + expGained` (capped at 99)
- If level-up: `attacker.exp === overflow` (0 if no overflow)

**Step 7: Run tests**

```bash
npx vitest run
```

Expected: all pass (ignore tsc lint noise from ES5 target — see memory note).

**Step 8: Commit**

```bash
git add src/scenes/BattleScene.ts src/game/ui/ExpPopup.ts
git commit -m "feat(scene): render EXP popup after combat"
```

---

### Task 7: Handle enemy-phase combat EXP

**Objective:** Enemy units that initiate combat also earn EXP. The popup should only show for player-initiated combat (enemies don't need a popup the player watches). Actually, the user specifically said "whenever a unit attacks another" — but showing a popup for every enemy attack would be tedious. For this iteration, **only show the popup for player-initiated combat** (the attacker is a player unit). Enemy EXP can be silently awarded.

**Files:**
- Modify: `src/scenes/BattleScene.ts` (in `executeEnemyActions`)

**Step 1: Award silent EXP in `executeEnemyActions`**

Find the `'attack'` branch in `executeEnemyActions`:

```typescript
} else if (
  action.type === 'attack' &&
  action.targetX !== undefined &&
  action.targetY !== undefined
) {
  const target = this.engine.getUnit(action.targetX, action.targetY);
  if (target?.isAlive) {
    this.startBattleMode(action.actor, target, () => {
      // Award silent EXP to enemy
      const result = this.lastCombatResult;
      if (result && result.expAward > 0 && action.actor.isAlive) {
        this.engine.applyCombatExp(action.actor, result);
      }
      processNext(index + 1);
    });
  } else {
    processNext(index + 1);
  }
}
```

Wait — `startBattleMode` currently stores the combat result. But for enemy actions, `endBattleMode` would try to show the popup. We need to suppress the popup when the attacker is not a player unit.

**Step 2: Suppress popup for non-player attackers**

In `endBattleMode`, change the condition:

```typescript
    if (attacker && attacker.isAlive && attacker.isPlayer && result && result.expAward > 0) {
```

This way enemy EXP is silently awarded (via the `applyCombatExp` call in the callback above), but no popup shows.

Actually, looking more carefully at `executeEnemyActions`, the `startBattleMode` call already goes through `endBattleMode` which would call `doCleanup`. If we add silent EXP awarding in the callback **after** `startBattleMode`, the combat result is still stored in `lastCombatResult`. But `endBattleMode` will have already cleared `battleDisplayState` and `lastCombatResult` by the time the callback runs.

A cleaner approach: don't award EXP in the callback. Instead, make `endBattleMode` award EXP silently for non-player attackers. Modify `endBattleMode`:

```typescript
    if (attacker && attacker.isAlive && result && result.expAward > 0) {
      const oldExp = attacker.exp;
      const oldLevel = attacker.level;
      const progression = this.engine.applyCombatExp(attacker, result);
      if (progression && attacker.isPlayer) {
        const popupData: ExpPopupData = { ... };
        this.showExpPopup(popupData, doCleanup);
        return;
      }
      // Non-player attackers get silent EXP — doCleanup runs normally
    }
```

This is much cleaner. Remove the extra EXP call from `executeEnemyActions`.

**Step 3: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(scene): silently award enemy combat EXP, only show popup for player"
```

---

### Task 8: Update unit sprite EXP display (optional polish)

**Objective:** Show the unit's level on the battlefield sprite so the player can see progression at a glance.

**Files:**
- Modify: `src/scenes/BattleScene.ts` in `syncUnitSprites`

**Step 1: Add level text to unit container**

After the HP bar in `syncUnitSprites`, add:

```typescript
  // Level text (bottom-left of sprite)
  const levelText = this.add.text(-TILE_SIZE / 2 + 4, TILE_SIZE / 2 - 2, `Lv${String(unit.level)}`, {
    fontSize: '9px',
    color: '#f1c40f',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0, 1);
  container.add(levelText);
```

This is optional but nice. Skip if the user wants minimal change.

**Step 2: Commit (if done)**

```bash
git add src/scenes/BattleScene.ts
git commit -m "polish(scene): display unit level on battlefield sprites"
```

---

### Task 9: Final verification

**Objective:** Run all tests and verify the dev build compiles.

**Step 1: Run tests**

```bash
npx vitest run
```

Expected: all pass.

**Step 2: Run build**

```bash
npm run build
```

Expected: builds successfully (Vite handles TS; may ignore tsc noise).

**Step 3: Commit any remaining changes**

```bash
git commit -m "feat: combat EXP bar with level-up support" || true
```

---

## Summary of Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `src/game/combat/Engine.ts` | Modify | Add `expAward` to `CombatResult`; compute kill/hit/miss EXP |
| `src/game/combat/__tests__/CombatExp.test.ts` | Create | Test EXP calculation |
| `src/game/GameEngine.ts` | Modify | Add `applyCombatExp` convenience method |
| `src/game/ui/ExpPopup.ts` | Create | Pure-logic state class for EXP popup data |
| `src/scenes/BattleScene.ts` | Modify | Store combat result; render EXP popup; animate bar; handle level-up; suppress popup for enemies |

## Acceptance Criteria

- [ ] After a player unit attacks an enemy and battle mode ends, an EXP popup appears
- [ ] The popup shows the unit name, level, EXP gained, and an animated EXP bar
- [ ] EXP scales with level difference (higher-level enemies give more, lower-level enemies give less)
- [ ] A same-level kill awards ~30 EXP (Lv1 vs Lv1)
- [ ] A high-level unit killing a weak enemy gets ~7 EXP (Lv10 vs Lv1)
- [ ] A low-level unit killing a strong enemy gets ~43 EXP (Lv1 vs Lv5)
- [ ] Hitting without killing awards 1+ EXP based on level difference
- [ ] Missing awards 0 EXP (no popup shown)
- [ ] If the EXP bar fills to 100, a "LEVEL UP!" banner appears with stat increases
- [ ] The popup auto-dismisses after ~1.5s or immediately on click
- [ ] Enemy-initiated combat silently awards EXP with no popup
- [ ] All existing tests pass
- [ ] No Phaser imports in `src/game/` files
