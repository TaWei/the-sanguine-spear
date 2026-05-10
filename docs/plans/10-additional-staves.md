# Additional Staves (Mend & Physic) Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add Mend (stronger single-target heal) and Physic (ranged heal) staves, plus the infrastructure for dynamic staff ranges. Currently only Heal exists — a 10 HP, 1-range staff. This is the #1 limiting factor for support/healer unit viability.

**Architecture:** Mend is a pure data addition — just a new `STAFF_DB` entry. Physic requires dynamic range based on the caster's Mag stat, which means extending `StaffData` with an optional `getRange()` function. This is designed to generalize to future staves with formula-driven ranges (Warp: Mag range, Rescue: Mag/2 range, etc.). All changes are in `src/game/staves/` — zero Phaser imports.

**Key GBA FE reference:**
- **Heal:** 10 HP, 1 range, E rank — already implemented
- **Mend:** 20 HP, 1 range, D rank — pure upgrade
- **Physic:** 10 HP, Range = Mag/2 (min 1), C rank — ranged heal, no line-of-sight restriction

**Tech Stack:** TypeScript 5.4, Vitest 4.1, zero Phaser imports.

---

## Design Decisions

1. **Dynamic range via `getRange?` on `StaffData`:** Rather than adding a boolean flag or hardcoding Physic in range calculation, `StaffData` gains an optional `getRange?(caster: Unit) => { min: number; max: number }`. When present, `getHealTargets()` and `computeStaffRange()` use it instead of the static `minRange`/`maxRange`. This makes future staves (Warp, Rescue, Torch) trivially addable.

2. **Physic healAmount = 10:** In GBA FE, Physic heals `10 + Mag/2` (capped at full HP). For Sanguine Spear's simpler model, we use a flat 10 HP heal — same as Heal but at range. The value of Physic is the range, not the healing power.

3. **No line-of-sight or terrain restrictions:** GBA FE Physic ignores terrain and walls. We follow the same — targets are found purely by grid distance, not pathfinding.

4. **Staff EXP unchanged:** The existing `StaffEngine` already awards EXP per heal. No changes needed.

5. **`createItemByName()` auto-discovers new staves:** The factory already reads from `STAFF_DB`. No changes needed.

---

### Task 1: Extend `StaffData` with optional `getRange` dynamic range support

**Objective:** Allow staves to compute their range dynamically based on caster stats, while keeping backward compatibility with fixed-range staves.

**Files:**
- Modify: `src/game/staves/Staves.ts` (add `getRange` to interface)
- Test: `src/game/staves/__tests__/Staves.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/staves/__tests__/Staves.test.ts
import { describe, it, expect } from 'vitest';
import { STAFF_DB, StaffData } from '../Staves';
import { createStats } from '../../units/Stats';

describe('StaffData dynamic range', () => {
  it('Heal uses fixed range (no getRange)', () => {
    expect(STAFF_DB.Heal.minRange).toBe(1);
    expect(STAFF_DB.Heal.maxRange).toBe(1);
    expect(STAFF_DB.Heal.getRange).toBeUndefined();
  });

  it('can resolve range from fixed min/max when getRange is absent', () => {
    function resolve(staff: StaffData): { min: number; max: number } {
      if (staff.getRange) {
        // Need a unit — but for this test, we test the fallback
        return staff.getRange(null!);
      }
      return { min: staff.minRange, max: staff.maxRange };
    }
    expect(resolve(STAFF_DB.Heal)).toEqual({ min: 1, max: 1 });
  });
});
```

**Step 2:** Run — expected FAIL (no `getRange` property exists yet).

**Step 3: Modify `StaffData` interface**

```typescript
// src/game/staves/Staves.ts
import { Unit } from '../units/Unit';

export interface StaffData {
  name: string;
  healAmount: number;
  minRange: number;
  maxRange: number;
  /** Optional: compute range dynamically based on caster stats.
   *  If absent, minRange/maxRange are used as-is.
   *  Example: Physic uses Mag/2 for range. */
  getRange?: (caster: Unit) => { min: number; max: number };
}
```

**Step 4:** Run — expected PASS (backward compat — `getRange` is optional).

**Step 5:** Commit.

---

### Task 2: Create `resolveStaffRange()` helper

**Objective:** Extract the range-resolution logic (static vs dynamic) into a testable pure function.

**Files:**
- Create: `src/game/staves/StaffRangeResolver.ts`
- Test: `src/game/staves/__tests__/StaffRangeResolver.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/staves/__tests__/StaffRangeResolver.test.ts
import { describe, it, expect } from 'vitest';
import { resolveStaffRange } from '../StaffRangeResolver';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

function makeHealer(mag: number) {
  return new Unit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
    createStats({ hp: 20, maxHp: 20, mag, skl: 5, spd: 8, luk: 3, def: 3, res: 8 }),
    5, 5);
}

describe('resolveStaffRange', () => {
  it('returns static range when getRange is absent', () => {
    const staff = { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 };
    const range = resolveStaffRange(staff, makeHealer(10));
    expect(range).toEqual({ min: 1, max: 1 });
  });

  it('uses getRange when present', () => {
    const staff = {
      name: 'Physic',
      healAmount: 10,
      minRange: 1, maxRange: 1, // fallback ignored
      getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
    };
    const range = resolveStaffRange(staff, makeHealer(10));
    expect(range).toEqual({ min: 1, max: 5 }); // Mag 10 / 2 = 5
  });

  it('clamps dynamic maxRange to at least 1', () => {
    const staff = {
      name: 'Physic',
      healAmount: 10,
      minRange: 1, maxRange: 99,
      getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
    };
    const range = resolveStaffRange(staff, makeHealer(1)); // Mag 1 / 2 = 0, clamped to 1
    expect(range).toEqual({ min: 1, max: 1 });
  });

  it('handles Mag 20 -> range 10', () => {
    const staff = {
      name: 'Physic',
      healAmount: 10,
      minRange: 1, maxRange: 99,
      getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
    };
    expect(resolveStaffRange(staff, makeHealer(20))).toEqual({ min: 1, max: 10 });
  });
});
```

**Step 2:** Run — expected FAIL.

**Step 3: Implement**

```typescript
// src/game/staves/StaffRangeResolver.ts
import { StaffData } from './Staves';
import { Unit } from '../units/Unit';

export interface StaffRange {
  min: number;
  max: number;
}

export function resolveStaffRange(staff: StaffData, caster: Unit): StaffRange {
  if (staff.getRange) {
    return staff.getRange(caster);
  }
  return { min: staff.minRange, max: staff.maxRange };
}
```

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 3: Update `getHealTargets()` to use `resolveStaffRange()` 

**Objective:** Wire the dynamic range resolver into the actual target-finding code.

**Files:**
- Modify: `src/game/staves/getHealTargets.ts` (use resolveStaffRange)
- Test: `src/game/staves/__tests__/getHealTargets.test.ts` (add dynamic range test)

**Step 1: Write failing test — Physic at range 5 finds target**

```typescript
it('finds heal target within dynamic Physic range', () => {
  const grid = new Grid(10, 10);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      grid.setTerrain(x, y, TerrainType.PLAINS);
    }
  }

  const healer = new Unit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
    createStats({ hp: 20, maxHp: 20, mag: 10, skl: 5, spd: 8, luk: 3, def: 3, res: 8 }),
    5, 5);
  grid.placeUnit(healer, 5, 5);

  // Wounded ally 5 tiles away (distance = 5)
  const ally = new Unit('a1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
    createStats({ hp: 10, maxHp: 25, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
    9, 6); // dx=4, dy=1 → Manhattan distance = 5
  grid.placeUnit(ally, 9, 6);

  const physStaff: StaffData = {
    name: 'Physic',
    healAmount: 10,
    minRange: 1, maxRange: 99,
    getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
  };

  const targets = getHealTargets(healer, grid, physStaff);
  expect(targets).toContain(ally);
});

it('does not find target outside Physic range', () => {
  const grid = new Grid(10, 10);
  const healer = new Unit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
    createStats({ hp: 20, maxHp: 20, mag: 4, skl: 5, spd: 8, luk: 3, def: 3, res: 8 }),
    5, 5);
  grid.placeUnit(healer, 5, 5);

  // Ally at distance 5, but Mag 4 → range = 2
  const ally = new Unit('a1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
    createStats({ hp: 10, maxHp: 25, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
    5, 0); // dx=0, dy=5 → distance = 5
  grid.placeUnit(ally, 5, 0);

  const physStaff: StaffData = {
    name: 'Physic',
    healAmount: 10,
    minRange: 1, maxRange: 99,
    getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
  };

  const targets = getHealTargets(healer, grid, physStaff);
  expect(targets).not.toContain(ally); // out of range
});
```

**Step 2:** Run — expected FAIL (static min/max checked).

**Step 3: Modify `getHealTargets()`**

```typescript
import { resolveStaffRange } from './StaffRangeResolver';

export function getHealTargets(healer: Unit, grid: Grid, staff: StaffData): Unit[] {
  const targets: Unit[] = [];
  const { min: minR, max: maxR } = resolveStaffRange(staff, healer);

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

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 4: Update `computeStaffRange()` for dynamic ranges

**Objective:** The visual staff range renderer must also use dynamic ranges so the player sees the correct targeting overlay.

**Files:**
- Modify: `src/game/staves/StaffRange.ts` (use resolveStaffRange)
- Test: `src/game/staves/__tests__/StaffRange.test.ts`

**Step 1: Write test — Physic range tiles match Mag-based calculation**

```typescript
it('computes Physic range tiles based on Mag / 2', () => {
  const grid = new Grid(10, 10);
  const healer = new Unit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
    createStats({ hp: 20, mag: 10 }), 5, 5);
  grid.placeUnit(healer, 5, 5);

  const physStaff: StaffData = {
    name: 'Physic', healAmount: 10, minRange: 1, maxRange: 99,
    getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
  };

  const range = computeStaffRange(healer, grid, physStaff);
  // Mag 10 → max range 5. All tiles with distance 1-5 from (5,5)
  for (const [tx, ty] of range) {
    const dist = Math.abs(tx - 5) + Math.abs(ty - 5);
    expect(dist).toBeGreaterThanOrEqual(1);
    expect(dist).toBeLessThanOrEqual(5);
  }
  // A tile at distance 6 should not be in range
  expect(range.some(([tx, ty]) => Math.abs(tx - 5) + Math.abs(ty - 5) > 5)).toBe(false);
});
```

**Step 2:** Run — expected FAIL (static range used).

**Step 3: Modify `computeStaffRange()`**

```typescript
import { resolveStaffRange } from './StaffRangeResolver';

export function computeStaffRange(unit: Unit, grid: Grid, staff: StaffData): [number, number][] {
  const range: [number, number][] = [];
  const ux = unit.gridX;
  const uy = unit.gridY;
  const { max: maxRange, min: minRange } = resolveStaffRange(staff, unit);

  for (let dy = -maxRange; dy <= maxRange; dy++) {
    for (let dx = -maxRange; dx <= maxRange; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < minRange || dist > maxRange) continue;
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

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 5: Add Mend to `STAFF_DB`

**Objective:** Mend — a straightforward 20 HP, 1-range heal staff.

**Files:**
- Modify: `src/game/staves/Staves.ts` (append to STAFF_DB)
- Test: `src/game/staves/__tests__/Staves.test.ts`

**Step 1: Write failing test**

```typescript
it('Mend heals 20 HP at range 1', () => {
  expect(STAFF_DB.Mend).toBeDefined();
  expect(STAFF_DB.Mend.healAmount).toBe(20);
  expect(STAFF_DB.Mend.minRange).toBe(1);
  expect(STAFF_DB.Mend.maxRange).toBe(1);
  expect(STAFF_DB.Mend.getRange).toBeUndefined(); // static range
});
```

**Step 2:** Run — expected FAIL.

**Step 3: Add to STAFF_DB**

```typescript
export const STAFF_DB: Record<string, StaffData> = {
  Heal: { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 },
  Mend: { name: 'Mend', healAmount: 20, minRange: 1, maxRange: 1 },
};
```

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 6: Add Physic to `STAFF_DB` with dynamic range

**Objective:** Physic — 10 HP heal at Mag/2 range.

**Files:**
- Modify: `src/game/staves/Staves.ts` (append to STAFF_DB)
- Test: `src/game/staves/__tests__/Staves.test.ts`

**Step 1: Write failing test**

```typescript
it('Physic has dynamic range based on Mag / 2', () => {
  expect(STAFF_DB.Physic).toBeDefined();
  expect(STAFF_DB.Physic.healAmount).toBe(10);
  expect(STAFF_DB.Physic.getRange).toBeDefined();
  
  // Test the range function
  const caster = new Unit('t', 'Test', Faction.PLAYER, UnitClass.MAGE,
    createStats({ mag: 14 }), 0, 0);
  const range = STAFF_DB.Physic.getRange!(caster);
  expect(range).toEqual({ min: 1, max: 7 }); // floor(14/2) = 7
});
```

**Step 2:** Run — expected FAIL.

**Step 3: Add to STAFF_DB**

```typescript
export const STAFF_DB: Record<string, StaffData> = {
  Heal: { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 },
  Mend: { name: 'Mend', healAmount: 20, minRange: 1, maxRange: 1 },
  Physic: {
    name: 'Physic',
    healAmount: 10,
    minRange: 1,
    maxRange: 99, // placeholder; dynamic range overrides this
    getRange: (caster: Unit) => ({
      min: 1,
      max: Math.max(1, Math.floor(caster.stats.mag / 2)),
    }),
  },
};
```

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 7: Verify `createItemByName()` works for Mend and Physic

**Objective:** The item factory must create Mend and Physic from STAFF_DB automatically.

**Files:**
- Test: `src/game/items/__tests__/ItemFactory.test.ts`

**Step 1: Write test**

```typescript
it('creates Mend staff with 20 uses', () => {
  const item = createItemByName('Mend');
  expect(item).toBeDefined();
  expect(item!.kind).toBe('staff');
  if (item!.kind === 'staff') {
    expect(item.healAmount).toBe(20);
    expect(item.minRange).toBe(1);
    expect(item.maxRange).toBe(1);
    expect(item.uses).toBe(20);
  }
});

it('creates Physic staff with 20 uses', () => {
  const item = createItemByName('Physic');
  expect(item).toBeDefined();
  expect(item!.kind).toBe('staff');
  if (item!.kind === 'staff') {
    expect(item.healAmount).toBe(10);
    expect(item.uses).toBe(20);
  }
});
```

**Step 2:** Run — expected PASS (factory already reads STAFF_DB dynamically).

**Step 3:** Commit.

---

### Task 8: Integration test — Mend heals 20 HP through GameEngine

**Objective:** Full end-to-end: unit with Mend staff heals another unit for 20 HP.

**Files:**
- Test: `src/game/__tests__/GameEngine.staff.test.ts` (append)

**Step 1: Write test**

```typescript
it('Mend heals 20 HP', () => {
  const engine = new GameEngine(8, 8);
  engine.setTerrain(4, 4, TerrainType.PLAINS);
  engine.setTerrain(4, 5, TerrainType.PLAINS);

  const healer = engine.addUnit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
    createStats({ hp: 20, maxHp: 20, mag: 10, skl: 5, spd: 8, luk: 3, def: 3, res: 8 }),
    4, 4);
  // Replace default Heal with Mend
  healer.inventory.removeAt(1); // Heal is index 1 for mages (weapon at 0)
  healer.inventory.add(createItemByName('Mend')!);

  const wounded = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
    createStats({ hp: 5, maxHp: 30, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
    4, 5);
  wounded.takeDamage(0); // ensure hp is 5 (already set)

  const result = engine.resolveStaffHeal(healer, wounded);
  expect(result.healAmount).toBe(20);
  expect(wounded.stats.hp).toBe(25); // 5 + 20
});
```

**Step 2:** Run — expected PASS (the StaffEngine already reads healAmount from staff data).

**Step 3:** Commit.

---

### Task 9: Integration test — Physic heals at range

**Objective:** Physic can heal a unit 3+ tiles away.

**Files:**
- Test: `src/game/__tests__/GameEngine.staff.test.ts` (append)

**Step 1: Write test**

```typescript
it('Physic heals a unit at range 4 (Mag 10 → range 5)', () => {
  const engine = new GameEngine(10, 10);
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 10; x++)
      engine.setTerrain(x, y, TerrainType.PLAINS);

  const healer = engine.addUnit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
    createStats({ hp: 20, maxHp: 20, mag: 10, skl: 5, spd: 8, luk: 3, def: 3, res: 8 }),
    2, 5);
  healer.inventory.add(createItemByName('Physic')!);

  const wounded = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
    createStats({ hp: 3, maxHp: 30, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
    6, 6); // distance = |6-2| + |6-5| = 4 + 1 = 5 (within Physic range of 5)

  // Verify Physic is available as a staff for this healer
  const staffInfo = engine.getStaffForUnit(healer);
  expect(staffInfo).not.toBeNull();
  expect(staffInfo!.data.name).toBe('Physic');

  // Verify the wounded unit is in heal range
  const targets = engine.getHealTargets(healer);
  expect(targets.map(u => u.name)).toContain('Rowan');

  // Perform the heal
  const result = engine.resolveStaffHeal(healer, wounded);
  expect(result.healAmount).toBe(10);
  expect(wounded.stats.hp).toBe(13); // 3 + 10
});
```

**Step 2:** Run — expected PASS.

**Step 3:** Commit.

---

### Task 10: Run full test suite and lint

```bash
npx vitest run
npm run lint
```

---

## Verification Checklist

- [ ] Mend exists: 20 HP heal, 1 range, static range
- [ ] Physic exists: 10 HP heal, Mag/2 range, dynamic range
- [ ] Physic range scales with Mag (Mag 4 → range 2, Mag 20 → range 10)
- [ ] Physic range clamped to minimum 1 (Mag 1 → still range 1)
- [ ] `getHealTargets()` uses dynamic range when `getRange` is present
- [ ] `computeStaffRange()` uses dynamic range for visual overlay
- [ ] `createItemByName()` creates Mend and Physic automatically
- [ ] StaffEngine heals correct amount for Mend (20) and Physic (10)
- [ ] Staff uses decrement on heal (unchanged, already works)
- [ ] Staff EXP awarded (unchanged, already works)
- [ ] Backward compat: Heal still works with no `getRange`
- [ ] All existing tests pass
