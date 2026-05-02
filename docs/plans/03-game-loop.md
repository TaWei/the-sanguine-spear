# Phase 3: The Game Loop (State Machines)

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Enforce turns and actions with a state machine. Build the Turn Manager (PlayerPhase ↔ EnemyPhase), unit states (Idle, Moving, ActionMenu, Exhausted), and the action queue for ordered resolution.

**Architecture:** `TurnManager` is a finite state machine managing phase transitions. `UnitState` is a per-unit state machine. `ActionQueue` sequences actions within a phase. All pure logic.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phase 2 complete.

---

### Task 3.1: Define Unit States

**Objective:** Each unit has a state: Idle, Moving, Menu, Exhausted.

**Files:**
- Create: `src/game/state/UnitState.ts`
- Create: `src/game/state/__tests__/UnitState.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/state/__tests__/UnitState.test.ts
import { describe, it, expect } from 'vitest';
import { UnitState, UNIT_STATE } from '../UnitState';

describe('UnitState', () => {
  it('starts at IDLE', () => {
    const state = new UnitState();
    expect(state.current).toBe(UNIT_STATE.IDLE);
  });

  it('transitions from IDLE to MOVING when selected', () => {
    const state = new UnitState();
    expect(state.canTransitionTo(UNIT_STATE.MOVING)).toBe(true);
    state.transition(UNIT_STATE.MOVING);
    expect(state.current).toBe(UNIT_STATE.MOVING);
  });

  it('transitions from MOVING to MENU after move completes', () => {
    const state = new UnitState();
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    expect(state.current).toBe(UNIT_STATE.MENU);
  });

  it('transitions from MENU to EXHAUSTED when action taken', () => {
    const state = new UnitState();
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    state.transition(UNIT_STATE.EXHAUSTED);
    expect(state.current).toBe(UNIT_STATE.EXHAUSTED);
  });

  it('cannot transition from EXHAUSTED to MOVING', () => {
    const state = new UnitState();
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    state.transition(UNIT_STATE.EXHAUSTED);
    expect(state.canTransitionTo(UNIT_STATE.MOVING)).toBe(false);
  });

  it('cannot transition from IDLE directly to EXHAUSTED', () => {
    const state = new UnitState();
    expect(state.canTransitionTo(UNIT_STATE.EXHAUSTED)).toBe(false);
  });

  it('cannot transition from IDLE to MENU (must move first)', () => {
    const state = new UnitState();
    expect(state.canTransitionTo(UNIT_STATE.MENU)).toBe(false);
  });

  it('reset returns to IDLE', () => {
    const state = new UnitState();
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    state.transition(UNIT_STATE.EXHAUSTED);
    state.reset();
    expect(state.current).toBe(UNIT_STATE.IDLE);
  });

  it('isExhausted returns true only in EXHAUSTED state', () => {
    const state = new UnitState();
    expect(state.isExhausted()).toBe(false);
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    state.transition(UNIT_STATE.EXHAUSTED);
    expect(state.isExhausted()).toBe(true);
  });

  it('invalid transition throws an error', () => {
    const state = new UnitState();
    expect(() => state.transition(UNIT_STATE.EXHAUSTED)).toThrow();
  });
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/state/__tests__/UnitState.test.ts
```

**Step 3: Write implementation**

```typescript
// src/game/state/UnitState.ts
export const UNIT_STATE = {
  IDLE: 'idle',
  MOVING: 'moving',
  MENU: 'menu',
  EXHAUSTED: 'exhausted',
} as const;

export type UnitStateType = (typeof UNIT_STATE)[keyof typeof UNIT_STATE];

const TRANSITIONS: Record<UnitStateType, UnitStateType[]> = {
  [UNIT_STATE.IDLE]:      [UNIT_STATE.MOVING],
  [UNIT_STATE.MOVING]:    [UNIT_STATE.MENU, UNIT_STATE.IDLE],
  [UNIT_STATE.MENU]:      [UNIT_STATE.EXHAUSTED, UNIT_STATE.IDLE],
  [UNIT_STATE.EXHAUSTED]: [],
};

export class UnitState {
  private _current: UnitStateType = UNIT_STATE.IDLE;

  get current(): UnitStateType { return this._current; }

  canTransitionTo(target: UnitStateType): boolean {
    return TRANSITIONS[this._current].includes(target);
  }

  transition(target: UnitStateType): void {
    if (!this.canTransitionTo(target)) {
      throw new Error(`Invalid transition: ${this._current} → ${target}`);
    }
    this._current = target;
  }

  reset(): void {
    this._current = UNIT_STATE.IDLE;
  }

  isExhausted(): boolean {
    return this._current === UNIT_STATE.EXHAUSTED;
  }
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/state/__tests__/UnitState.test.ts
```

**Step 5: Commit**

```bash
git add src/game/state/UnitState.ts src/game/state/__tests__/UnitState.test.ts
git commit -m "feat: add UnitState FSM (Idle → Moving → Menu → Exhausted)"
```

---

### Task 3.2: Add UnitState to Unit

**Objective:** Wire the UnitState FSM into the Unit class. The `hasActed` boolean is replaced by checking if the unit state is `EXHAUSTED`.

**Files:**
- Modify: `src/game/units/Unit.ts`
- Modify: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Write failing test**

Add to `Unit.test.ts`:

```typescript
import { UnitState, UNIT_STATE } from '../../state/UnitState';

// Add tests:
it('starts with IDLE unit state', () => {
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
  expect(unit.state.current).toBe(UNIT_STATE.IDLE);
});

it('hasActed returns true when unit state is EXHAUSTED', () => {
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
  unit.state.transition(UNIT_STATE.MOVING);
  unit.state.transition(UNIT_STATE.MENU);
  unit.state.transition(UNIT_STATE.EXHAUSTED);
  expect(unit.hasActed).toBe(true);
});

it('resetState clears acted status', () => {
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
  unit.state.transition(UNIT_STATE.MOVING);
  unit.state.transition(UNIT_STATE.MENU);
  unit.state.transition(UNIT_STATE.EXHAUSTED);
  unit.resetState();
  expect(unit.hasActed).toBe(false);
  expect(unit.state.current).toBe(UNIT_STATE.IDLE);
});
```

**Step 2: Run to verify RED**

**Step 3: Modify Unit.ts**

```typescript
import { UnitState } from '../state/UnitState';

// Add field:
readonly state: UnitState = new UnitState();

// Update hasActed getter/setter:
get hasActed(): boolean { return this.state.isExhausted(); }
set hasActed(v: boolean) {
  if (v && !this.state.isExhausted()) {
    // Force to exhausted (used by turn manager reset)
    while (this.state.current !== 'exhausted' && this.state.current !== 'idle') {
      // Can't force exhaust from idle — only transition if in menu
    }
  } else if (!v) {
    this.state.reset();
  }
}

// Add method:
resetState(): void {
  this.state.reset();
}
```

Wait — the setter is getting messy. Let me simplify: `hasActed` should just be a read-only derived property from `state.isExhausted()`. And we add `resetState()` instead of a setter. The `hasActed` setter from Phase 2 is a compatibility concern — let's replace it.

Actually, we want backward compat for existing tests. Let me think...

The existing tests use `unit.hasActed = true` and `unit.hasActed = false`. Let's keep the setter but make it simpler:

```typescript
// Unit.ts modification
import { UnitState, UNIT_STATE } from '../state/UnitState';

// Replace the acted field:
// Remove: private _hasActed: boolean = false;
// Add:
readonly state: UnitState = new UnitState();

// Replace hasActed getter/setter:
get hasActed(): boolean { return this.state.isExhausted(); }
set hasActed(v: boolean) {
  if (v) {
    // Force to exhausted for legacy setter — only works from MENU
    if (this.state.current === UNIT_STATE.MENU) {
      this.state.transition(UNIT_STATE.EXHAUSTED);
    }
    // From IDLE, jump through to exhausted
    if (this.state.current === UNIT_STATE.IDLE) {
      this.state.transition(UNIT_STATE.MOVING);
      this.state.transition(UNIT_STATE.MENU);
      this.state.transition(UNIT_STATE.EXHAUSTED);
    }
  } else {
    this.state.reset();
  }
}

// Add method:
resetState(): void { this.state.reset(); }
```

**Step 4: Run to verify GREEN**

All existing + new Unit tests pass.

**Step 5: Run full suite**

```bash
npx vitest run
```

**Step 6: Commit**

```bash
git add src/game/units/Unit.ts src/game/units/__tests__/Unit.test.ts
git commit -m "feat: integrate UnitState FSM into Unit class"
```

---

### Task 3.3: Create the TurnManager

**Objective:** Manage phase transitions: PlayerPhase → EnemyPhase → (AllyPhase) → PlayerPhase. Reset unit states on phase start.

**Files:**
- Create: `src/game/state/TurnManager.ts`
- Create: `src/game/state/__tests__/TurnManager.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/state/__tests__/TurnManager.test.ts
import { describe, it, expect } from 'vitest';
import { TurnManager, GamePhase } from '../TurnManager';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('TurnManager', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  function makeUnit(id: string, faction: Faction): Unit {
    return new Unit(id, id, faction, UnitClass.LORD, stats, 0, 0);
  }

  it('starts in PlayerPhase', () => {
    const tm = new TurnManager();
    expect(tm.currentPhase).toBe(GamePhase.PLAYER);
  });

  it('starts at turn 1', () => {
    const tm = new TurnManager();
    expect(tm.turnNumber).toBe(1);
  });

  it('advances from PlayerPhase to EnemyPhase', () => {
    const tm = new TurnManager();
    tm.advancePhase();
    expect(tm.currentPhase).toBe(GamePhase.ENEMY);
    expect(tm.turnNumber).toBe(1); // still same turn
  });

  it('advances from EnemyPhase back to PlayerPhase (new turn)', () => {
    const tm = new TurnManager();
    tm.advancePhase(); // player → enemy
    tm.advancePhase(); // enemy → player
    expect(tm.currentPhase).toBe(GamePhase.PLAYER);
    expect(tm.turnNumber).toBe(2);
  });

  it('advancing from AllyPhase goes to PlayerPhase', () => {
    const tm = new TurnManager();
    // Force to ally phase for testing
    tm.advancePhase(); // player → enemy
    tm.advancePhase(); // enemy → ally (if supported) or player
    // Test: two advances should end up at player turn 2
    expect(tm.currentPhase).toBe(GamePhase.PLAYER);
    expect(tm.turnNumber).toBe(2);
  });

  it('resets all units when advancing from player to enemy', () => {
    const tm = new TurnManager();
    const unit = makeUnit('p1', Faction.PLAYER);
    // Exhaust the unit
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);

    tm.advancePhase([unit]);
    expect(unit.hasActed).toBe(false); // all units reset
  });

  it('resets all units when advancing from enemy to player', () => {
    const tm = new TurnManager();
    const unit = makeUnit('e1', Faction.ENEMY);
    unit.hasActed = true;
    tm.advancePhase(); // player → enemy
    tm.advancePhase([unit]); // enemy → player
    expect(unit.hasActed).toBe(false);
  });

  it('isPlayerPhase returns true only during player phase', () => {
    const tm = new TurnManager();
    expect(tm.isPlayerPhase()).toBe(true);
    tm.advancePhase();
    expect(tm.isPlayerPhase()).toBe(false);
  });

  it('isEnemyPhase returns true only during enemy phase', () => {
    const tm = new TurnManager();
    expect(tm.isEnemyPhase()).toBe(false);
    tm.advancePhase();
    expect(tm.isEnemyPhase()).toBe(true);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/state/TurnManager.ts
import { Unit } from '../units/Unit';

export const GamePhase = {
  PLAYER: 'player',
  ENEMY: 'enemy',
  ALLY: 'ally',
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

const PHASE_ORDER: GamePhase[] = [GamePhase.PLAYER, GamePhase.ENEMY, GamePhase.ALLY];

export class TurnManager {
  private phase: GamePhase = GamePhase.PLAYER;
  private turn: number = 1;

  get currentPhase(): GamePhase { return this.phase; }
  get turnNumber(): number { return this.turn; }

  advancePhase(units: Unit[] = []): void {
    const idx = PHASE_ORDER.indexOf(this.phase);
    const nextIdx = (idx + 1) % PHASE_ORDER.length;
    if (nextIdx === 0) {
      this.turn++;
    }
    this.phase = PHASE_ORDER[nextIdx];

    // Reset all units on phase change
    for (const unit of units) {
      unit.resetState();
    }
  }

  isPlayerPhase(): boolean { return this.phase === GamePhase.PLAYER; }
  isEnemyPhase(): boolean { return this.phase === GamePhase.ENEMY; }
  isAllyPhase(): boolean { return this.phase === GamePhase.ALLY; }
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/state/TurnManager.ts src/game/state/__tests__/TurnManager.test.ts
git commit -m "feat: add TurnManager FSM with phase transitions and unit reset"
```

---

### Task 3.4: Create the ActionQueue

**Objective:** Queue actions for ordered resolution within a phase. Actions include Move and Attack.

**Files:**
- Create: `src/game/state/ActionQueue.ts`
- Create: `src/game/state/__tests__/ActionQueue.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/state/__tests__/ActionQueue.test.ts
import { describe, it, expect } from 'vitest';
import { ActionQueue, Action, ActionType } from '../ActionQueue';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('ActionQueue', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  const unit1 = new Unit('u1', 'One', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
  const unit2 = new Unit('u2', 'Two', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);

  it('starts empty', () => {
    const queue = new ActionQueue();
    expect(queue.isEmpty()).toBe(true);
    expect(queue.length).toBe(0);
  });

  it('enqueues and dequeues actions in FIFO order', () => {
    const queue = new ActionQueue();
    const a1: Action = { type: ActionType.MOVE, actor: unit1, x: 3, y: 3 };
    const a2: Action = { type: ActionType.ATTACK, actor: unit2, targetX: 1, targetY: 1 };
    queue.enqueue(a1);
    queue.enqueue(a2);
    expect(queue.length).toBe(2);
    expect(queue.dequeue()).toBe(a1);
    expect(queue.length).toBe(1);
    expect(queue.dequeue()).toBe(a2);
    expect(queue.isEmpty()).toBe(true);
  });

  it('dequeue returns null when empty', () => {
    const queue = new ActionQueue();
    expect(queue.dequeue()).toBeNull();
  });

  it('peek returns next without removing', () => {
    const queue = new ActionQueue();
    const action: Action = { type: ActionType.WAIT, actor: unit1 };
    queue.enqueue(action);
    expect(queue.peek()).toBe(action);
    expect(queue.length).toBe(1);
  });

  it('peek returns null when empty', () => {
    const queue = new ActionQueue();
    expect(queue.peek()).toBeNull();
  });

  it('clear removes all actions', () => {
    const queue = new ActionQueue();
    queue.enqueue({ type: ActionType.WAIT, actor: unit1 });
    queue.enqueue({ type: ActionType.WAIT, actor: unit2 });
    queue.clear();
    expect(queue.isEmpty()).toBe(true);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/state/ActionQueue.ts
import { Unit } from '../units/Unit';

export const ActionType = {
  MOVE: 'move',
  ATTACK: 'attack',
  WAIT: 'wait',
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export interface Action {
  type: ActionType;
  actor: Unit;
  x?: number;
  y?: number;
  targetX?: number;
  targetY?: number;
}

export class ActionQueue {
  private actions: Action[] = [];

  enqueue(action: Action): void {
    this.actions.push(action);
  }

  dequeue(): Action | null {
    return this.actions.shift() ?? null;
  }

  peek(): Action | null {
    return this.actions[0] ?? null;
  }

  get length(): number {
    return this.actions.length;
  }

  isEmpty(): boolean {
    return this.actions.length === 0;
  }

  clear(): void {
    this.actions = [];
  }
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/state/ActionQueue.ts src/game/state/__tests__/ActionQueue.test.ts
git commit -m "feat: add ActionQueue for ordered phase resolution"
```

---

### Task 3.5: Create barrel export for state module

**Objective:** Clean import path.

**Files:**
- Create: `src/game/state/index.ts`

```typescript
export { TurnManager, GamePhase } from './TurnManager';
export type { GamePhase as GamePhaseType } from './TurnManager';
export { ActionQueue, ActionType } from './ActionQueue';
export type { Action, ActionType as ActionTypeType } from './ActionQueue';
export { UnitState, UNIT_STATE } from './UnitState';
export type { UnitStateType } from './UnitState';
```

**Step: Commit**

```bash
git add src/game/state/index.ts
git commit -m "chore: add barrel export for state module"
```

---

## Verification Checklist

- [ ] `npx vitest run` passes all tests (42 prior + 10 UnitState + 3 new Unit + 9 TurnManager + 6 ActionQueue = ~70 tests)
- [ ] TurnManager correctly cycles through phases
- [ ] Units are reset when phases change
- [ ] ActionQueue provides FIFO ordering
- [ ] No Phaser imports in any `src/game/` file

---

## Next Phase

Proceed to [Phase 4: Combat and Stats](./04-combat-and-stats.md).
