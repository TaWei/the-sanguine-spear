# Plan 15: Weapon Ranks (WEXP) & Rank-Locking

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add weapon ranks (E→D→C→B→A→S), WEXP gain per combat round, and rank-gated weapon equipping. Higher-tier weapons (Steel/Silver/Brave/Killer) require minimum ranks.

**Architecture:** New `WeaponRank` enum and `RankThresholds` constant. `WeaponData.requiredRank` field gates weapons. `Unit` gets `weaponRanks: Map<WeaponType, { rank: WeaponRank; wexp: number }>`. `awardWeaponExp()` called after combat. Rank-ups printed to combat log.

**Tech Stack:** TypeScript, Vitest.

**Fire Emblem GBA reference:**
- Ranks: E (0), D (31), C (71), B (121), A (181), S (251)
- WEXP: +1 per round of combat (hit or miss). +2 if weapon type matches class specialty. Boss kill bonus: +WEXP equal to boss level.
- Steel: D rank. Silver/Killer: C rank. Brave: B rank. Iron: E rank.
- Display: rank letters shown in unit info.

---

## Design Decisions

1. **WEXP thresholds from FE7:** 0=E, 31=D, 71=C, 121=B, 181=A, 251=S.
2. **WEXP gain:** +1 per combat round per weapon used. Both attacker and defender gain WEXP in their respective weapon types.
3. **Rank locking at equip time:** `getWeaponForUnit` skips weapons whose `requiredRank` exceeds the unit's rank, falling through to the next weapon. A unit with no eligible weapons uses a default Iron weapon.
4. **Class WEXP bonus:** Units gain +2 instead of +1 when using their class-primary weapon type (e.g., Mercenary/Swordmaster with swords).
5. **Rank displayed as letter** not number.

---

### Task 1: Define rank system data

**Objective:** Create rank enum, threshold constants, rank-gating helper, and WEXP calculator.

**Files:**
- Create: `src/game/combat/WeaponRank.ts`
- Test: `src/game/combat/__tests__/WeaponRank.test.ts`

**Implementation:**

```typescript
// src/game/combat/WeaponRank.ts
import type { WeaponType } from './Weapons';

export const WeaponRankLevel = {
  E: 0,
  D: 1,
  C: 2,
  B: 3,
  A: 4,
  S: 5,
} as const;
export type WeaponRankLevel = (typeof WeaponRankLevel)[keyof typeof WeaponRankLevel];

export const RANK_LABELS: Record<WeaponRankLevel, string> = {
  [WeaponRankLevel.E]: 'E',
  [WeaponRankLevel.D]: 'D',
  [WeaponRankLevel.C]: 'C',
  [WeaponRankLevel.B]: 'B',
  [WeaponRankLevel.A]: 'A',
  [WeaponRankLevel.S]: 'S',
};

export const WEXP_THRESHOLDS: Record<WeaponRankLevel, number> = {
  [WeaponRankLevel.E]: 0,
  [WeaponRankLevel.D]: 31,
  [WeaponRankLevel.C]: 71,
  [WeaponRankLevel.B]: 121,
  [WeaponRankLevel.A]: 181,
  [WeaponRankLevel.S]: 251,
};

export function wexpToRank(wexp: number): WeaponRankLevel {
  if (wexp >= WEXP_THRESHOLDS[WeaponRankLevel.S]) return WeaponRankLevel.S;
  if (wexp >= WEXP_THRESHOLDS[WeaponRankLevel.A]) return WeaponRankLevel.A;
  if (wexp >= WEXP_THRESHOLDS[WeaponRankLevel.B]) return WeaponRankLevel.B;
  if (wexp >= WEXP_THRESHOLDS[WeaponRankLevel.C]) return WeaponRankLevel.C;
  if (wexp >= WEXP_THRESHOLDS[WeaponRankLevel.D]) return WeaponRankLevel.D;
  return WeaponRankLevel.E;
}

export function canWield(rankLevel: WeaponRankLevel, requiredLevel: WeaponRankLevel): boolean {
  return rankLevel >= requiredLevel;
}

export interface WeaponRankData {
  rank: WeaponRankLevel;
  wexp: number;
}

export function createWeaponRank(rank: WeaponRankLevel = WeaponRankLevel.E, wexp = 0): WeaponRankData {
  return { rank, wexp };
}

/** Primary weapon type per class for WEXP bonus (+2 instead of +1). */
export function getPrimaryWeaponType(unitClass: string): WeaponType | null {
  const map: Record<string, WeaponType> = {
    lord: 'sword',
    mercenary: 'sword',
    swordmaster: 'sword',
    brigand: 'axe',
    berserker: 'axe',
    soldier: 'lance',
    cavalry: 'lance',
    paladin: 'lance',
    pegasus_knight: 'lance',
    falcon_knight: 'lance',
    general: 'lance',
    archer: 'bow',
    sniper: 'bow',
    mage: 'magic',
    sage: 'magic',
  };
  return map[unitClass] ?? null;
}
```

**Tests:** 6 tests covering rank thresholds, `wexpToRank` edge cases (0=E, 31=D, 71=C, 121=B, 181=A, 251=S), `canWield` checks, and `getPrimaryWeaponType` mapping.

---

### Task 2: Add `requiredRank` to WeaponData

**Objective:** Gate weapons behind rank requirements.

**Files:**
- Modify: `src/game/combat/Weapons.ts` — `WeaponData` gets `requiredRank?: WeaponRankLevel`
- Modify: `src/game/items/ItemTypes.ts` — `WeaponItem` gets `requiredRank?`

**Step 1: Extend interfaces**

```typescript
export interface WeaponData {
  // ... existing fields ...
  requiredRank?: WeaponRankLevel;  // NEW — defaults to E if omitted
}
```

**Step 2: Set rank requirements on weapons**

| Weapon | Required Rank |
|--------|--------------|
| Iron series | E (default omitted) |
| Steel series | D |
| Silver series | C |
| Killer series | C |
| Brave series | B |
| Javelin/Hand Axe | D |
| Armorslayer/Hammer/Horseslayer/Heavy Spear | D |

**Step 3: Test** — verify `WEAPON_DB['Steel Sword'].requiredRank` is `WeaponRankLevel.D`.

---

### Task 3: Add `weaponRanks` to Unit

**Objective:** Each unit tracks WEXP per weapon type.

**Files:**
- Modify: `src/game/units/Unit.ts` — add `weaponRanks` field, `getWeaponRank(type)`, `awardWeaponExp(type, amount)`
- Test: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Add to Unit**

```typescript
class Unit {
  // ... existing fields ...
  private _weaponRanks: Map<WeaponType, WeaponRankData> = new Map();

  getWeaponRank(type: WeaponType): WeaponRankData {
    return this._weaponRanks.get(type) ?? createWeaponRank();
  }

  awardWeaponExp(type: WeaponType, amount: number): void {
    const current = this.getWeaponRank(type);
    current.wexp += amount;
    const newRank = wexpToRank(current.wexp);
    if (newRank > current.rank) {
      current.rank = newRank;
      // Rank up!
    }
    this._weaponRanks.set(type, current);
  }
}
```

**Step 2: Set starting ranks per class**

Modify Unit constructor or `addUnit` to initialize weapon ranks based on class. Default E for all types. Class-primary weapon type starts at D (WEXP 31) for promoted units.

**Step 3: Tests**

- New unit has E rank, 0 WEXP in all weapon types
- `awardWeaponExp` increments WEXP
- WEXP 31 → rank D
- WEXP 71 → rank C
- Can't exceed S rank
- Rank-up is detected correctly

---

### Task 4: Award WEXP during combat

**Objective:** After each combat round, grant WEXP to both participants in their used weapon types.

**Files:**
- Modify: `src/game/combat/Engine.ts` — `resolveCombat` calls `awardWeaponExp`
- Test: `src/game/combat/__tests__/Engine.test.ts`

**Logic:**

In `resolveCombat`, after all attacks resolve, call:

```typescript
private awardWeaponExp(unit: Unit, weapon: WeaponData, roundsFought: number): void {
  const isPrimary = getPrimaryWeaponType(unit.unitClass) === weapon.type;
  const wexpPerRound = isPrimary ? 2 : 1;
  unit.awardWeaponExp(weapon.type, wexpPerRound * roundsFought);
}
```

Attacker gains WEXP for attacker weapon. Defender gains WEXP for defender weapon IF they had a weapon (some units use default weapon). Each round of combat (including brave multi-hits count as 1 round for WEXP purposes, matching GBA FE where WEXP is per combat round not per hit).

Actually, in GBA FE: WEXP +1 per round of combat REGARDLESS of number of hits. Brave weapons give +1 for the full round, not +2. So we track "rounds fought" not "hits landed."

**Test:**
```typescript
it('grants 1 WEXP per combat round', () => {
  const attacker = new Unit(...);
  const defender = new Unit(...);
  // Before: E rank, WEXP 0
  engine.resolveCombat(attacker, defender, ironSword, ironAxe);
  expect(attacker.getWeaponRank('sword').wexp).toBe(1);
  expect(defender.getWeaponRank('axe').wexp).toBe(1);
});

it('grants 2 WEXP when using primary weapon type', () => {
  // Mercenary primary is sword
  const merc = new Unit('m1', 'Merc', Faction.PLAYER, UnitClass.MERCENARY, ...);
  engine.resolveCombat(merc, defender, ironSword, ironAxe);
  expect(merc.getWeaponRank('sword').wexp).toBe(2);
});
```

---

### Task 5: Rank-gate weapons in `getWeaponForUnit`

**Objective:** Skip weapons the unit can't wield due to rank.

**Files:**
- Modify: `src/game/GameEngine.ts` — `getWeaponForUnit`
- Test: `src/game/__tests__/GameEngine.test.ts`

**Logic:**

When iterating weapons, check `item.requiredRank` against `unit.getWeaponRank(item.weaponType).rank`. If unit's rank is too low, skip that weapon.

```typescript
getWeaponForUnit(unit: Unit, weaponIndex?: number): WeaponData {
  // Check specific weapon index first
  if (weaponIndex !== undefined && ...) {
    const item = unit.inventory.items[weaponIndex];
    if (item && item.kind === 'weapon') {
      const w = item as WeaponItem;
      if (w.requiredRank === undefined || canWield(unit.getWeaponRank(w.weaponType).rank, w.requiredRank)) {
        return this._weaponItemToData(w);
      }
    }
  }
  // Find first eligible weapon
  const eligible = unit.inventory.items.find(i => {
    if (i.kind !== 'weapon') return false;
    const w = i as WeaponItem;
    return w.requiredRank === undefined || canWield(unit.getWeaponRank(w.weaponType).rank, w.requiredRank);
  }) as WeaponItem | undefined;
  // ... rest of fallback logic unchanged
}
```

**Test:**
```typescript
it('unit cannot equip rank-gated weapon', () => {
  const unit = engine.addUnit('u1', 'Test', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 3);
  unit.inventory.add(createItemByName('Silver Sword')!); // C rank, unit has E
  const weapon = engine.getWeaponForUnit(unit);
  expect(weapon.name).not.toBe('Silver Sword'); // falls through to Iron Sword default
});
```

---

### Task 6: Add `requiredRank` to `createItemByName`

**Objective:** Propagate rank requirement from WEAPON_DB to WeaponItem via ItemFactory.

**Files:**
- Modify: `src/game/items/ItemFactory.ts`
- Test: `src/game/items/__tests__/ItemFactory.test.ts`

Extract `requiredRank` from WEAPON_DB entry and pass to `createWeaponItem`:

```typescript
if (weapon) {
  const uses = /* existing logic */;
  return createWeaponItem(
    weapon.name, weapon.type, weapon.mt, weapon.hit, weapon.crit,
    weapon.minRange, weapon.maxRange, weapon.usesMagic, uses,
    weapon.consecutiveAttacks, weapon.weight,
  );
}
```

Also add `requiredRank` to `createWeaponItem` parameters and `WeaponItem` interface.

---

### Task 7: Run full suite

Run: `npx vitest run`

Fix any test regressions from new weapon rank requirements in existing tests.

---

## Verification Checklist

- [ ] Rank system: E(0)→D(31)→C(71)→B(121)→A(181)→S(251)
- [ ] `wexpToRank` correctly maps all thresholds
- [ ] Units track WEXP per weapon type
- [ ] WEXP awarded per combat round (+1 normal, +2 primary)
- [ ] Rank-gated weapons skipped when unit rank too low
- [ ] Rank displayed as letter (E/D/C/B/A/S)
- [ ] Units default to E rank in unused weapon types
- [ ] Class-primary weapon types correctly mapped
- [ ] Full test suite passes
