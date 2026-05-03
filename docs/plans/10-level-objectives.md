# Phase 10: Level Objectives (Victory / Defeat)

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Add win/loss conditions to the first level. Victory when all enemies are defeated. Defeat when all player units are defeated. Check conditions after each enemy phase and after player combat. Display overlay screens with restart/continue options.

**Architecture:** `LevelObjectives` is a pure-logic class that evaluates victory/defeat given the unit list. `GameEngine` exposes `checkObjectives()` returning `{ victory: boolean, defeat: boolean }`. The Phaser layer (`BattleScene`) polls this after combat resolution and after the enemy action sequence, then shows an overlay with the result.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phase 9 complete (player battle mode).

---

### Task 10.1: LevelObjectives pure logic

**Objective:** Given a list of units, determine if victory or defeat conditions are met.

**Files:**
- Create: `src/game/objectives/LevelObjectives.ts`
- Create: `src/game/objectives/__tests__/LevelObjectives.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/objectives/__tests__/LevelObjectives.test.ts
import { describe, it, expect } from 'vitest';
import { LevelObjectives } from '../LevelObjectives';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('LevelObjectives', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('returns victory when no live enemies remain', () => {
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
    enemy.takeDamage(999);

    const objectives = new LevelObjectives([player, enemy]);
    expect(objectives.check().victory).toBe(true);
    expect(objectives.check().defeat).toBe(false);
  });

  it('returns defeat when no live players remain', () => {
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    player.takeDamage(999);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const objectives = new LevelObjectives([player, enemy]);
    expect(objectives.check().defeat).toBe(true);
    expect(objectives.check().victory).toBe(false);
  });

  it('returns ongoing when both sides have live units', () => {
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const objectives = new LevelObjectives([player, enemy]);
    const result = objectives.check();
    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(true);
  });

  it('ignores allies for defeat condition', () => {
    const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, stats, 0, 0);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const objectives = new LevelObjectives([ally, enemy]);
    expect(objectives.check().defeat).toBe(true);
  });

  it('ignores allies for victory condition', () => {
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, stats, 1, 1);

    const objectives = new LevelObjectives([player, ally]);
    expect(objectives.check().victory).toBe(true);
  });
});
```

**Step 2: Run test to verify failure**

```bash
cd /root/workspace/the-sanguine-spear
npx vitest run src/game/objectives/__tests__/LevelObjectives.test.ts
```
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/game/objectives/LevelObjectives.ts
import { Unit, Faction } from '../units/Unit';

export interface ObjectiveResult {
  victory: boolean;
  defeat: boolean;
  ongoing: boolean;
}

export class LevelObjectives {
  constructor(private units: Unit[]) {}

  check(): ObjectiveResult {
    const livePlayers = this.units.filter((u) => u.faction === Faction.PLAYER && u.isAlive);
    const liveEnemies = this.units.filter((u) => u.faction === Faction.ENEMY && u.isAlive);

    const victory = liveEnemies.length === 0;
    const defeat = livePlayers.length === 0;
    const ongoing = !victory && !defeat;

    return { victory, defeat, ongoing };
  }
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/objectives/__tests__/LevelObjectives.test.ts
```
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/game/objectives/LevelObjectives.ts src/game/objectives/__tests__/LevelObjectives.test.ts
git commit -m "feat: add LevelObjectives victory/defeat logic (Task 10.1)"
```

---

### Task 10.2: Wire LevelObjectives into GameEngine

**Objective:** Expose objective checking through the GameEngine facade.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

Add to `src/game/__tests__/GameEngine.test.ts`:

```typescript
  it('reports victory when all enemies are dead', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
    enemy.takeDamage(999);

    const result = engine.checkObjectives();
    expect(result.victory).toBe(true);
    expect(result.defeat).toBe(false);
  });

  it('reports defeat when all players are dead', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    player.takeDamage(999);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const result = engine.checkObjectives();
    expect(result.defeat).toBe(true);
    expect(result.victory).toBe(false);
  });

  it('reports ongoing when both sides are alive', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const result = engine.checkObjectives();
    expect(result.ongoing).toBe(true);
    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(false);
  });
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```
Expected: FAIL — `checkObjectives` not found on GameEngine

**Step 3: Write minimal implementation**

Add to `src/game/GameEngine.ts`:

```typescript
import { LevelObjectives, ObjectiveResult } from './objectives/LevelObjectives';
```

Add method to GameEngine class:

```typescript
  checkObjectives(): ObjectiveResult {
    return new LevelObjectives(this.units).check();
  }
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat: wire LevelObjectives into GameEngine (Task 10.2)"
```

---

### Task 10.3: BattleScene check after player combat

**Objective:** After the battle animation finishes, check objectives and show victory/defeat overlay if the level is over.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Modify `endBattleMode()` to check objectives**

After the battle animation completes (in `endBattleMode()`), add:

```typescript
    // Check win/loss after combat resolves
    const objectives = this.engine.checkObjectives();
    if (objectives.victory) {
      this.showVictoryScreen();
      return;
    }
    if (objectives.defeat) {
      this.showDefeatScreen();
      return;
    }
```

Place this after `this.battleDisplayState = null;` and before `this.battleMenu.reset();`.

**Step 2: Add `showVictoryScreen()` method**

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

    const subtitle = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.55, 'All enemies defeated', {
        fontSize: '18px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);
    overlay.add(subtitle);

    const restart = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.7, '[ Play Again ]', {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#27ae60',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    overlay.add(restart);

    restart.on('pointerdown', () => {
      this.scene.restart();
    });
  }
```

**Step 3: Add `showDefeatScreen()` method**

```typescript
  private showDefeatScreen(): void {
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
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.4, 'Defeat', {
        fontSize: '48px',
        color: '#e74c3c',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(title);

    const subtitle = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.55, 'All units lost', {
        fontSize: '18px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);
    overlay.add(subtitle);

    const restart = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.7, '[ Try Again ]', {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    overlay.add(restart);

    restart.on('pointerdown', () => {
      this.scene.restart();
    });
  }
```

**Step 4: Verify build**

```bash
cd /root/workspace/the-sanguine-spear
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0 errors"
```
Expected: 0 errors (ignoring existing lib/target false positives)

**Step 5: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: add victory/defeat overlays after player combat (Task 10.3)"
```

---

### Task 10.4: BattleScene check after enemy phase

**Objective:** After the enemy AI finishes its action sequence, check objectives before returning control to the player.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Modify enemy action completion callback**

In `createUI()`, the `endTurn` button callback calls `executeEnemyActions`. After enemy actions complete, add objective check:

Find this block in `createUI()`:
```typescript
        this.executeEnemyActions(() => {
          this.engine.endTurn(); // Enemy → Ally
          this.engine.endTurn(); // Ally → Player
          this.syncUnitSprites();
          phaseText.setText(
            `Phase: ${this.engine.turnManager.isPlayerPhase() ? 'Player' : 'Enemy'}`,
          );
        });
```

Replace with:
```typescript
        this.executeEnemyActions(() => {
          const objectives = this.engine.checkObjectives();
          if (objectives.victory) {
            this.showVictoryScreen();
            return;
          }
          if (objectives.defeat) {
            this.showDefeatScreen();
            return;
          }

          this.engine.endTurn(); // Enemy → Ally
          this.engine.endTurn(); // Ally → Player
          this.syncUnitSprites();
          phaseText.setText(
            `Phase: ${this.engine.turnManager.isPlayerPhase() ? 'Player' : 'Enemy'}`,
          );
        });
```

**Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0 errors"
```
Expected: 0 new errors

**Step 3: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: check objectives after enemy phase (Task 10.4)"
```

---

### Task 10.5: Remove dead units from grid after combat

**Objective:** When a unit dies in combat, it remains on the grid as a ghost. Remove it so subsequent phases don't try to target corpses.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

```typescript
  it('removes dead units from the grid', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 3, 3);
    enemy.takeDamage(999);

    engine.removeDeadUnits();
    expect(engine.getUnit(3, 3)).toBeNull();
  });
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```
Expected: FAIL — `removeDeadUnits` not found

**Step 3: Write minimal implementation**

Add to `GameEngine`:

```typescript
  removeDeadUnits(): void {
    for (const unit of this.units) {
      if (!unit.isAlive) {
        this.grid.removeUnit(unit.gridX, unit.gridY);
      }
    }
  }
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```
Expected: PASS

**Step 5: Wire into BattleScene**

Call `this.engine.removeDeadUnits()` in two places:
1. After `endBattleMode()` finishes (before checking objectives)
2. Inside `executeEnemyActions`, after each kill animation completes

In `endBattleMode()`, add after `this.battleOverlay = null;`:
```typescript
    this.engine.removeDeadUnits();
```

In `executeEnemyActions`, inside the `defenderDied` branch, after `this.syncUnitSprites();`:
```typescript
                  this.engine.removeDeadUnits();
                  processNext(index + 1);
```

**Step 6: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts src/scenes/BattleScene.ts
git commit -m "feat: remove dead units from grid after combat (Task 10.5)"
```

---

### Task 10.6: Final verification

**Objective:** All tests pass, game can be played to completion.

**Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: All tests pass

**Step 2: Verify no new TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "src/game\|src/scenes" | grep -v "node_modules" || echo "No project errors"
```

**Step 3: Commit if clean**

```bash
git log --oneline -10
```

---

## Summary

| Task | Status | What It Builds | Tests |
|------|--------|---------------|-------|
| 10.1 | ✅ Done | `LevelObjectives` pure logic | 5 |
| 10.2 | ✅ Done | `GameEngine.checkObjectives()` | 3 |
| 10.3 | ✅ Done | Victory/defeat overlays after player combat | — |
| 10.4 | ✅ Done | Check after enemy phase | — |
| 10.5 | ✅ Done | Remove dead units from grid | 1 |
| 10.6 | ✅ Done | Full verification | All existing + new |
