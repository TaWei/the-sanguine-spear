# Phase 9: Player Battle Mode (Fight, Target, Animate)

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Allow the player to initiate combat. After moving a unit, if an enemy is adjacent, display a Fight / End Turn menu. Choosing Fight lets the player select an adjacent enemy target, then plays a battle animation showing both units' attacks, health bars, and damage numbers.

**Architecture:** `BattleMenu` is a pure state machine tracking menu choices and target selection. `CombatSequence` orchestrates the attack → counterattack flow using the existing `CombatEngine`. `BattleDisplayState` models the animation timeline (intro → attack → counter → done) with no Phaser dependency. The `GameEngine` exposes `getAdjacentEnemies()`, `initiateCombat()`, and `resolveBattleStep()` for the Phaser layer to drive frame-by-frame.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phases 4 and 5 complete (CombatEngine, weapons, formulas, AI).

---

### Task 9.1: Detect adjacent enemies after movement

**Objective:** Given a unit position and the grid, return all adjacent enemy units within weapon range.

**Files:**
- Create: `src/game/combat/Adjacency.ts`
- Create: `src/game/combat/__tests__/Adjacency.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/combat/__tests__/Adjacency.test.ts
import { describe, it, expect } from 'vitest';
import { getAdjacentEnemies } from '../Adjacency';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../Weapons';

describe('getAdjacentEnemies', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('finds an enemy directly adjacent (range 1)', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 6, 5);
    grid.placeUnit(enemy, 6, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(1);
    expect(enemies[0].id).toBe('e1');
  });

  it('returns empty when no enemies adjacent', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(0);
  });

  it('ignores dead enemies', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 6, 5);
    enemy.takeDamage(999);
    grid.placeUnit(enemy, 6, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(0);
  });

  it('ignores allies and same-faction units', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, stats, 6, 5);
    grid.placeUnit(ally, 6, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(0);
  });

  it('respects weapon min/max range (bow range 2)', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.ARCHER, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 7, 5);
    grid.placeUnit(enemy, 7, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Bow']);
    expect(enemies).toHaveLength(1);
  });

  it('excludes enemies outside weapon range', () => {
    const grid = new Grid(10, 10);
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    grid.placeUnit(player, 5, 5);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 7, 5);
    grid.placeUnit(enemy, 7, 5);

    const enemies = getAdjacentEnemies(player, grid, WEAPON_DB['Iron Sword']);
    expect(enemies).toHaveLength(0);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/combat/Adjacency.ts
import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from './Weapons';

export function getAdjacentEnemies(unit: Unit, grid: Grid, weapon: WeaponData): Unit[] {
  const enemies: Unit[] = [];
  const minR = weapon.minRange;
  const maxR = weapon.maxRange;

  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < minR || dist > maxR) continue;

      const other = grid.getUnit(unit.gridX + dx, unit.gridY + dy);
      if (other && other.faction === Faction.ENEMY && other.isAlive) {
        enemies.push(other);
      }
    }
  }

  return enemies;
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/combat/Adjacency.ts src/game/combat/__tests__/Adjacency.test.ts
git commit -m "feat: add adjacent enemy detection with weapon range"
```

---

### Task 9.2: Build the BattleMenu state machine

**Objective:** Pure state machine for the post-move menu. States: `hidden → choose_action → choose_target → resolved`. Actions: `FIGHT`, `END_TURN`.

**Files:**
- Create: `src/game/ui/BattleMenu.ts`
- Create: `src/game/ui/__tests__/BattleMenu.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/ui/__tests__/BattleMenu.test.ts
import { describe, it, expect } from 'vitest';
import { BattleMenu, MenuState, MenuAction } from '../BattleMenu';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('BattleMenu', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
  const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 6, 5);

  it('starts hidden', () => {
    const menu = new BattleMenu();
    expect(menu.state).toBe(MenuState.HIDDEN);
    expect(menu.isVisible).toBe(false);
  });

  it('opens to CHOOSE_ACTION when shown', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.unit).toBe(player);
    expect(menu.adjacentEnemies).toHaveLength(1);
  });

  it('selecting FIGHT transitions to CHOOSE_TARGET', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.FIGHT);
    expect(menu.state).toBe(MenuState.CHOOSE_TARGET);
  });

  it('selecting END_TURN transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.END_TURN);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedAction).toBe(MenuAction.END_TURN);
  });

  it('selecting a target transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.FIGHT);
    menu.selectTarget(enemy);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedTarget).toBe(enemy);
  });

  it('cannot select target before choosing FIGHT', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    expect(() => menu.selectTarget(enemy)).toThrow();
  });

  it('reset returns to hidden', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.END_TURN);
    menu.reset();
    expect(menu.state).toBe(MenuState.HIDDEN);
    expect(menu.unit).toBeNull();
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/ui/BattleMenu.ts
import { Unit } from '../units/Unit';

export const MenuState = {
  HIDDEN: 'hidden',
  CHOOSE_ACTION: 'choose_action',
  CHOOSE_TARGET: 'choose_target',
  RESOLVED: 'resolved',
} as const;
export type MenuState = (typeof MenuState)[keyof typeof MenuState];

export const MenuAction = {
  FIGHT: 'fight',
  END_TURN: 'end_turn',
} as const;
export type MenuAction = (typeof MenuAction)[keyof typeof MenuAction];

export class BattleMenu {
  private _state: MenuState = MenuState.HIDDEN;
  private _unit: Unit | null = null;
  private _enemies: Unit[] = [];
  private _selectedAction: MenuAction | null = null;
  private _selectedTarget: Unit | null = null;

  get state(): MenuState { return this._state; }
  get isVisible(): boolean { return this._state !== MenuState.HIDDEN; }
  get unit(): Unit | null { return this._unit; }
  get adjacentEnemies(): readonly Unit[] { return this._enemies; }
  get selectedAction(): MenuAction | null { return this._selectedAction; }
  get selectedTarget(): Unit | null { return this._selectedTarget; }

  show(unit: Unit, enemies: Unit[]): void {
    this._unit = unit;
    this._enemies = enemies;
    this._selectedAction = null;
    this._selectedTarget = null;
    this._state = MenuState.CHOOSE_ACTION;
  }

  selectAction(action: MenuAction): void {
    if (this._state !== MenuState.CHOOSE_ACTION) {
      throw new Error(`Cannot select action in state ${this._state}`);
    }
    this._selectedAction = action;
    if (action === MenuAction.END_TURN) {
      this._state = MenuState.RESOLVED;
    } else {
      this._state = MenuState.CHOOSE_TARGET;
    }
  }

  selectTarget(target: Unit): void {
    if (this._state !== MenuState.CHOOSE_TARGET) {
      throw new Error(`Cannot select target in state ${this._state}`);
    }
    this._selectedTarget = target;
    this._state = MenuState.RESOLVED;
  }

  reset(): void {
    this._state = MenuState.HIDDEN;
    this._unit = null;
    this._enemies = [];
    this._selectedAction = null;
    this._selectedTarget = null;
  }
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/ui/BattleMenu.ts src/game/ui/__tests__/BattleMenu.test.ts
git commit -m "feat: add BattleMenu state machine for Fight/End Turn flow"
```

---

### Task 9.3: Build the BattleDisplayState animation sequencer

**Objective:** Pure model of the battle animation timeline. Fire Emblem-style sequence: `INTRO → ATTACKER_STRIKE → DEFENDER_RECOIL → (DEFENDER_COUNTER → ATTACKER_RECOIL) → DONE`. Tracks HP snapshots so the renderer can animate bars.

**Files:**
- Create: `src/game/ui/BattleDisplayState.ts`
- Create: `src/game/ui/__tests__/BattleDisplayState.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/ui/__tests__/BattleDisplayState.test.ts
import { describe, it, expect } from 'vitest';
import { BattleDisplayState, BattlePhase } from '../BattleDisplayState';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { CombatLogEntry } from '../../combat/Engine';

describe('BattleDisplayState', () => {
  const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });

  function makeLogEntry(attacker: Unit, defender: Unit, damage: number, hit: boolean): CombatLogEntry {
    return {
      attacker,
      defender,
      hit,
      critical: false,
      damage,
      displayHit: 80,
      displayCrit: 3,
    };
  }

  it('starts at INTRO', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, { ...enemyStats }, 6, 5);
    const state = new BattleDisplayState(attacker, defender, [makeLogEntry(attacker, defender, 8, true)]);
    expect(state.phase).toBe(BattlePhase.INTRO);
  });

  it('captures initial HP snapshots', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, { ...enemyStats }, 6, 5);
    const state = new BattleDisplayState(attacker, defender, [makeLogEntry(attacker, defender, 8, true)]);
    expect(state.attackerInitialHp).toBe(22);
    expect(state.defenderInitialHp).toBe(26);
  });

  it('advances through phases', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, { ...enemyStats }, 6, 5);
    const state = new BattleDisplayState(attacker, defender, [makeLogEntry(attacker, defender, 8, true)]);

    expect(state.canAdvance()).toBe(true);
    state.advance();
    expect(state.phase).toBe(BattlePhase.ATTACKER_STRIKE);

    state.advance();
    expect(state.phase).toBe(BattlePhase.DEFENDER_RECOIL);

    state.advance();
    expect(state.phase).toBe(BattlePhase.DONE);
    expect(state.canAdvance()).toBe(false);
  });

  it('includes counterattack phases when log has 2 entries', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, { ...enemyStats }, 6, 5);
    const log = [
      makeLogEntry(attacker, defender, 8, true),
      makeLogEntry(defender, attacker, 6, true),
    ];
    const state = new BattleDisplayState(attacker, defender, log);

    state.advance(); // ATTACKER_STRIKE
    state.advance(); // DEFENDER_RECOIL
    state.advance(); // DEFENDER_COUNTER
    state.advance(); // ATTACKER_RECOIL
    state.advance(); // DONE
    expect(state.phase).toBe(BattlePhase.DONE);
  });

  it('skips recoil phase on miss', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, { ...enemyStats }, 6, 5);
    const log = [makeLogEntry(attacker, defender, 0, false)];
    const state = new BattleDisplayState(attacker, defender, log);

    state.advance(); // ATTACKER_STRIKE
    state.advance(); // DEFENDER_RECOIL (miss, no damage)
    expect(state.phase).toBe(BattlePhase.DONE);
  });

  it('currentLogEntry maps to the correct combat log index', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, { ...enemyStats }, 6, 5);
    const log = [
      makeLogEntry(attacker, defender, 8, true),
      makeLogEntry(defender, attacker, 6, true),
    ];
    const state = new BattleDisplayState(attacker, defender, log);

    state.advance(); // ATTACKER_STRIKE → log[0]
    expect(state.currentLogEntry).toBe(log[0]);

    state.advance(); // DEFENDER_RECOIL
    state.advance(); // DEFENDER_COUNTER → log[1]
    expect(state.currentLogEntry).toBe(log[1]);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/ui/BattleDisplayState.ts
import { CombatLogEntry } from '../combat/Engine';
import { Unit } from '../units/Unit';

export const BattlePhase = {
  INTRO: 'intro',
  ATTACKER_STRIKE: 'attacker_strike',
  DEFENDER_RECOIL: 'defender_recoil',
  DEFENDER_COUNTER: 'defender_counter',
  ATTACKER_RECOIL: 'attacker_recoil',
  DONE: 'done',
} as const;
export type BattlePhase = (typeof BattlePhase)[keyof typeof BattlePhase];

const PHASE_ORDER: BattlePhase[] = [
  BattlePhase.INTRO,
  BattlePhase.ATTACKER_STRIKE,
  BattlePhase.DEFENDER_RECOIL,
  BattlePhase.DEFENDER_COUNTER,
  BattlePhase.ATTACKER_RECOIL,
  BattlePhase.DONE,
];

export class BattleDisplayState {
  readonly attackerInitialHp: number;
  readonly defenderInitialHp: number;
  private log: CombatLogEntry[];
  private index: number = 0;

  constructor(
    public readonly attacker: Unit,
    public readonly defender: Unit,
    log: CombatLogEntry[],
  ) {
    this.attackerInitialHp = attacker.stats.hp;
    this.defenderInitialHp = defender.stats.hp;
    this.log = log;
  }

  get phase(): BattlePhase {
    return PHASE_ORDER[this.index];
  }

  get currentLogEntry(): CombatLogEntry | null {
    if (this.phase === BattlePhase.ATTACKER_STRIKE || this.phase === BattlePhase.DEFENDER_RECOIL) {
      return this.log[0] ?? null;
    }
    if (this.phase === BattlePhase.DEFENDER_COUNTER || this.phase === BattlePhase.ATTACKER_RECOIL) {
      return this.log[1] ?? null;
    }
    return null;
  }

  canAdvance(): boolean {
    return this.index < PHASE_ORDER.length - 1;
  }

  advance(): void {
    if (!this.canAdvance()) return;

    // Skip counter phases if there is no counterattack log entry
    const next = PHASE_ORDER[this.index + 1];
    if (next === BattlePhase.DEFENDER_COUNTER && !this.log[1]) {
      this.index += 2; // skip DEFENDER_COUNTER and ATTACKER_RECOIL
      return;
    }

    this.index++;
  }
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/ui/BattleDisplayState.ts src/game/ui/__tests__/BattleDisplayState.test.ts
git commit -m "feat: add BattleDisplayState animation sequencer"
```

---

### Task 9.4: Extend GameEngine with player combat initiation

**Objective:** Add `getWeaponForUnit()`, `getAdjacentEnemies()`, and `resolvePlayerCombat()` to the GameEngine so the Phaser layer can drive the full player attack flow.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

Add to `GameEngine.test.ts`:

```typescript
import { getAdjacentEnemies } from '../combat/Adjacency';
import { WEAPON_DB } from '../combat/Weapons';
import { CombatEngine } from '../combat/Engine';
import { UnitClass } from '../units/Unit';
import { Faction } from '../units/Unit';

// Existing imports plus:

describe('GameEngine player combat', () => {
  const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });

  it('getWeaponForUnit returns correct weapon by class', () => {
    const engine = new GameEngine(10, 10);
    const mage = engine.addUnit('m1', 'Mage', Faction.ENEMY, UnitClass.MAGE, stats, 0, 0);
    const brigand = engine.addUnit('b1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
    expect(engine.getWeaponForUnit(mage).name).toBe('Fire');
    expect(engine.getWeaponForUnit(brigand).name).toBe('Iron Axe');
  });

  it('getAdjacentEnemies returns adjacent enemies after move', () => {
    const engine = new GameEngine(10, 10);
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);
    const enemies = engine.getAdjacentEnemies(player);
    expect(enemies).toHaveLength(1);
  });

  it('resolvePlayerCombat returns a CombatResult with log', () => {
    const engine = new GameEngine(10, 10);
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);

    const result = engine.resolvePlayerCombat(player, enemy, () => 0); // guaranteed hit
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log[0].attacker).toBe(player);
    expect(result.log[0].defender).toBe(enemy);
  });

  it('resolvePlayerCombat applies damage to units', () => {
    const engine = new GameEngine(10, 10);
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);
    const enemyHpBefore = enemy.stats.hp;

    engine.resolvePlayerCombat(player, enemy, () => 0);
    expect(enemy.stats.hp).toBeLessThan(enemyHpBefore);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Modify GameEngine.ts**

```typescript
// Add imports at top:
import { getAdjacentEnemies } from './combat/Adjacency';
import { CombatEngine } from './combat/Engine';
import { WeaponData } from './combat/Weapons';

// Add methods inside GameEngine class:

getWeaponForUnit(unit: Unit): WeaponData {
  if (unit.unitClass === 'mage') return WEAPON_DB.Fire;
  if (unit.unitClass === 'brigand') return WEAPON_DB['Iron Axe'];
  if (unit.unitClass === 'soldier') return WEAPON_DB['Iron Lance'];
  return WEAPON_DB['Iron Sword'];
}

getAdjacentEnemies(unit: Unit): Unit[] {
  return getAdjacentEnemies(unit, this.grid, this.getWeaponForUnit(unit));
}

resolvePlayerCombat(attacker: Unit, defender: Unit, rng?: () => number): import('./combat/Engine').CombatResult {
  const combat = new CombatEngine(this.grid);
  const attWeapon = this.getWeaponForUnit(attacker);
  const defWeapon = this.getWeaponForUnit(defender);
  return combat.resolveCombat(attacker, defender, attWeapon, defWeapon, rng);
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat: extend GameEngine with player combat methods"
```

---

### Task 9.5: Create barrel exports for UI module

**File:** `src/game/ui/index.ts`

```typescript
export { BattleMenu, MenuState, MenuAction } from './BattleMenu';
export { BattleDisplayState, BattlePhase } from './BattleDisplayState';
```

Commit.

---

### Task 9.6: Refactor BattleScene to show post-move menu and target selection

**Objective:** After a player unit moves, transition it to `MENU` state, detect adjacent enemies, and show the Fight / End Turn menu. If Fight is selected, highlight adjacent enemies; clicking one initiates battle mode.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

This task is Phaser rendering — no new pure-logic tests needed (covered by Tasks 9.1–9.4). We do a manual integration check in the browser.

**Step 1: Add menu and battle mode fields to BattleScene**

```typescript
// Add to class fields:
private battleMenu: BattleMenu;
private menuTexts: Phaser.GameObjects.Text[] = [];
private battleOverlay: Phaser.GameObjects.Container | null = null;
private battleDisplayState: BattleDisplayState | null = null;
private inBattleMode = false;
```

**Step 2: Update handleTileClick for post-move menu flow**

```typescript
private handleTileClick(gx: number, gy: number): void {
  if (!this.engine.turnManager.isPlayerPhase()) return;

  // Battle mode blocks map input
  if (this.inBattleMode) return;

  const clickedUnit = this.engine.getUnit(gx, gy);

  // If menu is open, handle menu/target selection
  if (this.battleMenu.isVisible) {
    this.handleMenuInput(gx, gy, clickedUnit);
    return;
  }

  // Move selected unit
  if (this.selectedUnit) {
    const range = this.engine.getMoveRange(this.selectedUnit);
    const key = `${String(gx)},${String(gy)}`;
    if (range.has(key) && !clickedUnit) {
      const unitToMove = this.selectedUnit;
      this.tweens.add({
        targets: this.unitSprites.get(this.selectedUnit.id),
        x: this.offsetX + gx * TILE_SIZE + TILE_SIZE / 2,
        y: this.offsetY + gy * TILE_SIZE + TILE_SIZE / 2,
        duration: 300,
        onComplete: () => {
          this.engine.moveUnit(unitToMove, gx, gy);
          unitToMove.state.transition(UNIT_STATE.MOVING);
          unitToMove.state.transition(UNIT_STATE.MENU);
          this.showPostMoveMenu(unitToMove);
        },
      });
      return;
    }
  }

  // Select a fresh player unit
  if (clickedUnit && clickedUnit.isPlayer && !clickedUnit.hasActed) {
    this.selectedUnit = clickedUnit;
    this.showMoveRange(clickedUnit);
  }
}
```

**Step 3: Add post-move menu rendering**

```typescript
private showPostMoveMenu(unit: Unit): void {
  this.moveGraphics.clear();
  this.selectedUnit = null;

  const enemies = this.engine.getAdjacentEnemies(unit);
  this.battleMenu.show(unit, enemies);

  const px = this.offsetX + unit.gridX * TILE_SIZE + TILE_SIZE / 2;
  const py = this.offsetY + unit.gridY * TILE_SIZE - TILE_SIZE;

  const fightText = this.add.text(px, py, '[ Fight ]', {
    fontSize: '14px',
    color: '#ffffff',
    backgroundColor: enemies.length > 0 ? '#c0392b' : '#7f8c8d',
    padding: { x: 8, y: 4 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: enemies.length > 0 });

  const endText = this.add.text(px, py + 24, '[ End Turn ]', {
    fontSize: '14px',
    color: '#ffffff',
    backgroundColor: '#2c3e50',
    padding: { x: 8, y: 4 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  if (enemies.length > 0) {
    fightText.on('pointerdown', () => {
      this.battleMenu.selectAction(MenuAction.FIGHT);
      this.clearMenuTexts();
      this.highlightEnemyTargets(enemies);
    });
  }

  endText.on('pointerdown', () => {
    this.battleMenu.selectAction(MenuAction.END_TURN);
    unit.state.transition(UNIT_STATE.EXHAUSTED);
    this.clearMenuTexts();
    this.syncUnitSprites();
  });

  this.menuTexts.push(fightText, endText);
}

private clearMenuTexts(): void {
  for (const text of this.menuTexts) {
    text.destroy();
  }
  this.menuTexts = [];
}

private highlightEnemyTargets(enemies: Unit[]): void {
  this.moveGraphics.clear();
  for (const enemy of enemies) {
    this.moveGraphics.fillStyle(0xe74c3c, 0.5);
    this.moveGraphics.fillRect(
      this.offsetX + enemy.gridX * TILE_SIZE,
      this.offsetY + enemy.gridY * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
    );
    this.moveGraphics.lineStyle(2, 0xff0000);
    this.moveGraphics.strokeRect(
      this.offsetX + enemy.gridX * TILE_SIZE,
      this.offsetY + enemy.gridY * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
    );
  }
}

private handleMenuInput(gx: number, gy: number, clickedUnit: Unit | null): void {
  if (this.battleMenu.state === MenuState.CHOOSE_TARGET && clickedUnit && clickedUnit.isEnemy) {
    const validTarget = this.battleMenu.adjacentEnemies.find(e => e.id === clickedUnit.id);
    if (validTarget) {
      this.battleMenu.selectTarget(validTarget);
      this.clearMenuTexts();
      this.moveGraphics.clear();
      this.startBattleMode(this.battleMenu.unit!, validTarget);
    }
  }
}
```

**Step 4: Add battle mode overlay and animation**

```typescript
private startBattleMode(attacker: Unit, defender: Unit): void {
  this.inBattleMode = true;
  const result = this.engine.resolvePlayerCombat(attacker, defender);
  this.battleDisplayState = new BattleDisplayState(attacker, defender, result.log);

  // Create overlay container
  const overlay = this.add.container(0, 0);
  const bg = this.add.rectangle(
    this.cameras.main.width / 2,
    this.cameras.main.height / 2,
    this.cameras.main.width,
    this.cameras.main.height,
    0x000000,
    0.7,
  );
  overlay.add(bg);

  // Attacker panel (left)
  const attX = this.cameras.main.width * 0.25;
  const attY = this.cameras.main.height * 0.5;
  const attPanel = this.createUnitBattlePanel(attacker, attX, attY, 0x3498db);
  overlay.add(attPanel);

  // Defender panel (right)
  const defX = this.cameras.main.width * 0.75;
  const defY = this.cameras.main.height * 0.5;
  const defPanel = this.createUnitBattlePanel(defender, defX, defY, 0xe74c3c);
  overlay.add(defPanel);

  // VS label
  const vsText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height * 0.3, 'VS', {
    fontSize: '32px',
    color: '#f1c40f',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  overlay.add(vsText);

  this.battleOverlay = overlay;

  // Start animation sequence
  this.time.delayedCall(800, () => this.runBattleAnimation());
}

private createUnitBattlePanel(
  unit: Unit,
  x: number,
  y: number,
  color: number,
): Phaser.GameObjects.Container {
  const panel = this.add.container(x, y);

  // Background box
  const box = this.add.rectangle(0, 0, 200, 140, 0x2c3e50, 0.9);
  box.setStrokeStyle(2, color);
  panel.add(box);

  // Name
  const nameText = this.add.text(0, -50, unit.name, {
    fontSize: '18px',
    color: '#ecf0f1',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  panel.add(nameText);

  // Class
  const classText = this.add.text(0, -30, unit.unitClass, {
    fontSize: '12px',
    color: '#bdc3c7',
  }).setOrigin(0.5);
  panel.add(classText);

  // HP label
  const hpLabel = this.add.text(-70, 10, 'HP', {
    fontSize: '12px',
    color: '#bdc3c7',
  }).setOrigin(0, 0.5);
  panel.add(hpLabel);

  // HP bar background
  const hpBg = this.add.rectangle(10, 10, 120, 12, 0x000000);
  panel.add(hpBg);

  // HP bar fill
  const hpRatio = unit.stats.hp / unit.stats.maxHp;
  const hpColor = hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf1c40f : 0xe74c3c;
  const hpFill = this.add.rectangle(-50 + (120 * hpRatio) / 2, 10, 120 * hpRatio, 12, hpColor);
  hpFill.setName('hpFill');
  panel.add(hpFill);

  // HP text
  const hpText = this.add.text(10, 30, `${unit.stats.hp} / ${unit.stats.maxHp}`, {
    fontSize: '14px',
    color: '#ecf0f1',
  }).setOrigin(0.5);
  hpText.setName('hpText');
  panel.add(hpText);

  return panel;
}

private runBattleAnimation(): void {
  if (!this.battleDisplayState || !this.battleOverlay) return;

  const state = this.battleDisplayState;
  if (!state.canAdvance()) {
    this.endBattleMode();
    return;
  }

  state.advance();
  const entry = state.currentLogEntry;

  if (state.phase === BattlePhase.ATTACKER_STRIKE || state.phase === BattlePhase.DEFENDER_COUNTER) {
    // Flash the attacker
    const isCounter = state.phase === BattlePhase.DEFENDER_COUNTER;
    const actor = isCounter ? state.defender : state.attacker;
    const target = isCounter ? state.attacker : state.defender;

    // Camera shake on hit
    if (entry && entry.hit) {
      this.cameras.main.shake(100, entry.critical ? 0.015 : 0.005);
    }

    this.time.delayedCall(400, () => {
      if (entry && entry.hit) {
        this.showDamageNumber(target, entry.damage, entry.critical);
      } else if (entry) {
        this.showMissText(target);
      }
      this.updateBattleHpBars();
      this.time.delayedCall(600, () => this.runBattleAnimation());
    });
  } else if (state.phase === BattlePhase.DEFENDER_RECOIL || state.phase === BattlePhase.ATTACKER_RECOIL) {
    // Recoil phase — just advance after brief pause
    this.time.delayedCall(300, () => this.runBattleAnimation());
  } else {
    this.time.delayedCall(200, () => this.runBattleAnimation());
  }
}

private showDamageNumber(target: Unit, damage: number, critical: boolean): void {
  if (!this.battleOverlay) return;
  const isLeft = target.id === this.battleDisplayState!.attacker.id;
  const x = this.cameras.main.width * (isLeft ? 0.25 : 0.75);
  const y = this.cameras.main.height * 0.5 - 80;

  const text = this.add.text(x, y, critical ? `${damage}!` : String(damage), {
    fontSize: critical ? '28px' : '22px',
    color: critical ? '#e74c3c' : '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4,
  }).setOrigin(0.5);
  this.battleOverlay.add(text);

  this.tweens.add({
    targets: text,
    y: y - 40,
    alpha: 0,
    duration: 800,
    onComplete: () => text.destroy(),
  });
}

private showMissText(target: Unit): void {
  if (!this.battleOverlay) return;
  const isLeft = target.id === this.battleDisplayState!.attacker.id;
  const x = this.cameras.main.width * (isLeft ? 0.25 : 0.75);
  const y = this.cameras.main.height * 0.5 - 80;

  const text = this.add.text(x, y, 'Miss', {
    fontSize: '20px',
    color: '#95a5a6',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5);
  this.battleOverlay.add(text);

  this.tweens.add({
    targets: text,
    y: y - 30,
    alpha: 0,
    duration: 600,
    onComplete: () => text.destroy(),
  });
}

private updateBattleHpBars(): void {
  if (!this.battleDisplayState || !this.battleOverlay) return;
  const { attacker, defender } = this.battleDisplayState;

  // Update attacker HP bar
  this.updatePanelHp(attacker, 0x3498db);
  // Update defender HP bar
  this.updatePanelHp(defender, 0xe74c3c);
}

private updatePanelHp(unit: Unit, color: number): void {
  const isLeft = unit.id === this.battleDisplayState!.attacker.id;
  const panelIndex = isLeft ? 2 : 3; // overlay children: bg, vsText, attPanel, defPanel
  const panel = this.battleOverlay!.getAt(panelIndex) as Phaser.GameObjects.Container;

  const hpRatio = Math.max(0, unit.stats.hp / unit.stats.maxHp);
  const hpColor = hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf1c40f : 0xe74c3c;

  const oldFill = panel.getByName('hpFill') as Phaser.GameObjects.Rectangle;
  if (oldFill) {
    oldFill.destroy();
  }
  const newFill = this.add.rectangle(-50 + (120 * hpRatio) / 2, 10, 120 * hpRatio, 12, hpColor);
  newFill.setName('hpFill');
  panel.add(newFill);

  const hpText = panel.getByName('hpText') as Phaser.GameObjects.Text;
  if (hpText) {
    hpText.setText(`${unit.stats.hp} / ${unit.stats.maxHp}`);
  }
}

private endBattleMode(): void {
  this.inBattleMode = false;
  if (this.battleOverlay) {
    this.tweens.add({
      targets: this.battleOverlay,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        this.battleOverlay?.destroy();
        this.battleOverlay = null;
        this.syncUnitSprites();
      },
    });
  }

  // Exhaust the player unit
  if (this.battleDisplayState?.attacker.isPlayer) {
    const unit = this.battleDisplayState.attacker;
    if (unit.state.current === UNIT_STATE.MENU) {
      unit.state.transition(UNIT_STATE.EXHAUSTED);
    }
  }

  this.battleDisplayState = null;
  this.battleMenu.reset();
}
```

**Step 5: Add BattleMenu import to BattleScene**

```typescript
import { BattleMenu, MenuState, MenuAction } from '../game/ui/BattleMenu';
import { BattleDisplayState, BattlePhase } from '../game/ui/BattleDisplayState';
import { UNIT_STATE } from '../game/state/UnitState';
```

**Step 6: Initialize `battleMenu` in `create()`**

```typescript
this.battleMenu = new BattleMenu();
```

**Step 7: Update End Turn button to clear any open menu**

In `createUI()`, before `this.engine.endTurn()`:

```typescript
this.battleMenu.reset();
this.clearMenuTexts();
this.moveGraphics.clear();
this.selectedUnit = null;
```

**Step 8: Verify in browser**

```bash
npm run dev
```

- Click a player unit → move range appears.
- Click a destination tile → unit moves, Fight/End Turn menu appears.
- Click End Turn → unit grays out, turn continues.
- Click Fight (only if enemies adjacent) → adjacent enemies highlighted in red.
- Click an enemy target → battle overlay fades in with both units' HP bars.
- Watch attack animation, damage numbers, HP bar shrink, counterattack if in range.
- Overlay fades out, map returns, unit is exhausted.

**Step 9: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: add player battle mode with menu, target selection, and combat animation"
```

---

## Verification Checklist

- [ ] `npx vitest run` passes all tests
- [ ] `getAdjacentEnemies` respects weapon range (sword 1, bow 2, magic 1–2)
- [ ] `BattleMenu` transitions correctly through HIDDEN → CHOOSE_ACTION → CHOOSE_TARGET → RESOLVED
- [ ] `BattleMenu` throws on invalid state transitions
- [ ] `BattleDisplayState` sequences INTRO → ATTACKER_STRIKE → DEFENDER_RECOIL → DEFENDER_COUNTER → ATTACKER_RECOIL → DONE
- [ ] `BattleDisplayState` skips counter phases when there is no counterattack
- [ ] `GameEngine.getAdjacentEnemies` returns only alive enemies of opposing faction
- [ ] `GameEngine.resolvePlayerCombat` applies damage and returns a log
- [ ] BattleScene shows Fight/End Turn menu after movement
- [ ] Fight is disabled when no adjacent enemies
- [ ] Clicking an enemy target enters battle mode overlay
- [ ] Battle overlay shows both units' names, classes, and HP bars
- [ ] Damage numbers animate on hit, "Miss" text on miss
- [ ] HP bars update after each strike
- [ ] Camera shakes on hit (stronger on crit)
- [ ] After battle mode, unit is exhausted and map returns
- [ ] No Phaser imports in any `src/game/` file

---

## Next Phase

Proceed to Phase 10: **Items, Inventory, and Equipment** (weapons as items, equipping, durability).
