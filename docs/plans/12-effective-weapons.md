# Plan 12: Effective Weapons

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add effective weapon bonuses (3× might vs specific classes) to the combat engine — Armorslayer (vs armored), Hammer/Horseslayer (vs cavalry), bows (vs flying).

**Architecture:** Effective bonus is a WeaponData field (`effectiveAgainst`). `calcDamage` and `previewAttack` check if target class matches, and multiply `weaponMt` by 3 before the standard formula. All new weapons added to `WEAPON_DB` and `ItemFactory`.

**Tech Stack:** TypeScript, Vitest, pure game-engine TDD (no Phaser). Extend `src/game/combat/`.

**Fire Emblem GBA reference:** Effective weapons do 3× Might vs specific classes. Bows vs fliers, Armorslayer/Hammer vs armored, Horseslayer/Heavy Spear vs cavalry.

---

## Design Decisions

1. **Effective multiplier:** `weaponMt * 3` replaces `weaponMt` in `calcDamage` when target class is in `effectiveAgainst`. This matches GBA FE (`mt * 3 - def`).
2. **Class tag approach:** Rather than a per-weapon list of classes, we define class tags (`armored`, `cavalry`, `flying`) and weapons target tags. This avoids duplicating class lists across weapons.
3. **WeaponData field:** `effectiveAgainst?: UnitClassTag[]` — optional, only present on effective weapons.
4. **Class tags derived from UnitClass:** `getClassTags(unitClass)` returns a set — `armored` for General, `cavalry` for Cav/Paladin, `flying` for Peg/Falcon.

---

### Task 1: Define effective bonus types and class tags

**Objective:** Create the data structures for class tags and effective bonuses.

**Files:**
- Create: `src/game/combat/Effectiveness.ts` — `UnitClassTag`, `EFFECTIVE_MULTIPLIER`, `getClassTags()`
- Test: `src/game/combat/__tests__/Effectiveness.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { getClassTags, UnitClassTag } from '../Effectiveness';
import { UnitClass } from '../../units/Unit';

describe('getClassTags', () => {
  it('General is armored', () => {
    const tags = getClassTags(UnitClass.GENERAL);
    expect(tags.has('armored' as UnitClassTag)).toBe(true);
  });

  it('Cavalry is cavalry', () => {
    const tags = getClassTags(UnitClass.CAVALRY);
    expect(tags.has('cavalry' as UnitClassTag)).toBe(true);
  });

  it('Pegasus Knight is flying', () => {
    const tags = getClassTags(UnitClass.PEGASUS_KNIGHT);
    expect(tags.has('flying' as UnitClassTag)).toBe(true);
  });

  it('Paladin is both cavalry and armored', () => {
    const tags = getClassTags(UnitClass.PALADIN);
    expect(tags.has('cavalry' as UnitClassTag)).toBe(true);
    // Paladins are not armored in GBA FE — only Generals
    expect(tags.has('armored' as UnitClassTag)).toBe(false);
  });

  it('Mercenary has no tags', () => {
    const tags = getClassTags(UnitClass.MERCENARY);
    expect(tags.size).toBe(0);
  });

  it('Falcon Knight is flying', () => {
    const tags = getClassTags(UnitClass.FALCON_KNIGHT);
    expect(tags.has('flying' as UnitClassTag)).toBe(true);
  });
});
```

Run: `npx vitest run src/game/combat/__tests__/Effectiveness.test.ts`

**Step 2: Write minimal implementation**

```typescript
export type UnitClassTag = 'armored' | 'cavalry' | 'flying';

export const EFFECTIVE_MULTIPLIER = 3;

import { UnitClass } from '../units/Unit';

export function getClassTags(unitClass: UnitClass): Set<UnitClassTag> {
  const tags = new Set<UnitClassTag>();
  switch (unitClass) {
    case UnitClass.GENERAL:
      tags.add('armored');
      break;
    case UnitClass.CAVALRY:
    case UnitClass.PALADIN:
      tags.add('cavalry');
      break;
    case UnitClass.PEGASUS_KNIGHT:
    case UnitClass.FALCON_KNIGHT:
      tags.add('flying');
      break;
  }
  return tags;
}
```

**Step 4: Run test to verify pass** — `npx vitest run src/game/combat/__tests__/Effectiveness.test.ts`

---

### Task 2: Add `effectiveAgainst` to WeaponData and WEAPON_DB

**Objective:** Extend the WeaponData interface and add effective weapons to the database.

**Files:**
- Modify: `src/game/combat/Weapons.ts` — add `effectiveAgainst?: UnitClassTag[]` to `WeaponData`, add 5 effective weapons
- Test: `src/game/combat/__tests__/Weapons.test.ts` (existing, add tests)

**Step 1: Write failing test**

Add to `Weapons.test.ts`:

```typescript
import { WEAPON_DB } from '../Weapons';

describe('Effective weapons', () => {
  it('Armorslayer has effectiveAgainst armored', () => {
    const w = WEAPON_DB['Armorslayer'];
    expect(w.effectiveAgainst).toContain('armored');
  });

  it('Hammer has effectiveAgainst armored', () => {
    const w = WEAPON_DB['Hammer'];
    expect(w.effectiveAgainst).toContain('armored');
  });

  it('Horseslayer has effectiveAgainst cavalry', () => {
    const w = WEAPON_DB['Horseslayer'];
    expect(w.effectiveAgainst).toContain('cavalry');
  });

  it('Iron Bow has effectiveAgainst flying', () => {
    const w = WEAPON_DB['Iron Bow'];
    expect(w.effectiveAgainst).toContain('flying');
  });

  it('non-effective weapons have no effectiveAgainst', () => {
    const w = WEAPON_DB['Iron Sword'];
    expect(w.effectiveAgainst).toBeUndefined();
  });
});
```

Run: `npx vitest run src/game/combat/__tests__/Weapons.test.ts`

**Step 2: Add `effectiveAgainst` to WeaponData interface**

Patch `Weapons.ts`:

```typescript
export interface WeaponData {
  name: string;
  type: WeaponType;
  mt: number;
  hit: number;
  crit: number;
  minRange: number;
  maxRange: number;
  usesMagic: boolean;
  effectiveAgainst?: UnitClassTag[];  // NEW
}
```

Add import: `import type { UnitClassTag } from './Effectiveness';`

**Step 3: Add effective weapons to WEAPON_DB**

```typescript
'Armorslayer': {
  name: 'Armorslayer',
  type: WeaponType.SWORD,
  mt: 8,
  hit: 80,
  crit: 0,
  minRange: 1,
  maxRange: 1,
  usesMagic: false,
  effectiveAgainst: ['armored'],
},
'Hammer': {
  name: 'Hammer',
  type: WeaponType.AXE,
  mt: 8,
  hit: 55,
  crit: 0,
  minRange: 1,
  maxRange: 1,
  usesMagic: false,
  effectiveAgainst: ['armored'],
},
'Horseslayer': {
  name: 'Horseslayer',
  type: WeaponType.LANCE,
  mt: 7,
  hit: 70,
  crit: 0,
  minRange: 1,
  maxRange: 1,
  usesMagic: false,
  effectiveAgainst: ['cavalry'],
},
'Heavy Spear': {
  name: 'Heavy Spear',
  type: WeaponType.LANCE,
  mt: 9,
  hit: 70,
  crit: 0,
  minRange: 1,
  maxRange: 1,
  usesMagic: false,
  effectiveAgainst: ['armored'],
},
```

Add `effectiveAgainst: ['flying']` to existing `'Iron Bow'` and `'Killer Bow'`.

**Step 4: Run test to verify pass** — `npx vitest run src/game/combat/__tests__/Weapons.test.ts`

---

### Task 3: Compute effective damage in calcDamage

**Objective:** Modify `calcDamage` and `previewAttack`/`resolveHit` to apply the 3× might multiplier when effective.

**Files:**
- Modify: `src/game/combat/Formulas.ts` — `calcDamage` accepts effective multiplier
- Modify: `src/game/combat/Engine.ts` — `previewAttack` and `resolveHit` pass effective status
- Test: `src/game/combat/__tests__/Formulas.test.ts` (existing)

**Step 1: Write failing test in Formulas.test.ts**

```typescript
describe('calcDamage with effectiveness', () => {
  it('applies 3x might vs effective target', () => {
    // 10 atk + (8 mt * 3) - 12 def = 10 + 24 - 12 = 22
    const dmg = calcDamage(10, 8, 12, false, true);
    expect(dmg).toBe(22);
  });

  it('does not apply multiplier when not effective', () => {
    const dmg = calcDamage(10, 8, 12, false, false);
    expect(dmg).toBe(6); // 10 + 8 - 12 = 6
  });
});
```

**Step 2: Modify calcDamage signature**

```typescript
export function calcDamage(
  attackStat: number,
  weaponMt: number,
  defenseStat: number,
  _isMagical: boolean,
  isEffective = false,  // NEW
): number {
  const effectiveMt = isEffective ? weaponMt * 3 : weaponMt;
  const rawDamage = attackStat + effectiveMt - defenseStat;
  return Math.max(1, rawDamage);
}
```

**Step 4: Run test to verify pass** — `npx vitest run src/game/combat/__tests__/Formulas.test.ts`

---

### Task 4: Wire effectiveness into CombatEngine

**Objective:** Add a helper `isEffective(weapon, defenderClass)` and pass result to `calcDamage` in both `previewAttack` and `resolveHit`.

**Files:**
- Modify: `src/game/combat/Engine.ts` — add `isEffective` helper, use in both methods
- Test: `src/game/combat/__tests__/Engine.test.ts` (existing, add tests)

**Step 1: Write failing test in Engine.test.ts**

```typescript
describe('Effective damage', () => {
  it('Armorslayer does 3x mt vs General', () => {
    const grid = new Grid(8, 8);
    grid.setTerrain(3, 3, 'plains');
    grid.setTerrain(4, 3, 'plains');
    const engine = new CombatEngine(grid);
    const attacker = new Unit('a1', 'Seth', Faction.PLAYER, UnitClass.MERCENARY,
      createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 10, spd: 10, luk: 5, def: 5, res: 2, mov: 5 }),
      3, 3);
    const defender = new Unit('d1', 'General', Faction.ENEMY, UnitClass.GENERAL,
      createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 5, spd: 5, luk: 0, def: 12, res: 2, mov: 4 }),
      4, 3);
    const weapon = WEAPON_DB['Armorslayer'];
    const defWeapon = WEAPON_DB['Iron Lance'];
    
    const result = engine.resolveCombat(attacker, defender, weapon, defWeapon);
    // Armorslayer: mt 8 × 3 = 24 + str 10 - def 12 = 22 damage
    const hitEntry = result.log.find(e => e.hit);
    expect(hitEntry!.damage).toBe(22);
  });

  it('Iron Bow does 3x mt vs Pegasus Knight', () => {
    const grid = new Grid(8, 8);
    grid.setTerrain(3, 3, 'plains');
    grid.setTerrain(5, 3, 'plains');
    const engine = new CombatEngine(grid);
    const attacker = new Unit('a1', 'Archer', Faction.PLAYER, UnitClass.ARCHER,
      createStats({ hp: 25, maxHp: 25, str: 8, mag: 0, skl: 10, spd: 8, luk: 5, def: 5, res: 2, mov: 5 }),
      3, 3);
    const defender = new Unit('d1', 'Peg', Faction.ENEMY, UnitClass.PEGASUS_KNIGHT,
      createStats({ hp: 20, maxHp: 20, str: 6, mag: 0, skl: 8, spd: 10, luk: 5, def: 4, res: 5, mov: 7 }),
      5, 3);
    const weapon = WEAPON_DB['Iron Bow'];
    const defWeapon = WEAPON_DB['Iron Lance'];
    
    const result = engine.resolveCombat(attacker, defender, weapon, defWeapon);
    // Iron Bow: mt 6 × 3 = 18 + str 8 - def 4 = 22 damage
    const hitEntry = result.log.find(e => e.hit);
    expect(hitEntry!.damage).toBe(22);
  });

  it('Armorslayer does NOT get bonus vs non-armored', () => {
    const grid = new Grid(8, 8);
    grid.setTerrain(3, 3, 'plains');
    grid.setTerrain(4, 3, 'plains');
    const engine = new CombatEngine(grid);
    const attacker = new Unit('a1', 'Merc', Faction.PLAYER, UnitClass.MERCENARY,
      createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 10, spd: 10, luk: 5, def: 5, res: 2, mov: 5 }),
      3, 3);
    const defender = new Unit('d1', 'Cav', Faction.ENEMY, UnitClass.CAVALRY,
      createStats({ hp: 25, maxHp: 25, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 8, res: 2, mov: 7 }),
      4, 3);
    const weapon = WEAPON_DB['Armorslayer'];
    const defWeapon = WEAPON_DB['Iron Lance'];
    
    const result = engine.resolveCombat(attacker, defender, weapon, defWeapon);
    // No bonus: mt 8 + str 10 - def 8 = 10
    const hitEntry = result.log.find(e => e.hit);
    expect(hitEntry!.damage).toBe(10);
  });
});
```

**Step 2: Implement `isEffective` in CombatEngine**

Add to CombatEngine class:

```typescript
private isEffective(weapon: WeaponData, targetClass: UnitClass): boolean {
  if (!weapon.effectiveAgainst) return false;
  const tags = getClassTags(targetClass);
  return weapon.effectiveAgainst.some(tag => tags.has(tag));
}
```

Import `getClassTags` from `'./Effectiveness'` and `UnitClass` from `'../units/Unit'`.

**Step 3: Modify `previewAttack`**

In the damage calculation line, change:
```typescript
const damage = calcDamage(atkStat, weapon.mt + triangle.mtBonus, defStat, weapon.usesMagic);
```
To:
```typescript
const effective = this.isEffective(weapon, defender.unitClass);
const damage = calcDamage(atkStat, weapon.mt + triangle.mtBonus, defStat, weapon.usesMagic, effective);
```

**Step 4: Modify `resolveHit`**

Similarly, in the hit branch:
```typescript
const effective = this.isEffective(weapon, defender.unitClass);
damage = calcDamage(atkStat, weapon.mt + triangle.mtBonus, defStat, weapon.usesMagic, effective);
```

**Step 5: Run tests** — `npx vitest run src/game/combat/__tests__/Engine.test.ts`

---

### Task 5: Add effective weapons to ItemFactory and createItemByName

**Objective:** Make effective weapons creatable via the item factory (needed for shop/inventory integration).

**Files:**
- Modify: `src/game/items/ItemFactory.ts` — add effective weapons to `createItemByName`
- Modify: `src/game/items/__tests__/ItemFactory.test.ts` — verify factory output

**Step 1: Write failing test**

In `ItemFactory.test.ts`:

```typescript
it('createItemByName("Armorslayer") returns weapon with effectiveAgainst', () => {
  const item = createItemByName('Armorslayer') as WeaponItem;
  expect(item).not.toBeNull();
  expect(item.kind).toBe('weapon');
  expect(item.name).toBe('Armorslayer');
});

it('createItemByName("Horseslayer") returns weapon', () => {
  const item = createItemByName('Horseslayer') as WeaponItem;
  expect(item).not.toBeNull();
  expect(item.name).toBe('Horseslayer');
});
```

**Step 2: Implement**

`createItemByName` already handles all `WEAPON_DB` entries via the first branch. New entries are automatically supported. Add explicit `Javelin`/`Hand Axe` use-count check to also cover effective weapons:

```typescript
const uses = (name === 'Javelin' || name === 'Hand Axe') ? 20 : 40;
```

**Step 4: Run test** — `npx vitest run src/game/items/__tests__/ItemFactory.test.ts`

---

### Task 6: Run full suite and verify

Run: `npx vitest run`

Expected: All tests pass. Verify no regressions in existing combat tests.

---

## Verification Checklist

- [ ] `Armorslayer` does 3× mt vs General
- [ ] `Hammer` does 3× mt vs General
- [ ] `Horseslayer` + `Heavy Spear` do 3× mt vs Cavalry/Paladin
- [ ] Bows (`Iron Bow`, `Killer Bow`) do 3× mt vs Pegasus Knight/Falcon Knight
- [ ] Effective weapons do normal damage vs non-matching classes
- [ ] Non-effective weapons unaffected
- [ ] Combat preview shows effective damage
- [ ] Full test suite passes
