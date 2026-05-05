# Level-Up Animation Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Add a Fire Emblem GBA-style level-up animation sequence: a "LEVEL UP!" banner appears, followed by a status window that reveals which stats increased, with the player clicking to dismiss.

**Architecture:** Minimal pure-logic changes (capture pre-level stats, add animation state machine). The bulk of the work is Phaser rendering in `BattleScene`. Existing `showExpPopup()` already branches to `showLevelUpBanner()` on level-up — we replace that branch with the full sequence.

**Tech Stack:** TypeScript, Phaser 3, Vitest

---

## Existing Integration Points

- `ProgressionEngine.grantExp()` returns `ProgressionResult` with `levelUpResult: { newStats, increases }`
- `GameEngine.applyCombatExp()` calls `progressionEngine.grantExp()` and returns the `ProgressionResult`
- `BattleScene.showExpPopup()` already detects `popup.leveledUp` and calls `showLevelUpBanner(unit, onComplete)`
- `BattleScene.showLevelUpBanner()` currently shows a simple green banner that fades out after 1.5s

---

## Design Decisions

1. **Capture old stats in `ProgressionResult`** — The unit's stats are mutated by `unit.applyLevelUp()` inside `grantExp()`. The renderer needs the old stats to compute diffs. We add `oldStats: UnitStats` to `ProgressionResult` so the scene has everything it needs without guessing.

2. **Pure animation state machine `LevelUpDisplay`** — Lives in `src/game/ui/`. Tracks phases (`BANNER_IN → BANNER_HOLD → STATS_IN → STAT_REVEAL → DONE`) and per-stat reveal timing. 100% testable, zero Phaser.

3. **Re-use `StatusWindow` data shape** — The stat display uses the same stat keys as `StatusDisplay` (`hp`, `str`, `mag`, `skl`, `spd`, `luk`, `def`, `res`, `mov`) so the renderer can iterate uniformly.

4. **Stat reveal is animated** — Stats appear one-by-one (or all at once with a stagger) so the player can see which ones popped. Increased stats show `▲` and a bright color (e.g., `#f1c40f` gold); unchanged stats show muted gray.

5. **Player dismisses with click/space** — After all stats are revealed, a "Click to continue" hint appears. Click/tap/space advances. No auto-dismiss — FE gives the player time to savor good rolls.

---

## Task 1: Extend `ProgressionResult` with `oldStats`

**Objective:** Capture the unit's stats *before* level-up so the renderer can show before/after.

**Files:**
- Modify: `src/game/progression/ProgressionEngine.ts`

**Step 1: Add `oldStats` field**

```typescript
export interface ProgressionResult {
  expGained: number;
  leveledUp: boolean;
  levelUpResult?: LevelUpResult;
  oldStats?: UnitStats; // NEW — snapshot before any mutations
}
```

**Step 2: Capture `oldStats` in `grantExp()` before mutating**

In `grantExp()`, right before calling `unit.applyLevelUp(result.newStats)`:

```typescript
const oldStats = { ...unit.stats };
unit.applyLevelUp(result.newStats);
// ...
return { expGained: amount, leveledUp: true, levelUpResult: result, oldStats };
```

Also capture `oldStats` in the early-return `totalExp < 100` branch (set to `undefined` or `{ ...unit.stats }` — doesn't matter since `leveledUp` is false, but keeping the field present is fine).

**Step 3: Commit**

```bash
git add src/game/progression/ProgressionEngine.ts
git commit -m "feat(progression): capture oldStats in ProgressionResult for level-up display"
```

---

## Task 2: Add test for `oldStats` in `ProgressionResult`

**Objective:** Verify the old stat snapshot is correct.

**Files:**
- Modify: `src/game/progression/__tests__/ProgressionEngine.test.ts`

**Step 1: Add test**

```typescript
it('includes oldStats in result when leveling up', () => {
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, {
    growthRates: growths,
  });
  const engine = new ProgressionEngine();
  const rng = makeRng([0, 0]);
  const result = engine.grantExp(unit, 100, rng);
  expect(result.leveledUp).toBe(true);
  expect(result.oldStats).toBeDefined();
  expect(result.oldStats!.hp).toBe(20);
  expect(result.oldStats!.str).toBe(8);
  expect(unit.stats.hp).toBe(21); // mutated
});
```

**Step 2: Run tests**

```bash
npx vitest run src/game/progression/__tests__/ProgressionEngine.test.ts
```

Expected: PASS (including the new test)

**Step 3: Commit**

```bash
git add src/game/progression/__tests__/ProgressionEngine.test.ts
git commit -m "test(progression): assert oldStats snapshot on level-up"
```

---

## Task 3: Create `LevelUpDisplay` pure animation state machine

**Objective:** Drive the level-up animation timeline without Phaser.

**Files:**
- Create: `src/game/ui/LevelUpDisplay.ts`
- Test: `src/game/ui/__tests__/LevelUpDisplay.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { LevelUpDisplay, LEVEL_UP_PHASE } from '../LevelUpDisplay';
import { createStats } from '../../units/Stats';

describe('LevelUpDisplay', () => {
  const oldStats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const newStats = createStats({ hp: 21, str: 8, mag: 2, skl: 8, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const increases = ['hp', 'skl'];

  it('starts in BANNER_IN phase', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    expect(d.phase).toBe(LEVEL_UP_PHASE.BANNER_IN);
    expect(d.isComplete()).toBe(false);
  });

  it('advances from BANNER_IN to BANNER_HOLD after bannerDuration', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(400); // bannerInDuration = 300ms
    expect(d.phase).toBe(LEVEL_UP_PHASE.BANNER_HOLD);
  });

  it('advances to STATS_IN after bannerHoldDuration', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(300 + 800 + 10);
    expect(d.phase).toBe(LEVEL_UP_PHASE.STATS_IN);
  });

  it('reveals stats one-by-one after stats settle', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(300 + 800 + 400 + 10); // into STAT_REVEAL
    expect(d.phase).toBe(LEVEL_UP_PHASE.STAT_REVEAL);
    expect(d.getRevealProgress('hp')).toBeGreaterThan(0);
  });

  it('marks all stats revealed after enough time', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(10000);
    expect(d.allStatsRevealed()).toBe(true);
    expect(d.phase).toBe(LEVEL_UP_PHASE.WAIT_FOR_INPUT);
  });

  it('can be dismissed in WAIT_FOR_INPUT', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(10000);
    d.dismiss();
    expect(d.phase).toBe(LEVEL_UP_PHASE.DONE);
    expect(d.isComplete()).toBe(true);
  });

  it('reports correct stat diffs', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    expect(d.getDiff('hp')).toBe(1);
    expect(d.getDiff('str')).toBe(0);
    expect(d.isIncreased('hp')).toBe(true);
    expect(d.isIncreased('str')).toBe(false);
  });
});
```

**Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/game/ui/__tests__/LevelUpDisplay.test.ts
```

Expected: FAIL — `LevelUpDisplay` not defined

**Step 3: Implement `LevelUpDisplay.ts`**

```typescript
import { UnitStats } from '../units/Stats';

export const LEVEL_UP_PHASE = {
  BANNER_IN: 'banner_in',
  BANNER_HOLD: 'banner_hold',
  STATS_IN: 'stats_in',
  STAT_REVEAL: 'stat_reveal',
  WAIT_FOR_INPUT: 'wait_for_input',
  DONE: 'done',
} as const;
export type LevelUpPhase = (typeof LEVEL_UP_PHASE)[keyof typeof LEVEL_UP_PHASE];

const STAT_KEYS: (keyof UnitStats)[] = ['hp', 'str', 'mag', 'skl', 'spd', 'luk', 'def', 'res', 'mov'];

export class LevelUpDisplay {
  readonly unitName: string;
  readonly newLevel: number;
  readonly oldStats: UnitStats;
  readonly newStats: UnitStats;
  readonly increases: string[];

  private elapsed = 0;
  phase: LevelUpPhase = LEVEL_UP_PHASE.BANNER_IN;

  // Timing constants (ms)
  private readonly bannerInDuration = 300;
  private readonly bannerHoldDuration = 800;
  private readonly statsInDuration = 400;
  private readonly statRevealDelay = 80; // ms between each stat reveal

  constructor(
    unitName: string,
    newLevel: number,
    oldStats: UnitStats,
    newStats: UnitStats,
    increases: string[],
  ) {
    this.unitName = unitName;
    this.newLevel = newLevel;
    this.oldStats = oldStats;
    this.newStats = newStats;
    this.increases = increases;
  }

  update(deltaMs: number): void {
    if (this.phase === LEVEL_UP_PHASE.DONE) return;
    this.elapsed += deltaMs;

    if (this.phase === LEVEL_UP_PHASE.BANNER_IN && this.elapsed >= this.bannerInDuration) {
      this.phase = LEVEL_UP_PHASE.BANNER_HOLD;
    } else if (
      this.phase === LEVEL_UP_PHASE.BANNER_HOLD &&
      this.elapsed >= this.bannerInDuration + this.bannerHoldDuration
    ) {
      this.phase = LEVEL_UP_PHASE.STATS_IN;
    } else if (
      this.phase === LEVEL_UP_PHASE.STATS_IN &&
      this.elapsed >= this.bannerInDuration + this.bannerHoldDuration + this.statsInDuration
    ) {
      this.phase = LEVEL_UP_PHASE.STAT_REVEAL;
    } else if (this.phase === LEVEL_UP_PHASE.STAT_REVEAL && this.allStatsRevealed()) {
      this.phase = LEVEL_UP_PHASE.WAIT_FOR_INPUT;
    }
  }

  getRevealProgress(statKey: keyof UnitStats): number {
    if (this.phase === LEVEL_UP_PHASE.DONE || this.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT) {
      return 1;
    }
    if (this.phase !== LEVEL_UP_PHASE.STAT_REVEAL) {
      return 0;
    }
    const index = STAT_KEYS.indexOf(statKey);
    const revealStart =
      this.bannerInDuration + this.bannerHoldDuration + this.statsInDuration + index * this.statRevealDelay;
    const progress = Math.max(0, Math.min(1, (this.elapsed - revealStart) / this.statRevealDelay));
    return progress;
  }

  allStatsRevealed(): boolean {
    const lastIndex = STAT_KEYS.length - 1;
    const revealStart =
      this.bannerInDuration + this.bannerHoldDuration + this.statsInDuration + lastIndex * this.statRevealDelay;
    return this.elapsed >= revealStart + this.statRevealDelay;
  }

  dismiss(): void {
    if (this.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT) {
      this.phase = LEVEL_UP_PHASE.DONE;
    }
  }

  isComplete(): boolean {
    return this.phase === LEVEL_UP_PHASE.DONE;
  }

  getDiff(statKey: keyof UnitStats): number {
    return (this.newStats[statKey] ?? 0) - (this.oldStats[statKey] ?? 0);
  }

  isIncreased(statKey: keyof UnitStats): boolean {
    return this.increases.includes(statKey as string);
  }
}
```

**Step 4: Run tests — expect PASS**

```bash
npx vitest run src/game/ui/__tests__/LevelUpDisplay.test.ts
```

Expected: 7 passed

**Step 5: Commit**

```bash
git add src/game/ui/LevelUpDisplay.ts src/game/ui/__tests__/LevelUpDisplay.test.ts
git commit -m "feat(ui): add LevelUpDisplay animation state machine"
```

---

## Task 4: Export `LevelUpDisplay` from game barrel

**Objective:** Make the new class available to `BattleScene`.

**Files:**
- Modify: `src/game/ui/index.ts` (or create if missing)

If `src/game/ui/index.ts` exists, add:
```typescript
export { LevelUpDisplay, LEVEL_UP_PHASE } from './LevelUpDisplay';
```

If it doesn't exist, check how `BattleScene` imports UI classes. Currently it uses direct paths like `../game/ui/BattleMenu`. For consistency, a direct import is fine. But if there's a barrel, keep it in sync.

**Verification:** `grep -r "from '../game/ui'" src/scenes/` to see if barrel imports are used.

**Step 2: Commit**

```bash
git add src/game/ui/index.ts
git commit -m "chore(ui): export LevelUpDisplay from barrel"
```

---

## Task 5: Replace `showLevelUpBanner` with full `showLevelUpSequence`

**Objective:** Render the banner + stats window animation driven by `LevelUpDisplay`.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Add `LevelUpDisplay` import**

```typescript
import { LevelUpDisplay, LEVEL_UP_PHASE } from '../game/ui/LevelUpDisplay';
```

**Step 2: Replace `showLevelUpBanner` method**

Delete the old `showLevelUpBanner` (lines ~1777–1808) and replace with:

```typescript
private levelUpSequence: {
  display: LevelUpDisplay;
  container: Phaser.GameObjects.Container;
  timer: Phaser.Time.TimerEvent;
} | null = null;

private showLevelUpSequence(
  unit: Unit,
  progression: import('../game/progression/ProgressionEngine').ProgressionResult,
  onComplete: () => void,
): void {
  if (!progression.levelUpResult || !progression.oldStats) {
    onComplete();
    return;
  }

  const display = new LevelUpDisplay(
    unit.name,
    unit.level,
    progression.oldStats,
    progression.levelUpResult.newStats,
    progression.levelUpResult.increases,
  );

  const cx = this.cameras.main.width / 2;
  const cy = this.cameras.main.height / 2;

  const container = this.add.container(cx, cy);
  container.setDepth(100);
  this.levelUpBanner = container; // reuse existing field for cleanup

  // ---- BANNER ----
  const bannerBg = this.add.rectangle(0, -120, 320, 56, 0x27ae60, 0.95);
  bannerBg.setStrokeStyle(3, 0xf1c40f);
  container.add(bannerBg);

  const bannerText = this.add
    .text(0, -120, `LEVEL UP!  ${display.unitName} → Lv ${display.newLevel.toString()}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  container.add(bannerText);

  // ---- STATS PANEL ----
  const panel = this.add.rectangle(0, 40, 280, 320, 0x1a1a2e, 0.95);
  panel.setStrokeStyle(2, 0x34495e);
  panel.setAlpha(0); // hidden initially
  container.add(panel);

  // Title inside panel
  const panelTitle = this.add
    .text(0, -100, 'Stat Growth', {
      fontSize: '16px',
      color: '#f1c40f',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setAlpha(0);
  container.add(panelTitle);

  // Stat rows
  const statKeys: (keyof import('../game/units/Stats').UnitStats)[] = [
    'hp', 'str', 'mag', 'skl', 'spd', 'luk', 'def', 'res', 'mov',
  ];
  const statLabels: Record<string, string> = {
    hp: 'HP', str: 'Str', mag: 'Mag', skl: 'Skl', spd: 'Spd',
    luk: 'Luk', def: 'Def', res: 'Res', mov: 'Mov',
  };

  const statTexts: Phaser.GameObjects.Text[] = [];
  const startY = -70;
  const rowHeight = 28;

  for (let i = 0; i < statKeys.length; i++) {
    const key = statKeys[i];
    const y = startY + i * rowHeight;

    const nameText = this.add
      .text(-80, y, statLabels[key as string] ?? key, {
        fontSize: '14px',
        color: '#bdc3c7',
      })
      .setOrigin(0, 0.5)
      .setAlpha(0);
    container.add(nameText);

    const oldVal = (progression.oldStats![key] ?? 0).toString();
    const newVal = (progression.levelUpResult!.newStats[key] ?? 0).toString();
    const diff = display.getDiff(key);
    const increased = display.isIncreased(key);

    const valueText = this.add
      .text(60, y, `${oldVal} → ${newVal}${increased ? ' ▲' : ''}`, {
        fontSize: '14px',
        color: increased ? '#f1c40f' : '#bdc3c7',
        fontStyle: increased ? 'bold' : 'normal',
      })
      .setOrigin(1, 0.5)
      .setAlpha(0);
    container.add(valueText);

    statTexts.push(nameText, valueText);
  }

  // Dismiss hint
  const hintText = this.add
    .text(0, 200, '', {
      fontSize: '12px',
      color: '#7f8c8d',
      fontStyle: 'italic',
    })
    .setOrigin(0.5)
    .setAlpha(0);
  container.add(hintText);

  // ---- ANIMATION LOOP ----
  const timer = this.time.addEvent({
    delay: 16,
    callback: () => {
      display.update(16);

      // Banner entrance: slide in + fade
      if (display.phase === LEVEL_UP_PHASE.BANNER_IN) {
        const t = Math.min(1, display['elapsed'] / 300);
        bannerBg.setAlpha(t * 0.95);
        bannerText.setAlpha(t);
        bannerBg.setPosition(0, -120 + (1 - t) * -40);
        bannerText.setPosition(0, -120 + (1 - t) * -40);
      } else {
        bannerBg.setAlpha(0.95);
        bannerText.setAlpha(1);
        bannerBg.setPosition(0, -120);
        bannerText.setPosition(0, -120);
      }

      // Stats panel entrance
      if (display.phase === LEVEL_UP_PHASE.STATS_IN || display.phase === LEVEL_UP_PHASE.STAT_REVEAL) {
        const panelT = Math.min(1, (display['elapsed'] - 1100) / 400);
        panel.setAlpha(panelT * 0.95);
        panelTitle.setAlpha(panelT);
      }

      // Per-stat reveal
      if (display.phase === LEVEL_UP_PHASE.STAT_REVEAL || display.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT || display.phase === LEVEL_UP_PHASE.DONE) {
        for (let i = 0; i < statKeys.length; i++) {
          const progress = display.getRevealProgress(statKeys[i]);
          const nameText = statTexts[i * 2];
          const valueText = statTexts[i * 2 + 1];
          nameText.setAlpha(progress);
          valueText.setAlpha(progress);
        }
      }

      // Show dismiss hint
      if (display.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT) {
        hintText.setText('Click or press SPACE to continue');
        hintText.setAlpha(1);
      }

      // Done
      if (display.isComplete()) {
        timer.remove();
        this.hideLevelUpSequence();
        onComplete();
      }
    },
    loop: true,
  });

  this.levelUpSequence = { display, container, timer };

  // Input handlers for dismissal
  const dismissHandler = () => {
    if (this.levelUpSequence?.display.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT) {
      this.levelUpSequence.display.dismiss();
    }
  };

  this.input.once('pointerdown', dismissHandler);
  this.input.keyboard?.once('keydown-SPACE', dismissHandler);
}

private hideLevelUpSequence(): void {
  this.levelUpSequence?.timer.remove();
  this.levelUpSequence?.container.destroy();
  this.levelUpSequence = null;
  this.levelUpBanner = null;
}
```

**Note:** The code accesses `display['elapsed']` for timing calculations inside the render loop. If you prefer, expose `elapsed` as a public readonly getter on `LevelUpDisplay` instead of private. Update `LevelUpDisplay.ts`:

```typescript
get elapsed(): number { return this._elapsed; }
```

And rename `private elapsed` → `private _elapsed`.

**Step 3: Update the call site in `showExpPopup`**

In `showExpPopup`, replace:
```typescript
this.showLevelUpBanner(unit, () => {
  this.hideExpPopup();
  onComplete();
});
```

With:
```typescript
this.showLevelUpSequence(unit, progression, () => {
  this.hideExpPopup();
  onComplete();
});
```

**Step 4: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: clean (ignore any pre-existing `tsconfig` target ES5 false positives for `Map`, `includes`, etc.)

**Step 5: Run tests**

```bash
npx vitest run
```

Expected: all existing tests pass

**Step 6: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(battle): Fire Emblem-style level-up banner + stat reveal animation"
```

---

## Task 6: Manual verification in browser

**Objective:** Confirm the animation looks correct end-to-end.

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Open http://localhost:5173**

**Step 3: Enter a battle where the player unit kills an enemy and would level up**

Since EXP is hard to trigger naturally, temporarily boost `expAward` in `GameEngine.applyCombatExp` or use a save-state approach. Alternatively, add a temporary debug key in `BattleScene` that calls `this.engine.applyCombatExp(unit, { expAward: 100 })` on the selected unit.

**Step 4: Verify checklist**

- [ ] EXP bar fills, then banner slides in with "LEVEL UP! Name → Lv X"
- [ ] Stats panel fades in below the banner
- [ ] Stats reveal one-by-one with stagger
- [ ] Increased stats show `▲` and gold color
- [ ] Unchanged stats show gray
- [ ] After all stats revealed, "Click or press SPACE to continue" appears
- [ ] Clicking/space dismisses the sequence and returns to map
- [ ] No Phaser imports in `src/game/`

---

## Task 7: Remove any temporary debug code

If you added debug helpers for testing, remove them before final commit.

---

## Summary of Files Changed

| File | Action | What |
|------|--------|------|
| `src/game/progression/ProgressionEngine.ts` | Modify | Add `oldStats` to `ProgressionResult` |
| `src/game/progression/__tests__/ProgressionEngine.test.ts` | Modify | Test `oldStats` snapshot |
| `src/game/ui/LevelUpDisplay.ts` | Create | Pure animation state machine |
| `src/game/ui/__tests__/LevelUpDisplay.test.ts` | Create | Tests for state machine |
| `src/game/ui/index.ts` | Modify | Export `LevelUpDisplay` |
| `src/scenes/BattleScene.ts` | Modify | Replace `showLevelUpBanner` with `showLevelUpSequence` |

---

## Common Pitfalls

1. **Old stats are lost** — If you forget to capture `oldStats` before `unit.applyLevelUp()`, the renderer can't show diffs. The plan explicitly captures them in `ProgressionEngine`.

2. **Phase timing drift** — The Phaser timer loop runs every 16ms but can drift. `LevelUpDisplay.update(deltaMs)` uses accumulated delta, so timing is frame-rate independent.

3. **Double-dismiss crash** — `input.once` ensures the dismiss handler only fires once. If using `on` instead of `once`, remove the listener manually after dismiss.

4. **Memory leak** — Always call `timer.remove()` and `container.destroy()` in `hideLevelUpSequence`. The old `showLevelUpBanner` did this with a tween onComplete; the new code does it explicitly.

5. **TS2339 on `display['elapsed']`** — If `elapsed` is private, TypeScript complains. Either make it `public readonly` or use a getter as noted in Task 5.
