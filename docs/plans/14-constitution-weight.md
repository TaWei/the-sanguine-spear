# Plan 14: Constitution & Weapon Weight System

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add Constitution (Con) stat to units and Weight (Wt) to weapons. Attack Speed = Spd - max(0, Wt - Con). This affects doubling thresholds and avoid.

**Architecture:** Con added to `UnitStats`, `createStats`, `Unit`, and `GrowthRates`. Weapon weight already on `WeaponData` (from Plan 13). `CombatEngine` computes AS instead of using raw Spd for doubling checks and avoid calculation.

**Tech Stack:** TypeScript, Vitest. Touches `Stats.ts`, `Unit.ts`, `GrowthRates.ts`, `Formulas.ts`, `Engine.ts`, `MoveRange.ts`, + many test files.

**Fire Emblem GBA reference:**
- AS (Attack Speed) = Spd - max(0, Wt - Con)
- AS is floored at 0
- Doubling threshold: AS difference ≥ 4
- Avoid uses AS, not raw Spd
- Con is a fixed class stat — does NOT grow on level-up

---

## Design Decisions

1. **Con is a non-growth stat** — set at class level, never increases on level-up (matching GBA FE).
2. **AS computed on-the-fly** in CombatEngine, not stored on Unit. But avoid formula in `calcAvoid` currently takes `spd` — must be changed to take `attackSpeed`.
3. **`calcAvoid(spd, luk, terrainAvoid)` → `calcAvoid(as, luk, terrainAvoid)`** — no behavioral change, just rename parameter and ensure callers pass AS.
4. **MoveRange continues to use raw Mov** (rescue penalty already halves Skl/Spd, but Con doesn't affect movement in GBA FE — weight only matters in combat).
5. **UnitStats gets `con` field.** Default `con` for each class defined in a class-CON lookup.

---

### Task 1: Add `con` to UnitStats and createStats

**Objective:** Extend the stats interface and factory.

**Files:**
- Modify: `src/game/units/Stats.ts` — `UnitStats`, `UnitStatsInput`, `createStats`
- Test: `src/game/units/__tests__/Stats.test.ts`

**Step 1: Write failing test**

```typescript
it('createStats includes con', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 0, skl: 5, spd: 5, luk: 5, def: 5, res: 2, mov: 5, con: 9 });
  expect(stats.con).toBe(9);
});

it('createStats defaults con to 0 if omitted', () => {
  // Backward compatibility: existing callers without con
  const stats = createStats({ hp: 20, str: 5, mag: 0, skl: 5, spd: 5, luk: 5, def: 5, res: 2, mov: 5 });
  expect(stats.con).toBe(0);
});
```

**Step 2: Extend interfaces**

```typescript
export interface UnitStats {
  hp: number; maxHp: number; str: number; mag: number;
  skl: number; spd: number; luk: number; def: number;
  res: number; mov: number;
  con: number;  // NEW
}

export interface UnitStatsInput {
  hp: number; maxHp?: number; str: number; mag: number;
  skl: number; spd: number; luk: number; def: number;
  res: number; mov: number;
  con?: number;  // NEW (optional for backward compat)
}
```

Update `createStats`:
```typescript
export function createStats(input: UnitStatsInput): UnitStats {
  const maxHp = input.maxHp ?? input.hp;
  return {
    hp: Math.max(0, Math.min(input.hp, maxHp)), maxHp,
    str: input.str, mag: input.mag, skl: input.skl, spd: input.spd,
    luk: input.luk, def: input.def, res: input.res, mov: input.mov,
    con: input.con ?? 0,  // NEW
  };
}
```

**Step 4: Run test** — `npx vitest run src/game/units/__tests__/Stats.test.ts`

---

### Task 2: Add class-level CON defaults

**Objective:** Define CON per class and expose via a lookup function.

**Files:**
- Create: `src/game/units/Constitution.ts` — `CLASS_CON` map, `getBaseCon(unitClass)`
- Test: `src/game/units/__tests__/Constitution.test.ts`

**GBA FE7 Base CON values:**

| Class | Con |
|-------|-----|
| Lord | 7 |
| Mercenary | 9 (Hero 11) |
| Mage | 6 (Sage 7) |
| Archer | 7 (Sniper 8) |
| Cavalry | 9 (Paladin 11) |
| Pegasus Knight | 5 (Falcon Knight 6) |
| Soldier | 10 |
| Brigand | 12 (Berserker 13) |
| Swordmaster | 9 |
| General | 15 |

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { getBaseCon } from '../Constitution';
import { UnitClass } from '../Unit';

describe('getBaseCon', () => {
  it.each([
    [UnitClass.LORD, 7],
    [UnitClass.MERCENARY, 9],
    [UnitClass.MAGE, 6],
    [UnitClass.CAVALRY, 9],
    [UnitClass.PEGASUS_KNIGHT, 5],
    [UnitClass.BRIGAND, 12],
    [UnitClass.GENERAL, 15],
    [UnitClass.PALADIN, 11],
    [UnitClass.SWORDMASTER, 9],
    [UnitClass.SNIPER, 8],
    [UnitClass.SAGE, 7],
    [UnitClass.FALCON_KNIGHT, 6],
    [UnitClass.BERSERKER, 13],
    [UnitClass.ARCHER, 7],
    [UnitClass.SOLDIER, 10],
  ])('%s has con=%i', (cls, con) => {
    expect(getBaseCon(cls)).toBe(con);
  });
});
```

**Step 2: Implement**

```typescript
import { UnitClass } from './Unit';

const CLASS_CON: Record<UnitClass, number> = {
  [UnitClass.LORD]: 7,
  [UnitClass.MERCENARY]: 9,
  [UnitClass.MAGE]: 6,
  [UnitClass.ARCHER]: 7,
  [UnitClass.CAVALRY]: 9,
  [UnitClass.PEGASUS_KNIGHT]: 5,
  [UnitClass.SOLDIER]: 10,
  [UnitClass.BRIGAND]: 12,
  [UnitClass.SWORDMASTER]: 9,
  [UnitClass.BERSERKER]: 13,
  [UnitClass.PALADIN]: 11,
  [UnitClass.SAGE]: 7,
  [UnitClass.SNIPER]: 8,
  [UnitClass.FALCON_KNIGHT]: 6,
  [UnitClass.GENERAL]: 15,
};

export function getBaseCon(unitClass: UnitClass): number {
  return CLASS_CON[unitClass];
}
```

---

### Task 3: Add `con` to Unit constructor and `addUnit`

**Objective:** Auto-populate `con` from class when Unit is created.

**Files:**
- Modify: `src/game/units/Unit.ts` — constructor sets `con` from `getBaseCon` if not in stats
- Modify: `src/game/GameEngine.ts` — `addUnit` passes con
- Test: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Unit constructor auto-sets con**

In Unit constructor, after setting `this._stats = stats`:
```typescript
if (this._stats.con === 0) {
  // Auto-derive from class if not explicitly set
  this._stats = { ...this._stats, con: getBaseCon(unitClass) };
}
```

Import `getBaseCon` from `'./Constitution'`.

**Step 2: Test**

```typescript
it('Unit gets con from class when not specified', () => {
  const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.CAVALRY,
    createStats({ hp: 20, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 8, res: 2, mov: 7 }),
    3, 3);
  expect(unit.stats.con).toBe(9);
});

it('Unit keeps explicit con when specified', () => {
  const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.CAVALRY,
    createStats({ hp: 20, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 8, res: 2, mov: 7, con: 15 }),
    3, 3);
  expect(unit.stats.con).toBe(15);
});
```

---

### Task 4: Add Con to all existing test stats

**Objective:** Find all places in tests where `createStats` is called without `con` and add appropriate class-expected values OR add con defaults.

**Strategy:** Rather than updating every test (hundreds of calls), make test helper functions use `getBaseCon`. Alternatively, make `createStats`'s `con` default not 0 but NOT class-derived — leave that to Unit constructor. Tests that create Unit objects with class already get auto-con. Tests that just call `createStats` for raw stat objects will have `con: 0` which is fine since those tests don't use con.

**Action:** Run `npx vitest run` and fix any broken tests. If `con` defaults to 0 in `createStats`, existing tests should pass since they don't reference `con`. Unit tests that construct `Unit` with a class get auto-con. 

Run the full suite and verify.

---

### Task 5: Compute Attack Speed in CombatEngine

**Objective:** Calculate AS = Spd - max(0, Wt - Con), use it for doubling checks and avoid.

**Files:**
- Modify: `src/game/combat/Formulas.ts` — `calcAvoid` parameter rename
- Modify: `src/game/combat/Engine.ts` — `computeAttackSpeed` helper, use in `previewAttack` and `resolveHit`
- Test: `src/game/combat/__tests__/Engine.test.ts`

**Step 1: Add `computeAttackSpeed`**

```typescript
// In Engine.ts
private computeAttackSpeed(unit: Unit, weapon: WeaponData): number {
  const wt = weapon.weight ?? 0;
  const con = unit.stats.con;
  const penalty = Math.max(0, wt - con);
  return Math.max(0, unit.stats.spd - penalty);
}
```

**Step 2: Modify `previewAttack`**

Change doubling check from:
```typescript
const doubleAttack = attStats.spd - defStats.spd >= 4;
```
To:
```typescript
const attAS = this.computeAttackSpeed(attacker, weapon);
const defAS = this.computeAttackSpeed(defender, defenderWeapon);
const doubleAttack = attAS - defAS >= 4;
```

Change avoid calculation to use AS:
```typescript
const attAS_val = this.computeAttackSpeed(attacker, weapon);
const defAS_val = this.computeAttackSpeed(defender, defenderWeapon);
const avoid = calcAvoid(defAS_val, defStats.luk, terrainData.avoidBonus);
```

**Step 3: Modify `resolveCombat` similarly**

Update the spd comparison at lines 117-120:
```typescript
const attAS = this.computeAttackSpeed(attacker, attackerWeapon);
const defAS = this.computeAttackSpeed(defender, defenderWeapon);
const attackerDoubles = attAS - defAS >= 4;
const defenderDoubles = defAS - attAS >= 4;
```

Update `resolveHit` avoid to use defAS.

**Step 4: Write test**

```typescript
describe('Constitution and weapon weight', () => {
  it('slow unit with heavy weapon does not double', () => {
    const grid = new Grid(8, 8);
    grid.setTerrain(3, 3, 'plains');
    grid.setTerrain(4, 3, 'plains');
    const engine = new CombatEngine(grid);
    // Brigand: Spd 10, Con 12. Steel Axe: Wt 15. AS = 10 - max(0, 15-12) = 10 - 3 = 7
    // Merc: Spd 12, Con 9. Iron Sword: Wt 0. AS = 12
    // Diff = 12 - 7 = 5 ≥ 4 → Merc doubles
    const brigand = new Unit('b1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
      createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 5, spd: 10, luk: 0, def: 8, res: 2, mov: 5 }),
      4, 3);
    const merc = new Unit('m1', 'Merc', Faction.PLAYER, UnitClass.MERCENARY,
      createStats({ hp: 25, maxHp: 25, str: 8, mag: 0, skl: 12, spd: 12, luk: 5, def: 6, res: 2, mov: 5 }),
      3, 3);
    const wpn = WEAPON_DB['Iron Sword'];
    const defWpn = WEAPON_DB['Steel Axe'];
    
    const preview = engine.previewCombat(merc, brigand, wpn, defWpn);
    expect(preview.attacker.doubleAttack).toBe(true);
    expect(preview.defender?.doubleAttack ?? false).toBe(false);
  });

  it('high-con unit is not weighed down', () => {
    // General: Spd 8, Con 15. Steel Axe Wt 15. AS = 8 - 0 = 8
    // ...test passes
  });
});
```

**Step 5: Run tests** — `npx vitest run src/game/combat/__tests__/Engine.test.ts`

---

### Task 6: Update `calcAvoid` signature

**Objective:** Rename `spd` parameter to `as` to reflect it now receives Attack Speed.

**Files:**
- Modify: `src/game/combat/Formulas.ts`

```typescript
export function calcAvoid(as: number, luk: number, terrainAvoid = 0): number {
  return as * 2 + luk + terrainAvoid;
}
```

Update all callers (Engine.ts). No behavioral change.

---

### Task 7: Run full suite and fix regressions

Run: `npx vitest run`

Fix any tests that break due to:
- Missing `con` in manually constructed UnitStats
- AS-based avoid changing hit rates in existing combat tests
- `createStats` calls without `con` (should default to 0, tests constructing Units get auto-con)

---

## Verification Checklist

- [ ] `con` field on UnitStats, defaults to class CON when omitted
- [ ] `getBaseCon` returns correct GBA values per class
- [ ] `computeAttackSpeed` = Spd - max(0, Wt - Con), floored at 0
- [ ] AS used for doubling threshold (diff ≥ 4)
- [ ] AS used for avoid calculation (AS × 2 + Luk + terrain)
- [ ] Heavy weapon on low-Con unit reduces AS, may lose doubling
- [ ] High-Con unit (General, Berserker) unpenalized by heavy axes
- [ ] Zero-weight weapons (Iron series) produce AS = Spd
- [ ] Rescue penalty (Plan 11) still halves raw Spd before AS calc
- [ ] Full test suite passes
