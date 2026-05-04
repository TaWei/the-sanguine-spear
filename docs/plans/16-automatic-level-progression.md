# Automatic Level Progression Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Upon completing a level, automatically advance to the next level in sequence. After the final level, show a campaign-complete screen. On defeat, restart the same level.

**Architecture:** Add a `getNextLevelId()` helper to the level registry. `BattleScene` stores the current `levelId` and uses it on victory to start the next scene with `this.scene.start('BattleScene', { levelId: nextId })`. The victory screen auto-advances after a short delay; the defeat screen keeps its "Try Again" restart button.

**Tech Stack:** TypeScript, Phaser 3, Vitest

---

## Task 1: Add `getNextLevelId()` to level registry

**Objective:** Provide a way to look up the next level in the `LEVELS` array by current ID.

**Files:**
- Modify: `src/game/levels/LevelData.ts` (after `getLevel`)
- Test: `src/game/levels/__tests__/LevelData.test.ts`

**Step 1: Write failing test**

Add to `src/game/levels/__tests__/LevelData.test.ts`:

```typescript
import { getNextLevelId } from '../LevelData';

// inside describe('LevelData', () => { ...
  it('getNextLevelId returns the next level ID', () => {
    expect(getNextLevelId('level-1')).toBe('level-2');
  });

  it('getNextLevelId returns null for the last level', () => {
    expect(getNextLevelId('level-2')).toBeNull();
  });

  it('getNextLevelId returns null for unknown level', () => {
    expect(getNextLevelId('nonexistent')).toBeNull();
  });
```

**Step 2: Run test to verify failure**

```bash
cd /root/workspace/the-sanguine-spear && npx vitest run src/game/levels/__tests__/LevelData.test.ts
```
Expected: FAIL — "getNextLevelId is not defined"

**Step 3: Write minimal implementation**

Add to `src/game/levels/LevelData.ts` after `getLevel`:

```typescript
export function getNextLevelId(currentId: string): string | null {
  const index = LEVELS.findIndex((l) => l.id === currentId);
  if (index === -1 || index >= LEVELS.length - 1) return null;
  return LEVELS[index + 1].id;
}
```

**Step 4: Run test to verify pass**

```bash
cd /root/workspace/the-sanguine-spear && npx vitest run src/game/levels/__tests__/LevelData.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/levels/LevelData.ts src/game/levels/__tests__/LevelData.test.ts
git commit -m "feat: add getNextLevelId for level progression"
```

---

## Task 2: Store `currentLevelId` in BattleScene and pass it on scene restart/start

**Objective:** Ensure BattleScene knows which level it is playing so it can compute the next one.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Add a `currentLevelId` field**

Near the top of `BattleScene` class properties (around line 45–65), add:

```typescript
private currentLevelId = 'level-1';
```

**Step 2: Capture the levelId in `create()`**

In `create(data?: { levelId?: string })`, after extracting `levelId`, store it:

```typescript
this.currentLevelId = data?.levelId ?? 'level-1';
```

Current code already does:
```typescript
const levelId = data?.levelId ?? 'level-1';
```
Just add `this.currentLevelId = levelId;` right after.

**Step 3: Verify via existing test suite**

```bash
cd /root/workspace/the-sanguine-spear && npx vitest run
```
Expected: all tests pass (no behavior change yet)

**Step 4: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: store currentLevelId in BattleScene"
```

---

## Task 3: Auto-advance to next level on victory

**Objective:** After the victory screen is shown, automatically transition to the next level after a 2-second delay. If this was the final level, show a campaign-complete screen instead.

**Files:**
- Modify: `src/scenes/BattleScene.ts` (victory screen and end-battle logic)
- Modify: `src/game/levels/LevelData.ts` (re-export `getNextLevelId` if not already done)

**Step 1: Import `getNextLevelId` in BattleScene**

At the top of `src/scenes/BattleScene.ts`, add to existing imports:

```typescript
import { getNextLevelId } from '../game/levels/LevelData';
```

**Step 2: Modify `showVictoryScreen()` to auto-advance**

Replace the body of `showVictoryScreen()` (around line 1071) with:

```typescript
private showVictoryScreen(): void {
  const overlay = this.add.container(0, 0);

  const bg = this.add.rectangle(
    this.cameras.main.width / 2,
    this.cameras.main.height / 2,
    this.cameras.main.width,
    this.cameras.main.height,
    0x000000,
    0.85,
  );
  overlay.add(bg);

  const title = this.add
    .text(this.cameras.main.width / 2, this.cameras.main.height * 0.4, 'Victory', {
      fontSize: '48px',
      color: '#f1c40f',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  overlay.add(title);

  const nextId = getNextLevelId(this.currentLevelId);

  if (nextId) {
    const subtitle = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.55, `Advancing to next level...`, {
        fontSize: '18px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);
    overlay.add(subtitle);

    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BattleScene', { levelId: nextId });
      });
    });
  } else {
    const subtitle = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.55, 'All levels complete!', {
        fontSize: '18px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);
    overlay.add(subtitle);

    const menuBtn = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.7, '[ Return to Menu ]', {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#27ae60',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    overlay.add(menuBtn);

    menuBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MainMenuScene');
      });
    });
  }
}
```

**Step 3: Verify via existing test suite**

```bash
cd /root/workspace/the-sanguine-spear && npx vitest run
```
Expected: all tests pass (scene logic is not unit-tested directly; verify no TypeScript errors)

**Step 4: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: auto-advance to next level on victory, show campaign complete after final"
```

---

## Task 4: Keep defeat screen as "Try Again" (restart same level)

**Objective:** Ensure the defeat button restarts the same level, not the default level-1.

**Files:**
- Modify: `src/scenes/BattleScene.ts` (`showDefeatScreen`)

**Step 1: Update `showDefeatScreen()`**

Replace the pointerdown handler inside `showDefeatScreen()` (around line 1158) from:
```typescript
restart.on('pointerdown', () => {
  this.scene.restart();
});
```

To:
```typescript
restart.on('pointerdown', () => {
  this.scene.restart({ levelId: this.currentLevelId });
});
```

This ensures restarting the scene preserves the current level.

**Step 2: Verify via existing test suite**

```bash
cd /root/workspace/the-sanguine-spear && npx vitest run
```
Expected: all tests pass

**Step 3: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "fix: defeat restart preserves current level"
```

---

## Task 5: Update MainMenuScene to launch a "New Campaign" flow

**Objective:** Add a single "New Campaign" button that starts from level-1, keeping level-2 as a debug/skip option.

**Files:**
- Modify: `src/scenes/MainMenuScene.ts`

**Step 1: Relabel the Level 1 button**

In `MainMenuScene.ts`, change the Level 1 button text from `[ Level 1: The Ruins ]` to `[ New Campaign ]`.

Leave the Level 2 button as-is (acts as a level-select debug option).

**Step 2: Verify no regressions**

```bash
cd /root/workspace/the-sanguine-spear && npx vitest run
```
Expected: all tests pass

**Step 3: Commit**

```bash
git add src/scenes/MainMenuScene.ts
git commit -m "ui: relabel level 1 button to New Campaign"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/game/levels/LevelData.ts` | Add `getNextLevelId()` helper |
| `src/game/levels/__tests__/LevelData.test.ts` | Tests for `getNextLevelId()` |
| `src/scenes/BattleScene.ts` | Store `currentLevelId`, auto-advance on victory, preserve level on defeat restart |
| `src/scenes/MainMenuScene.ts` | Relabel button to "New Campaign" |

**Behavior:**
- Win level 1 → 2-second delay → auto-fade to level 2
- Win level 2 (final) → show "All levels complete!" with "Return to Menu"
- Lose any level → "Try Again" restarts the same level
