# Staves and Healing Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task. Follow strict TDD: write failing test → watch it fail → minimal code → watch it pass → commit.

**Goal:** Add staves to the game. Staves allow units to heal friendly units by selecting them similar to an attack. On the unit action menu, units with a staff show a "Staff" option directly below "Fight". Elara (the mage) starts with a Heal staff.

**Architecture:**
- Staves are a new item kind (`staff`) with `healAmount`, `minRange`, `maxRange`, and `uses`.
- Pure healing logic lives in `src/game/staves/` mirroring the `src/game/combat/` pattern.
- `BattleMenu` gains a `STAFF` action and `CHOOSE_HEAL_TARGET` state.
- `BattleScene` renders the Staff menu option, highlights healable allies in green, and shows a `+N` heal floater.
- EXP is awarded for successful heals (simplified formula).

**Tech Stack:** TypeScript, Vitest, Phaser 3 (scene-level only).

---

## Task 1: Add `StaffItem` type and `createStaffItem` factory

**Objective:** Extend the item system to recognize staves as a distinct item kind.

**Files:**
- Modify: `src/game/items/ItemTypes.ts`
- Test: `src/game/items/__tests__/ItemTypes.test.ts` (create)

**Step 1: Write failing test**

Create `src/game/items/__tests__/ItemTypes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createStaffItem } from '../ItemTypes';

describe('createStaffItem', () => {
  it('creates a Heal staff with correct defaults', () => {
    const staff = createStaffItem('Heal', 10, 1, 1);
    expect(staff.kind).toBe('staff');
    expect(staff.name).toBe('Heal');
    expect(staff.healAmount).toBe(10);
    expect(staff.minRange).toBe(1);
    expect(staff.maxRange).toBe(1);
    expect(staff.uses).toBe(20);
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/items/__tests__/ItemTypes.test.ts
```
Expected: FAIL — `createStaffItem` is not exported.

**Step 3: Write minimal implementation**

Add to `src/game/items/ItemTypes.ts` after `StatBoosterItem`:

```typescript
export interface StaffItem {
  kind: 'staff';
  name: string;
  healAmount: number;
  minRange: number;
  maxRange: number;
  uses: number;
}
```

Update the `Item` union:
```typescript
export type Item = WeaponItem | RecoveryItem | KeyItem | StatBoosterItem | StaffItem;
```

Add at the bottom of the file:
```typescript
export function createStaffItem(
  name: string,
  healAmount: number,
  minRange: number,
  maxRange: number,
): StaffItem {
  return {
    kind: 'staff',
    name,
    healAmount,
    minRange,
    maxRange,
    uses: 20,
  };
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/items/__tests__/ItemTypes.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/game/items/ItemTypes.ts src/game/items/__tests__/ItemTypes.test.ts
git commit -m "feat: add StaffItem type and createStaffItem factory"
```

---

## Task 2: Create `Staves.ts` database

**Objective:** Define canonical staff data (starting with the basic Heal staff).

**Files:**
- Create: `src/game/staves/Staves.ts`
- Test: `src/game/staves/__tests__/Staves.test.ts` (create)

**Step 1: Write failing test**

Create `src/game/staves/__tests__/Staves.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { STAFF_DB } from '../Staves';

describe('STAFF_DB', () => {
  it('contains Heal staff with correct stats', () => {
    const heal = STAFF_DB['Heal'];
    expect(heal).toBeDefined();
    expect(heal.name).toBe('Heal');
    expect(heal.healAmount).toBe(10);
    expect(heal.minRange).toBe(1);
    expect(heal.maxRange).toBe(1);
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/staves/__tests__/Staves.test.ts
```
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

Create `src/game/staves/Staves.ts`:

```typescript
export interface StaffData {
  name: string;
  healAmount: number;
  minRange: number;
  maxRange: number;
}

export const STAFF_DB: Record<string, StaffData> = {
  Heal: {
    name: 'Heal',
    healAmount: 10,
    minRange: 1,
    maxRange: 1,
  },
};
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/staves/__tests__/Staves.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/game/staves/Staves.ts src/game/staves/__tests__/Staves.test.ts
git commit -m "feat: add Staves database with Heal staff"
```

---

## Task 3: Add `heal` method to `Unit`

**Objective:** Allow units to recover HP, clamped to `maxHp`.

**Files:**
- Modify: `src/game/units/Unit.ts`
- Test: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Write failing test**

In `src/game/units/__tests__/Unit.test.ts`, add:

```typescript
it('heal restores HP up to maxHp', () => {
  const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, createStats({
    hp: 10, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
  }), 0, 0);
  unit.takeDamage(5);
  expect(unit.stats.hp).toBe(5);
  unit.heal(8);
  expect(unit.stats.hp).toBe(13);
});

it('heal does not exceed maxHp', () => {
  const unit = new Unit('u2', 'Test', Faction.PLAYER, UnitClass.LORD, createStats({
    hp: 18, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
  }), 0, 0);
  unit.heal(10);
  expect(unit.stats.hp).toBe(20);
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```
Expected: FAIL — `heal` method does not exist.

**Step 3: Write minimal implementation**

Add to `src/game/units/Unit.ts` after `takeDamage`:

```typescript
heal(amount: number): void {
  this._stats = {
    ...this._stats,
    hp: Math.min(this._stats.maxHp, this._stats.hp + amount),
  };
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/game/units/Unit.ts src/game/units/__tests__/Unit.test.ts
git commit -m "feat: add Unit.heal method clamped to maxHp"
```

---

## Task 4: Create `computeStaffRange`

**Objective:** Compute all grid tiles within a staff's min/max range from a unit.

**Files:**
- Create: `src/game/staves/StaffRange.ts`
- Test: `src/game/staves/__tests__/StaffRange.test.ts`

**Step 1: Write failing test**

Create `src/game/staves/__tests__/StaffRange.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeStaffRange } from '../StaffRange';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { StaffData } from '../Staves';

describe('computeStaffRange', () => {
  const staff: StaffData = { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 };
  const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('returns adjacent tiles for range 1 staff', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const range = computeStaffRange(unit, grid, staff);
    expect(range).toContainEqual([2, 1]);
    expect(range).toContainEqual([2, 3]);
    expect(range).toContainEqual([1, 2]);
    expect(range).toContainEqual([3, 2]);
    expect(range).toHaveLength(4);
  });

  it('does not include the unit\'s own tile', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const range = computeStaffRange(unit, grid, staff);
    expect(range.some(([x, y]) => x === 2 && y === 2)).toBe(false);
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/staves/__tests__/StaffRange.test.ts
```
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

Create `src/game/staves/StaffRange.ts`:

```typescript
import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { StaffData } from './Staves';

export function computeStaffRange(unit: Unit, grid: Grid, staff: StaffData): [number, number][] {
  const range: [number, number][] = [];
  const ux = unit.gridX;
  const uy = unit.gridY;

  for (let dy = -staff.maxRange; dy <= staff.maxRange; dy++) {
    for (let dx = -staff.maxRange; dx <= staff.maxRange; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < staff.minRange || dist > staff.maxRange) continue;
      const tx = ux + dx;
      const ty = uy + dy;
      if (grid.isInBounds(tx, ty)) {
        range.push([tx, ty]);
      }
    }
  }

  return range;
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/staves/__tests__/StaffRange.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/game/staves/StaffRange.ts src/game/staves/__tests__/StaffRange.test.ts
git commit -m "feat: add computeStaffRange for staff target tiles"
```

---

## Task 5: Create `getHealTargets`

**Objective:** Find all friendly, living units within staff range (excluding self).

**Files:**
- Create: `src/game/staves/getHealTargets.ts`
- Test: `src/game/staves/__tests__/getHealTargets.test.ts`

**Step 1: Write failing test**

Create `src/game/staves/__tests__/getHealTargets.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getHealTargets } from '../getHealTargets';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { StaffData } from '../Staves';

describe('getHealTargets', () => {
  const staff: StaffData = { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 };
  const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('finds adjacent friendly units', () => {
    const grid = new Grid(5, 5);
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 2, 2);
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 2, 1);
    grid.placeUnit(healer, 2, 2);
    grid.placeUnit(ally, 2, 1);
    const targets = getHealTargets(healer, grid, staff);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('a1');
  });

  it('excludes enemies', () => {
    const grid = new Grid(5, 5);
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 2, 2);
    const enemy = new Unit('e1', 'Enemy', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 1);
    grid.placeUnit(healer, 2, 2);
    grid.placeUnit(enemy, 2, 1);
    const targets = getHealTargets(healer, grid, staff);
    expect(targets).toHaveLength(0);
  });

  it('excludes the healer themself', () => {
    const grid = new Grid(5, 5);
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 2, 2);
    grid.placeUnit(healer, 2, 2);
    const targets = getHealTargets(healer, grid, staff);
    expect(targets).toHaveLength(0);
  });

  it('includes allies from the ally faction', () => {
    const grid = new Grid(5, 5);
    const healer = new Unit('h1', 'Healer', Faction.ALLY, UnitClass.MAGE, stats, 2, 2);
    const player = new Unit('p1', 'Player', Faction.PLAYER, UnitClass.LORD, stats, 2, 1);
    grid.placeUnit(healer, 2, 2);
    grid.placeUnit(player, 2, 1);
    const targets = getHealTargets(healer, grid, staff);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('p1');
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/staves/__tests__/getHealTargets.test.ts
```
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

Create `src/game/staves/getHealTargets.ts`:

```typescript
import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { StaffData } from './Staves';

export function getHealTargets(healer: Unit, grid: Grid, staff: StaffData): Unit[] {
  const targets: Unit[] = [];
  const minR = staff.minRange;
  const maxR = staff.maxRange;

  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < minR || dist > maxR) continue;

      const other = grid.getUnit(healer.gridX + dx, healer.gridY + dy);
      if (other && other !== healer && other.isAlive && other.faction !== Faction.ENEMY) {
        targets.push(other);
      }
    }
  }

  return targets;
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/staves/__tests__/getHealTargets.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/game/staves/getHealTargets.ts src/game/staves/__tests__/getHealTargets.test.ts
git commit -m "feat: add getHealTargets for friendly unit selection"
```

---

## Task 6: Create `StaffEngine` for healing resolution

**Objective:** Resolve a staff use: compute healed amount, apply it, consume staff use, and award EXP.

**Files:**
- Create: `src/game/staves/StaffEngine.ts`
- Test: `src/game/staves/__tests__/StaffEngine.test.ts`

**Step 1: Write failing test**

Create `src/game/staves/__tests__/StaffEngine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { StaffEngine } from '../StaffEngine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Inventory } from '../../items/Inventory';
import { StaffData } from '../Staves';

describe('StaffEngine', () => {
  const staff: StaffData = { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 };
  const stats = createStats({ hp: 10, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('heals target and returns result', () => {
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 0, 0);
    const target = new Unit('t1', 'Target', Faction.PLAYER, UnitClass.LORD, stats, 1, 0);
    const inventory = new Inventory();
    inventory.add({ kind: 'staff', name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1, uses: 20 });

    const engine = new StaffEngine();
    const result = engine.resolve(healer, target, staff, inventory, 0);

    expect(result.healedAmount).toBe(10);
    expect(target.stats.hp).toBe(20);
    expect(result.staffConsumed).toBe(false);
    expect(result.expAward).toBe(12); // 10 + floor(10/5)
  });

  it('heals only up to maxHp', () => {
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 0, 0);
    const target = new Unit('t1', 'Target', Faction.PLAYER, UnitClass.LORD, stats, 1, 0);
    target.heal(15); // hp now 15, max 20
    const inventory = new Inventory();
    inventory.add({ kind: 'staff', name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1, uses: 20 });

    const engine = new StaffEngine();
    const result = engine.resolve(healer, target, staff, inventory, 0);

    expect(result.healedAmount).toBe(5);
    expect(target.stats.hp).toBe(20);
  });

  it('awards 0 exp when no HP was restored', () => {
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 0, 0);
    const target = new Unit('t1', 'Target', Faction.PLAYER, UnitClass.LORD, stats, 1, 0);
    target.heal(10); // hp now 20, full
    const inventory = new Inventory();
    inventory.add({ kind: 'staff', name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1, uses: 20 });

    const engine = new StaffEngine();
    const result = engine.resolve(healer, target, staff, inventory, 0);

    expect(result.healedAmount).toBe(0);
    expect(result.expAward).toBe(0);
  });

  it('consumes staff when last use is expended', () => {
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 0, 0);
    const target = new Unit('t1', 'Target', Faction.PLAYER, UnitClass.LORD, stats, 1, 0);
    const inventory = new Inventory();
    inventory.add({ kind: 'staff', name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1, uses: 1 });

    const engine = new StaffEngine();
    const result = engine.resolve(healer, target, staff, inventory, 0);

    expect(result.staffConsumed).toBe(true);
    expect(inventory.size).toBe(0);
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/staves/__tests__/StaffEngine.test.ts
```
Expected: FAIL — `StaffEngine` not found.

**Step 3: Write minimal implementation**

Create `src/game/staves/StaffEngine.ts`:

```typescript
import { Unit } from '../units/Unit';
import { Inventory } from '../items/Inventory';
import { StaffData } from './Staves';

export interface StaffResult {
  healer: Unit;
  target: Unit;
  healedAmount: number;
  staffConsumed: boolean;
  expAward: number;
}

export class StaffEngine {
  resolve(
    healer: Unit,
    target: Unit,
    staff: StaffData,
    inventory: Inventory,
    staffIndex: number,
  ): StaffResult {
    const missingHp = target.stats.maxHp - target.stats.hp;
    const healedAmount = Math.min(staff.healAmount, missingHp);

    if (healedAmount > 0) {
      target.heal(healedAmount);
    }

    const { consumed } = inventory.useAt(staffIndex);
    const expAward = healedAmount > 0 ? 10 + Math.floor(healedAmount / 5) : 0;

    return {
      healer,
      target,
      healedAmount,
      staffConsumed: consumed,
      expAward,
    };
  }
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/staves/__tests__/StaffEngine.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/game/staves/StaffEngine.ts src/game/staves/__tests__/StaffEngine.test.ts
git commit -m "feat: add StaffEngine for healing resolution and EXP"
```

---

## Task 7: Add barrel export for `src/game/staves/`

**Objective:** Wire up the new `staves/` module into the game engine exports.

**Files:**
- Create: `src/game/staves/index.ts`
- Modify: `src/game/index.ts`

**Step 1: Write failing test**

No new test needed — this is a pure re-export task. Verify by running the existing full test suite to ensure no regressions.

```bash
npx vitest run src/game/__tests__/smoke.test.ts
```

**Step 2: Write minimal implementation**

Create `src/game/staves/index.ts`:

```typescript
export { STAFF_DB } from './Staves';
export type { StaffData } from './Staves';
export { computeStaffRange } from './StaffRange';
export { getHealTargets } from './getHealTargets';
export { StaffEngine } from './StaffEngine';
export type { StaffResult } from './StaffEngine';
```

Add to `src/game/index.ts` after the `combat` line:

```typescript
export * from './staves';
```

**Step 3: Verify no regressions**

```bash
npx vitest run src/game/__tests__/smoke.test.ts
```
Expected: PASS.

**Step 4: Commit**

```bash
git add src/game/staves/index.ts src/game/index.ts
git commit -m "chore: wire up staves module exports"
```

---

## Task 8: Add `STAFF` to `ActionType`

**Objective:** Allow the action queue to represent staff actions.

**Files:**
- Modify: `src/game/state/ActionQueue.ts`
- Test: `src/game/state/__tests__/ActionQueue.test.ts`

**Step 1: Write failing test**

In `src/game/state/__tests__/ActionQueue.test.ts`, add:

```typescript
it('can enqueue and dequeue a staff action', () => {
  const queue = new ActionQueue();
  const actor = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.MAGE, stats, 0, 0);
  queue.enqueue({ type: 'staff', actor, targetX: 1, targetY: 2 });
  const action = queue.dequeue();
  expect(action?.type).toBe('staff');
  expect(action?.targetX).toBe(1);
  expect(action?.targetY).toBe(2);
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/state/__tests__/ActionQueue.test.ts
```
Expected: FAIL — `'staff'` is not assignable to `ActionType`.

**Step 3: Write minimal implementation**

In `src/game/state/ActionQueue.ts`, add `STAFF` to the `ActionType` const object:

```typescript
export const ActionType = {
  MOVE: 'move',
  ATTACK: 'attack',
  WAIT: 'wait',
  STAFF: 'staff',
} as const;
```

The `Action` interface already has optional `targetX`/`targetY` which is sufficient.

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/state/__tests__/ActionQueue.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/game/state/ActionQueue.ts src/game/state/__tests__/ActionQueue.test.ts
git commit -m "feat: add STAFF action type to ActionQueue"
```

---

## Task 9: Extend `BattleMenu` with `STAFF` action and `CHOOSE_HEAL_TARGET` state

**Objective:** Allow the battle menu to track staff actions and heal targets.

**Files:**
- Modify: `src/game/ui/BattleMenu.ts`
- Test: `src/game/ui/__tests__/BattleMenu.test.ts`

**Step 1: Write failing test**

Add to `src/game/ui/__tests__/BattleMenu.test.ts`:

```typescript
it('selecting STAFF transitions to CHOOSE_HEAL_TARGET', () => {
  const menu = new BattleMenu();
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.STAFF);
  expect(menu.state).toBe(MenuState.CHOOSE_HEAL_TARGET);
  expect(menu.selectedAction).toBe(MenuAction.STAFF);
});

it('stores heal targets when shown', () => {
  const menu = new BattleMenu();
  const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
  menu.show(player, [enemy], [ally]);
  expect(menu.healTargets).toHaveLength(1);
  expect(menu.healTargets[0].id).toBe('a1');
});

it('canceling from CHOOSE_HEAL_TARGET returns to CHOOSE_ACTION', () => {
  const menu = new BattleMenu();
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.STAFF);
  expect(menu.state).toBe(MenuState.CHOOSE_HEAL_TARGET);
  menu.cancelHealSelection();
  expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
  expect(menu.selectedAction).toBeNull();
});

it('selecting a heal target transitions to RESOLVED', () => {
  const menu = new BattleMenu();
  const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
  menu.show(player, [enemy], [ally]);
  menu.selectAction(MenuAction.STAFF);
  menu.selectHealTarget(ally);
  expect(menu.state).toBe(MenuState.RESOLVED);
  expect(menu.selectedTarget).toBe(ally);
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```
Expected: FAIL — `MenuAction.STAFF`, `MenuState.CHOOSE_HEAL_TARGET`, and related methods do not exist.

**Step 3: Write minimal implementation**

In `src/game/ui/BattleMenu.ts`:

1. Add `CHOOSE_HEAL_TARGET` to `MenuState`:
```typescript
export const MenuState = {
  HIDDEN: 'hidden',
  CHOOSE_ACTION: 'choose_action',
  CHOOSE_WEAPON: 'choose_weapon',
  CHOOSE_TARGET: 'choose_target',
  CHOOSE_HEAL_TARGET: 'choose_heal_target',
  CHOOSE_STATUS: 'choose_status',
  CHOOSE_ITEM: 'choose_item',
  RESOLVED: 'resolved',
} as const;
```

2. Add `STAFF` to `MenuAction`:
```typescript
export const MenuAction = {
  FIGHT: 'fight',
  STAFF: 'staff',
  ITEMS: 'items',
  END_TURN: 'end_turn',
  STATUS: 'status',
} as const;
```

3. Add `_healTargets` field, `healTargets` getter, and update `show()`:
```typescript
export class BattleMenu {
  private _healTargets: Unit[] = [];
  // ... existing fields ...

  get healTargets(): readonly Unit[] {
    return this._healTargets;
  }

  show(unit: Unit, enemies: Unit[], healTargets: Unit[] = []): void {
    this._unit = unit;
    this._enemies = enemies;
    this._healTargets = healTargets;
    this._selectedAction = null;
    this._selectedTarget = null;
    this._selectedWeaponIndex = -1;
    this._selectedItemIndex = -1;
    this._state = MenuState.CHOOSE_ACTION;
  }
```

4. Update `selectAction` to handle `STAFF`:
```typescript
} else if (action === MenuAction.STAFF) {
  this._state = MenuState.CHOOSE_HEAL_TARGET;
}
```

5. Add new methods after `cancelItemUse`:
```typescript
selectHealTarget(target: Unit): void {
  if (this._state !== MenuState.CHOOSE_HEAL_TARGET) {
    throw new Error(`Cannot select heal target in state ${this._state}`);
  }
  this._selectedTarget = target;
  this._state = MenuState.RESOLVED;
}

cancelHealSelection(): void {
  if (this._state !== MenuState.CHOOSE_HEAL_TARGET) {
    throw new Error(`Cannot cancel heal selection in state ${this._state}`);
  }
  this._selectedTarget = null;
  this._selectedAction = null;
  this._state = MenuState.CHOOSE_ACTION;
}
```

6. Update `reset()` to clear `_healTargets`:
```typescript
reset(): void {
  this._state = MenuState.HIDDEN;
  this._unit = null;
  this._enemies = [];
  this._healTargets = [];
  this._selectedAction = null;
  this._selectedTarget = null;
  this._selectedWeaponIndex = -1;
  this._selectedItemIndex = -1;
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```
Expected: PASS. (Existing tests should also still pass because `show()` accepts an optional third argument.)

**Step 5: Commit**

```bash
git add src/game/ui/BattleMenu.ts src/game/ui/__tests__/BattleMenu.test.ts
git commit -m "feat: add STAFF menu action and CHOOSE_HEAL_TARGET state"
```

---

## Task 10: Add staff methods to `GameEngine`

**Objective:** Wire up staff resolution into the main game engine facade.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Test: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

Add to `src/game/__tests__/GameEngine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { createStaffItem } from '../items/ItemTypes';

describe('GameEngine staff support', () => {
  it('getHealTargets finds friendly units in staff range', () => {
    const engine = new GameEngine(5, 5);
    const healer = engine.addUnit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, createStats({
      hp: 20, maxHp: 20, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5,
    }), 2, 2);
    healer.inventory.add(createStaffItem('Heal', 10, 1, 1));
    const ally = engine.addUnit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
    }), 2, 1);

    const targets = engine.getHealTargets(healer);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('a1');
  });

  it('resolveStaffHeal restores HP and consumes staff use', () => {
    const engine = new GameEngine(5, 5);
    const healer = engine.addUnit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, createStats({
      hp: 20, maxHp: 20, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5,
    }), 2, 2);
    healer.inventory.add(createStaffItem('Heal', 10, 1, 1));
    const ally = engine.addUnit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 5, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
    }), 2, 1);

    const result = engine.resolveStaffHeal(healer, ally);
    expect(result.healedAmount).toBe(10);
    expect(ally.stats.hp).toBe(15);
    expect(result.expAward).toBe(12);
  });

  it('mages start with a Heal staff by default', () => {
    const engine = new GameEngine(5, 5);
    const mage = engine.addUnit('m1', 'Mage', Faction.PLAYER, UnitClass.MAGE, createStats({
      hp: 16, maxHp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5,
    }), 0, 0);
    const staff = mage.inventory.items.find((i) => i.kind === 'staff');
    expect(staff).toBeDefined();
    expect(staff?.name).toBe('Heal');
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```
Expected: FAIL — `getHealTargets`, `resolveStaffHeal`, and default staff not present.

**Step 3: Write minimal implementation**

In `src/game/GameEngine.ts`:

1. Add imports at the top:
```typescript
import { StaffEngine, StaffResult } from './staves/StaffEngine';
import { getHealTargets } from './staves/getHealTargets';
import { StaffData, STAFF_DB } from './staves/Staves';
import { StaffItem } from './items/ItemTypes';
```

2. Add public methods after `getAdjacentEnemies`:
```typescript
getStaffForUnit(unit: Unit): { data: StaffData; index: number } | null {
  const index = unit.inventory.items.findIndex((i) => i.kind === 'staff');
  if (index === -1) return null;
  const item = unit.inventory.items[index] as StaffItem;
  return {
    data: {
      name: item.name,
      healAmount: item.healAmount,
      minRange: item.minRange,
      maxRange: item.maxRange,
    },
    index,
  };
}

getHealTargets(unit: Unit): Unit[] {
  const staffInfo = this.getStaffForUnit(unit);
  if (!staffInfo) return [];
  return getHealTargets(unit, this.grid, staffInfo.data);
}

resolveStaffHeal(healer: Unit, target: Unit): StaffResult {
  const staffInfo = this.getStaffForUnit(healer);
  if (!staffInfo) {
    throw new Error(`${healer.name} has no staff`);
  }
  const engine = new StaffEngine();
  return engine.resolve(healer, target, staffInfo.data, healer.inventory, staffInfo.index);
}

applyStaffExp(unit: Unit, staffResult: StaffResult): import('./progression/ProgressionEngine').ProgressionResult | null {
  if (!unit.isAlive || staffResult.expAward <= 0) {
    return null;
  }
  return this.progressionEngine.grantExp(unit, staffResult.expAward);
}
```

3. Replace `getDefaultWeaponItem` with `getStartingItems` and update `addUnit`.

Replace this at the bottom of the file:
```typescript
function getDefaultWeaponItem(unitClass: UnitClass): WeaponItem {
```

With:
```typescript
function getStartingItems(unitClass: UnitClass): Item[] {
  const items: Item[] = [];

  if (unitClass === 'mage') {
    items.push(createWeaponItem('Fire', 'magic', 5, 90, 0, 1, 2, true));
    items.push(createStaffItem('Heal', 10, 1, 1));
  } else if (unitClass === 'brigand') {
    items.push(createWeaponItem('Iron Axe', 'axe', 8, 70, 0, 1, 1, false));
  } else if (unitClass === 'berserker') {
    items.push(createWeaponItem('Killer Axe', 'axe', 9, 70, 30, 1, 1, false));
  } else if (unitClass === 'soldier') {
    items.push(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false));
  } else if (unitClass === 'swordmaster') {
    items.push(createWeaponItem('Killer Sword', 'sword', 7, 85, 30, 1, 1, false));
  } else if (unitClass === 'archer') {
    items.push(createWeaponItem('Iron Bow', 'bow', 6, 85, 0, 2, 2, false));
  } else {
    items.push(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
  }

  return items;
}
```

And in `addUnit`, replace:
```typescript
    const defaultWeapon = getDefaultWeaponItem(unitClass);
    unit.inventory.add(defaultWeapon);
```
With:
```typescript
    const startingItems = getStartingItems(unitClass);
    for (const item of startingItems) {
      unit.inventory.add(item);
    }
```

4. Add `Item` to the `ItemTypes` import at the top if not already present (it should be available via the existing `createWeaponItem` import, but verify `Item` is imported or use the existing wildcard).

Actually, `GameEngine.ts` already imports `createWeaponItem, WeaponItem from './items/ItemTypes'`. Add `Item` to that import:
```typescript
import { createWeaponItem, WeaponItem, Item } from './items/ItemTypes';
```

Also add `createStaffItem`:
```typescript
import { createWeaponItem, WeaponItem, Item, createStaffItem } from './items/ItemTypes';
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```
Expected: PASS. Also run full suite to check for regressions:
```bash
npx vitest run src/game/
```
Expected: All pass.

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat: add staff resolution and heal targets to GameEngine; mages start with Heal"
```

---

## Task 11: Render Staff option in `BattleScene` post-move menu

**Objective:** Show the "Staff" menu button below "Fight" when the unit has a staff and valid heal targets exist.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Write failing test**

No new unit test — this is Phaser rendering glue. Verify by running the full test suite for regressions.

```bash
npx vitest run
```
Expected: PASS (no failures yet, since we haven't broken anything).

**Step 2: Modify `showPostMoveMenu`**

Locate `showPostMoveMenu` in `src/scenes/BattleScene.ts` (around line 685). Make these changes:

1. After `const enemies = this.engine.getAdjacentEnemies(unit);`, add:
```typescript
    const healTargets = this.engine.getHealTargets(unit);
    this.battleMenu.show(unit, enemies, healTargets);
```

2. Update the `fightText` Y position and add `staffText` directly below it.

Replace the existing menu text creation block with:

```typescript
    const px = this.offsetX + unit.gridX * TILE_SIZE + TILE_SIZE / 2;
    const py = this.offsetY + unit.gridY * TILE_SIZE - TILE_SIZE;

    const fightText = this.add
      .text(px, py, '[ Fight ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: enemies.length > 0 ? '#c0392b' : '#7f8c8d',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: enemies.length > 0 });

    const staffText = this.add
      .text(px, py + 24, '[ Staff ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: healTargets.length > 0 ? '#27ae60' : '#7f8c8d',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: healTargets.length > 0 });

    const statusText = this.add
      .text(px, py + 48, '[ Status ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#27ae60',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const itemsText = this.add
      .text(px, py + 72, '[ Items ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#8e44ad',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const endText = this.add
      .text(px, py + 96, '[ End Turn ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#2c3e50',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
```

3. Keep the existing `fightText.on('pointerdown', ...)` block. Add a new `staffText.on('pointerdown', ...)` block directly after it (still inside the `if (enemies.length > 0)` block is wrong — staff should have its own enabled check):

Replace the conditional fight handler block with:

```typescript
    if (enemies.length > 0) {
      fightText.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          this.battleMenu.selectAction(MenuAction.FIGHT);
          this.clearMenuTexts();
          if (this.battleMenu.state === MenuState.CHOOSE_WEAPON) {
            this.showWeaponSelection(unit);
          } else {
            this.highlightEnemyTargets(enemies);
          }
        },
      );
    }

    if (healTargets.length > 0) {
      staffText.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          this.battleMenu.selectAction(MenuAction.STAFF);
          this.clearMenuTexts();
          this.highlightHealTargets(healTargets);
        },
      );
    }
```

4. Update the `this.menuTexts.push(...)` line at the bottom of `showPostMoveMenu`:
```typescript
    this.menuTexts.push(fightText, staffText, statusText, itemsText, endText);
```

**Step 3: Add `highlightHealTargets` method**

Add near `highlightEnemyTargets`:

```typescript
  private highlightHealTargets(targets: Unit[]): void {
    this.moveGraphics.clear();
    for (const target of targets) {
      this.moveGraphics.fillStyle(0x2ecc71, 0.5);
      this.moveGraphics.fillRect(
        this.offsetX + target.gridX * TILE_SIZE,
        this.offsetY + target.gridY * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
      this.moveGraphics.lineStyle(2, 0x00ff00);
      this.moveGraphics.strokeRect(
        this.offsetX + target.gridX * TILE_SIZE,
        this.offsetY + target.gridY * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    }
  }
```

**Step 4: Update `handleMenuInput` to support `CHOOSE_HEAL_TARGET`**

Replace the `handleMenuInput` method with:

```typescript
  private handleMenuInput(_gx: number, _gy: number, clickedUnit: Unit | null): void {
    if (this.battleMenu.state === MenuState.CHOOSE_TARGET) {
      const validTarget = this.battleMenu.adjacentEnemies.find((e) => e.id === clickedUnit?.id);
      const unit = this.battleMenu.unit;
      if (!unit) {
        return;
      }
      if (validTarget) {
        this.battleMenu.selectTarget(validTarget);
        this.clearMenuTexts();
        this.moveGraphics.clear();
        this.pathGraphics.clear();
        this.startBattleMode(unit, validTarget);
      } else {
        this.moveGraphics.clear();
        this.pathGraphics.clear();
        const enemies = this.engine.getAdjacentEnemies(unit);
        const healTargets = this.engine.getHealTargets(unit);
        this.battleMenu.show(unit, enemies, healTargets);
        this.showPostMoveMenu(unit);
      }
    } else if (this.battleMenu.state === MenuState.CHOOSE_HEAL_TARGET) {
      const validTarget = this.battleMenu.healTargets.find((u) => u.id === clickedUnit?.id);
      const unit = this.battleMenu.unit;
      if (!unit) {
        return;
      }
      if (validTarget) {
        this.resolveStaffHeal(unit, validTarget);
      } else {
        this.moveGraphics.clear();
        this.pathGraphics.clear();
        const enemies = this.engine.getAdjacentEnemies(unit);
        const healTargets = this.engine.getHealTargets(unit);
        this.battleMenu.show(unit, enemies, healTargets);
        this.showPostMoveMenu(unit);
      }
    }
  }
```

**Step 5: Update `handleOutsideMenuClick` for `CHOOSE_HEAL_TARGET`**

Find the block:
```typescript
    if (this.battleMenu.state === MenuState.CHOOSE_TARGET) {
```

Replace it with:
```typescript
    if (this.battleMenu.state === MenuState.CHOOSE_TARGET || this.battleMenu.state === MenuState.CHOOSE_HEAL_TARGET) {
      this.moveGraphics.clear();
      this.pathGraphics.clear();
      const unit = this.battleMenu.unit;
      if (!unit) {
        return;
      }
      const enemies = this.engine.getAdjacentEnemies(unit);
      const healTargets = this.engine.getHealTargets(unit);
      this.battleMenu.show(unit, enemies, healTargets);
      this.showPostMoveMenu(unit);
    }
```

**Step 6: Update `hideStatusWindow` and `handleOutsideMenuClick` weapon overlay path**

In `hideStatusWindow`:
```typescript
      this.battleMenu.show(unit, this.engine.getAdjacentEnemies(unit), this.engine.getHealTargets(unit));
```

In `handleOutsideMenuClick` (weapon overlay branch):
```typescript
        const enemies = this.engine.getAdjacentEnemies(unit);
        const healTargets = this.engine.getHealTargets(unit);
        this.battleMenu.show(unit, enemies, healTargets);
```

In `hideWeaponSelection` (the cancel path that re-shows the menu):
```typescript
      const enemies = this.engine.getAdjacentEnemies(unit);
      const healTargets = this.engine.getHealTargets(unit);
      this.battleMenu.show(unit, enemies, healTargets);
```

**Step 7: Add `resolveStaffHeal` and `showHealNumber` methods**

Add after `startBattleMode` or near other resolution methods:

```typescript
  private resolveStaffHeal(healer: Unit, target: Unit): void {
    this.clearMenuTexts();
    this.moveGraphics.clear();
    this.pathGraphics.clear();

    const result = this.engine.resolveStaffHeal(healer, target);
    this.showHealNumber(target, result.healedAmount);
    this.syncUnitSprites();

    if (result.expAward > 0) {
      const progression = this.engine.applyStaffExp(healer, result);
      if (progression) {
        this.showExpPopup(healer, progression, () => {
          this.finishStaffUse(healer);
        });
        return;
      }
    }

    this.finishStaffUse(healer);
  }

  private finishStaffUse(healer: Unit): void {
    healer.state.transition(UNIT_STATE.EXHAUSTED);
    this.battleMenu.reset();
    this.syncUnitSprites();
    this.checkAutoEndTurn();
  }

  private showHealNumber(target: Unit, amount: number): void {
    const px = this.offsetX + target.gridX * TILE_SIZE + TILE_SIZE / 2;
    const py = this.offsetY + target.gridY * TILE_SIZE + TILE_SIZE / 2;
    const text = this.add
      .text(px, py, `+${amount.toString()}`, {
        fontSize: '20px',
        color: '#2ecc71',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: py - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        text.destroy();
      },
    });
  }
```

**Step 8: Verify no regressions**

```bash
npx vitest run
```
Expected: PASS.

**Step 9: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: render Staff menu option and handle heal target selection"
```

---

## Task 12: Final verification and smoke test

**Objective:** Confirm the full feature works end-to-end with no regressions.

**Files:** None (verification only).

**Step 1: Run the full test suite**

```bash
npx vitest run
```
Expected: All tests pass.

> **Note:** `tsc --noEmit` may emit false positives on this project because `tsconfig.json` targets ES5 while the test runner uses modern features. Ignore `tsc` noise unless it points to a line you modified. Trust `npx vitest run` for real verification.

**Step 2: Start the dev server and smoke test**

```bash
npm run dev
```
Open http://localhost:5173, start a battle, select Elara, move her next to Rowan, and verify:
- The "Staff" option appears below "Fight" in the post-move menu.
- Clicking "Staff" highlights Rowan in green.
- Clicking Rowan restores HP and shows a green `+N` floater.
- Elara becomes exhausted (sprite dims).
- If Rowan is at full HP, Staff should award 0 EXP and still exhaust Elara.

**Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "feat: staves and healing system complete"
```

---

## Summary of Changed Files

| File | Change |
|------|--------|
| `src/game/items/ItemTypes.ts` | Added `StaffItem`, updated `Item` union, added `createStaffItem` |
| `src/game/staves/Staves.ts` | New: staff database (`STAFF_DB`) |
| `src/game/staves/StaffRange.ts` | New: `computeStaffRange` |
| `src/game/staves/getHealTargets.ts` | New: friendly target finder |
| `src/game/staves/StaffEngine.ts` | New: healing resolution + EXP |
| `src/game/staves/index.ts` | New: barrel export |
| `src/game/units/Unit.ts` | Added `heal()` method |
| `src/game/state/ActionQueue.ts` | Added `STAFF` to `ActionType` |
| `src/game/ui/BattleMenu.ts` | Added `STAFF` action, `CHOOSE_HEAL_TARGET` state, heal target tracking |
| `src/game/GameEngine.ts` | Added `getStaffForUnit`, `getHealTargets`, `resolveStaffHeal`, `applyStaffExp`; mages now start with Heal staff |
| `src/scenes/BattleScene.ts` | Added Staff menu rendering, heal target highlighting, `resolveStaffHeal`, `showHealNumber` |
| `src/game/index.ts` | Added `export * from './staves'` |
| Various `__tests__/*.test.ts` | New tests for all pure-logic additions |
