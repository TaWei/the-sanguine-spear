# Ranged Physical Weapons Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add Javelin (lance, 1–2 range) and Hand Axe (axe, 1–2 range) to the weapon database. This enables physical melee units to attack at range, matching GBA Fire Emblem where Javelins and Hand Axes are fundamental tactical tools.

**Architecture:** Pure data addition. The combat engine already supports `minRange`/`maxRange` per weapon. The weapon database `WEAPON_DB` gets two new entries. The `createItemByName()` factory and `getStartingItems()` helper are extended to distribute them. Zero logic changes needed — the range system, counterattack eligibility, and combat preview already handle variable ranges correctly.

**Key GBA FE reference:** Javelin (Mt 6, Hit 65, Range 1–2) and Hand Axe (Mt 7, Hit 60, Range 1–2) in FE7. We match the existing Iron weapon balance: slightly less Mt and Hit than the melee-only Iron variants in exchange for ranged capability.

**Tech Stack:** TypeScript 5.4, Vitest 4.1, no Phaser imports.

---

## Design Decisions

| Property | Javelin | Hand Axe | Reasoning |
|----------|---------|----------|-----------|
| Type | lance | axe | Matches weapon triangle |
| Mt | 5 | 6 | Lower than Iron Lance (6) / Iron Axe (8) — range tax |
| Hit | 65 | 60 | Lower than Iron Lance (80) / Iron Axe (70) — accuracy tax |
| Crit | 0 | 0 | Standard for iron-tier |
| minRange | 1 | 1 | Can attack adjacent (unlike bows) |
| maxRange | 2 | 2 | 2-tile reach |
| usesMagic | false | false | Physical damage, uses Str not Mag |
| Uses | 20 | 20 | Standard for GBA FE ranged physical |

Existing code that correctly handles these without changes:
- `calcDamage()` uses `atkStat = weapon.usesMagic ? mag : str` — correct
- `isInRange()` checks `minRange <= dist <= maxRange` — correct
- `previewAttack()` respects all range/type fields — correct
- Weapon triangle: lance ↔ sword, axe ↔ lance — correct
- `getStartingItems()` distributes by class — needs extension

---

### Task 1: Add Javelin and Hand Axe to `WEAPON_DB`

**Objective:** Register the two new weapons so the combat engine can reference them by name.

**Files:**
- Modify: `src/game/combat/Weapons.ts` (append to WEAPON_DB)
- Test: `src/game/combat/__tests__/Weapons.test.ts` (new or append)

**Step 1: Write failing test**

```typescript
// In Weapons.test.ts (or append to existing combat tests)
import { describe, it, expect } from 'vitest';
import { WEAPON_DB } from '../Weapons';

describe('Javelin and Hand Axe', () => {
  it('Javelin exists in WEAPON_DB with correct stats', () => {
    const j = WEAPON_DB['Javelin'];
    expect(j).toBeDefined();
    expect(j.type).toBe('lance');
    expect(j.mt).toBe(5);
    expect(j.hit).toBe(65);
    expect(j.crit).toBe(0);
    expect(j.minRange).toBe(1);
    expect(j.maxRange).toBe(2);
    expect(j.usesMagic).toBe(false);
  });

  it('Hand Axe exists in WEAPON_DB with correct stats', () => {
    const h = WEAPON_DB['Hand Axe'];
    expect(h).toBeDefined();
    expect(h.type).toBe('axe');
    expect(h.mt).toBe(6);
    expect(h.hit).toBe(60);
    expect(h.crit).toBe(0);
    expect(h.minRange).toBe(1);
    expect(h.maxRange).toBe(2);
    expect(h.usesMagic).toBe(false);
  });
});
```

**Step 2:** Run `npx vitest run src/game/combat/__tests__/Weapons.test.ts` — expected FAIL.

**Step 3: Add entries to WEAPON_DB**

```typescript
// In src/game/combat/Weapons.ts, append to WEAPON_DB:
'Javelin': {
  name: 'Javelin',
  type: WeaponType.LANCE,
  mt: 5,
  hit: 65,
  crit: 0,
  minRange: 1,
  maxRange: 2,
  usesMagic: false,
},
'Hand Axe': {
  name: 'Hand Axe',
  type: WeaponType.AXE,
  mt: 6,
  hit: 60,
  crit: 0,
  minRange: 1,
  maxRange: 2,
  usesMagic: false,
},
```

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 2: Add Javelin/Hand Axe to `createItemByName()` factory

**Objective:** Ensure the item factory can create Javelin and Hand Axe as inventory items (with `uses` field).

**Files:**
- Modify: `src/game/items/ItemFactory.ts` (no change needed — it already resolves from WEAPON_DB dynamically)
- Test: `src/game/items/__tests__/ItemFactory.test.ts`

**Step 1: Write test — factory creates ranged weapons with uses**

```typescript
// In ItemFactory.test.ts
import { describe, it, expect } from 'vitest';
import { createItemByName } from '../ItemFactory';

describe('createItemByName — ranged physical', () => {
  it('creates Javelin with 20 uses', () => {
    const item = createItemByName('Javelin');
    expect(item).toBeDefined();
    expect(item!.kind).toBe('weapon');
    expect(item!.name).toBe('Javelin');
    if (item!.kind === 'weapon') {
      expect(item.uses).toBe(20);
      expect(item.minRange).toBe(1);
      expect(item.maxRange).toBe(2);
      expect(item.weaponType).toBe('lance');
    }
  });

  it('creates Hand Axe with 20 uses', () => {
    const item = createItemByName('Hand Axe');
    expect(item).toBeDefined();
    expect(item!.kind).toBe('weapon');
    expect(item!.name).toBe('Hand Axe');
    if (item!.kind === 'weapon') {
      expect(item.uses).toBe(20);
      expect(item.weaponType).toBe('axe');
    }
  });
});
```

**Step 2:** Run — expected FAIL (current `createWeaponItem()` defaults to 40 uses, not 20).

**Step 3: Fix — Javelin and Hand Axe should have 20 uses**

The issue: `createItemByName()` calls `createWeaponItem()` which hardcodes 40 uses. We need to either:
- Add a `uses` parameter to `createWeaponItem()`
- Or handle Javelin/Hand Axe as special cases in `createItemByName()`
- Or override uses after creation

Simplest approach — override uses in `createItemByName()` for these specific weapons:

```typescript
// In createItemByName(), after creating the weapon:
if (weapon) {
  const item = createWeaponItem(
    weapon.name, weapon.type, weapon.mt, weapon.hit, weapon.crit,
    weapon.minRange, weapon.maxRange, weapon.usesMagic,
  );
  // Ranged physical weapons have 20 uses (matching GBA FE)
  if (name === 'Javelin' || name === 'Hand Axe') {
    (item as any).uses = 20;
  }
  return item;
}
```

Better: Add an optional `uses` parameter to `createWeaponItem()`:

```typescript
export function createWeaponItem(
  name: string, weaponType: WeaponType,
  mt: number, hit: number, crit: number,
  minRange: number, maxRange: number,
  usesMagic: boolean, uses = 40,
): WeaponItem {
  return { kind: 'weapon', name, weaponType, mt, hit, crit, minRange, maxRange, usesMagic, uses };
}
```

Then in `createItemByName()`, pass `uses: 20` for Javelin and Hand Axe. This is cleaner.

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 3: Give Javelin/Hand Axe as starting items to appropriate classes

**Objective:** Soldier gets Javelin option, Brigand gets Hand Axe option. Actually, in FE GBA, Javelin is a separate weapon (not the default). For Sanguine Spear, let's give:
- Soldiers: Iron Lance (primary) — unchanged
- Cavaliers: could get Javelin as a secondary weapon (they have lances in FE)
- Brigands: Iron Axe (primary) — unchanged, but could also carry Hand Axe
- Actually, for simplicity: just make them available as shop items and enemy drops. Don't change starting inventory.

**Files:**
- Test: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write integration test — Javelin used in combat at range 2**

```typescript
it('Javelin can attack at range 2 and cannot be countered by 1-range weapons', () => {
  const engine = new GameEngine(8, 8);
  engine.setTerrain(3, 3, TerrainType.PLAINS);
  engine.setTerrain(5, 3, TerrainType.PLAINS); // 2 tiles apart

  // Give a unit a Javelin
  const soldier = engine.addUnit('p1', 'Soldier', Faction.PLAYER, UnitClass.SOLDIER,
    createStats({ hp: 20, maxHp: 20, str: 10, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
    3, 3);
  // Replace default Iron Lance with Javelin
  soldier.inventory.removeAt(0);
  soldier.inventory.add(createItemByName('Javelin')!);

  const brigand = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 5, spd: 5, luk: 2, def: 4, res: 1 }),
    5, 3);

  const preview = engine.getCombatPreview(soldier, brigand, 0);
  expect(preview.attacker.hit).toBeGreaterThan(0);
  expect(preview.attacker.damage).toBeGreaterThan(0);
  // Defender should not be able to counter (Iron Axe is range 1)
  expect(preview.defender).toBeNull();
});
```

**Step 2:** Run — expected FAIL (no Javelin in inventory after add until Task 1/2 complete).

Actually, after Tasks 1+2, this should pass since `createItemByName('Javelin')` works.

**Step 3:** Run — expected PASS.

**Step 4:** Commit.

---

### Task 4: Combat edge case — Javelin at range 1 allows counter

**Objective:** Verify that when Javelin user attacks at range 1, the defender CAN counter (unlike bows).

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts` (append)

**Step 1: Write test**

```typescript
it('Javelin at range 1 allows defender counterattack (unlike bows)', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS); // adjacent

  const att = new Unit('a1', 'Soldier', Faction.PLAYER, UnitClass.SOLDIER,
    createStats({ hp: 20, maxHp: 20, str: 10, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
    3, 3);
  grid.placeUnit(att, 3, 3);

  const def = new Unit('e1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 5, spd: 5, luk: 2, def: 4, res: 1 }),
    4, 3);
  grid.placeUnit(def, 4, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0, 0, 0, 0]);
  const result = engine.resolveCombat(
    att, def,
    WEAPON_DB['Javelin'], WEAPON_DB['Iron Axe'],
    rng,
  );

  // Both get at least one attack (attacker + defender counter)
  expect(result.log.length).toBeGreaterThanOrEqual(2);
  const defEntries = result.log.filter(e => e.attacker === def);
  expect(defEntries.length).toBeGreaterThanOrEqual(1); // defender countered
});
```

**Step 2:** Run — expected PASS (range 1 is within Javelin's minRange and Iron Axe's range, so counter is valid).

**Step 3:** Commit.

---

### Task 5: Weapon triangle interaction with Javelin and Hand Axe

**Objective:** Verify triangle bonuses apply correctly. Javelin (lance) has advantage over Sword users. Hand Axe (axe) has advantage over Lance users.

**Files:**
- Test: `src/game/combat/__tests__/Weapons.test.ts` (append)

**Step 1: Write test**

```typescript
it('Javelin gets weapon triangle advantage vs swords', () => {
  const mod = getWeaponTriangleMod(WeaponType.LANCE, WeaponType.SWORD);
  expect(mod.mtBonus).toBe(1);
  expect(mod.hitBonus).toBe(15);
});

it('Hand Axe gets weapon triangle advantage vs lances', () => {
  const mod = getWeaponTriangleMod(WeaponType.AXE, WeaponType.LANCE);
  expect(mod.mtBonus).toBe(1);
  expect(mod.hitBonus).toBe(15);
});

it('Javelin gets weapon triangle disadvantage vs axes', () => {
  const mod = getWeaponTriangleMod(WeaponType.LANCE, WeaponType.AXE);
  expect(mod.mtBonus).toBe(-1);
  expect(mod.hitBonus).toBe(-15);
});
```

**Step 2:** Run — expected PASS (triangle already works on weapon type, not weapon name).

**Step 3:** Commit.

---

### Task 6: Run full test suite and lint

```bash
npx vitest run
npm run lint
```

---

## Verification Checklist

- [ ] Javelin exists in WEAPON_DB: lance, Mt 5, Hit 65, Range 1–2
- [ ] Hand Axe exists in WEAPON_DB: axe, Mt 6, Hit 60, Range 1–2
- [ ] Both weapons creatable via `createItemByName()` with 20 uses
- [ ] Attack at range 2 works (no counter from 1-range weapon)
- [ ] Attack at range 1 allows counterattack (unlike bows)
- [ ] Weapon triangle bonuses apply to Javelin/Hand Axe by type
- [ ] Combat preview correctly shows hit/damage/crit for ranged physical
- [ ] Enemy AI can use Javelin/Hand Axe if given to enemy units
- [ ] No regressions in existing tests
