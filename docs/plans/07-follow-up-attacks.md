# Follow-Up (Double) Attacks Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Wire the already-computed `doubleAttack` flag into actual combat resolution so a fast unit attacks twice per round, matching GBA Fire Emblem behavior.

**Architecture:** The `AttackPreview` already computes `doubleAttack` correctly (`spdDiff >= 4`). This plan modifies only `CombatEngine.resolveCombat()` and `resolveAttack()` to execute a second attack when `doubleAttack` is true. The `resolveAttack()` method is refactored to avoid mutating the defender (damage is accumulated, applied after all attacks to let both swings show in the log). The defender can also double on their counterattack if their speed is ≥4 higher.

**Tech Stack:** TypeScript 5.4, Vitest 4.1, zero Phaser imports (pure logic in `src/game/`).

**Key GBA FE reference:** In FE7/8, a unit performs a follow-up attack if `(attackerSpd - defenderSpd) >= 4`. The follow-up happens in the same combat round (attacker→defender-counter→attacker-follow-up). If the attacker kills on the first hit, no follow-up fires. If the defender kills on their counter, the attacker follow-up still fires (unless the attacker is dead). Bows at range 1 cannot counter, but the attacker still doubles.

---

## Design Decisions

1. **Damage deferred:** `resolveAttack()` will compute damage but NOT apply it to the defender's HP. Damage application moves to the caller (`resolveCombat()`), which applies after each individual swing. This allows the combat log to show both hits even if the first hit would have killed.

2. **One `resolveAttack()` method, called multiple times:** Instead of duplicating the attack logic, `resolveCombat()` calls `resolveAttack()` up to twice for the attacker and up to twice for the defender counter.

3. **Dead-unit guard:** Between swings, check `!defender.isAlive` before the follow-up, and `!attacker.isAlive` before the defender's follow-up.

4. **Preview already correct:** The `doubleAttack` field in `AttackPreview` continues to show whether the follow-up WOULD fire. No changes needed to `previewCombat()`.

5. **EXP unchanged:** EXP is already calculated per combat, not per hit. No changes to `calcCombatExp()`.

---

### Task 1: Extract `resolveHit()` pure function for testability

**Objective:** Split the hit-resolution part of `resolveAttack()` into a standalone pure function so follow-up logic can be tested independently of the full combat engine.

**Files:**
- Create: `src/game/combat/ResolveHit.ts`
- Test: `src/game/combat/__tests__/ResolveHit.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/combat/__tests__/ResolveHit.test.ts
import { describe, it, expect } from 'vitest';
import { resolveHit } from '../ResolveHit';
import { createStats } from '../../units/Stats';
import { TERRAIN_DEFS } from '../../map/Terrain';

describe('resolveHit', () => {
  it('returns hit=true when RNG rolls below displayHit', () => {
    const attStats = createStats({ skl: 10, luk: 5, str: 8, spd: 8, def: 5, res: 3 });
    const defStats = createStats({ spd: 5, luk: 3, def: 4, res: 2 });
    const rng = makeRng([0.1, 0.2]); // avg 0.15 → well below any reasonable hit
    
    const result = resolveHit(
      weaponHit: 90, weaponMt: 5, weaponCrit: 0, weaponType: 'sword',
      usesMagic: false, defenderWeaponType: 'axe',
      attStats, defStats, TERRAIN_DEFS.plains, rng
    );

    expect(result.hit).toBe(true);
    expect(result.damage).toBeGreaterThan(0);
  });
});
```

**Step 2:** Run `npx vitest run src/game/combat/__tests__/ResolveHit.test.ts` — expected FAIL (file doesn't exist).

**Step 3: Write minimal implementation**

```typescript
// src/game/combat/ResolveHit.ts
import { UnitStats } from '../units/Stats';
import { WeaponType, getWeaponTriangleMod } from './Weapons';
import { TerrainData } from '../map/Terrain';
import {
  calcHitRate, calcAvoid, calcDisplayHit, calcCritRate,
  calcCritAvoid, calcDisplayCrit, calcDamage, rollTrueHit, rollCrit,
} from './Formulas';

export interface HitResult {
  hit: boolean;
  critical: boolean;
  damage: number;
  displayHit: number;
  displayCrit: number;
}

export function resolveHit(
  weaponHit: number,
  weaponMt: number,
  weaponCrit: number,
  weaponType: WeaponType,
  usesMagic: boolean,
  defenderWeaponType: WeaponType,
  attStats: UnitStats,
  defStats: UnitStats,
  terrain: TerrainData,
  rng: () => number,
  classCritBonus = 0,
): HitResult {
  const triangle = getWeaponTriangleMod(weaponType, defenderWeaponType);
  const hitRate = calcHitRate(weaponHit, attStats.skl, attStats.luk) + triangle.hitBonus;
  const avoid = calcAvoid(defStats.spd, defStats.luk, terrain.avoidBonus);
  const displayHit = calcDisplayHit(hitRate, avoid);
  const hit = rollTrueHit(displayHit, rng);

  let damage = 0;
  let critical = false;
  let displayCrit = 0;

  if (hit) {
    const atkStat = usesMagic ? attStats.mag : attStats.str;
    const defStat = usesMagic ? defStats.res : defStats.def;
    damage = calcDamage(atkStat, weaponMt + triangle.mtBonus, defStat, usesMagic);

    const critRate = calcCritRate(weaponCrit, attStats.skl, classCritBonus);
    const critAvoid = calcCritAvoid(defStats.luk);
    displayCrit = calcDisplayCrit(critRate, critAvoid);
    critical = rollCrit(displayCrit, rng);
    if (critical) damage *= 3;
  }

  return { hit, critical, damage, displayHit, displayCrit };
}
```

**Step 4:** Run test — expected PASS.

**Step 5:** Commit.

---

### Task 2: Add death-checking and damage application to `resolveHit` callers

**Objective:** Ensure `resolveCombat()` applies damage after each hit, checks `isAlive` between swings, and skips follow-ups against dead targets.

**Files:**
- Modify: `src/game/combat/Engine.ts` (lines 74–106)
- Test: `src/game/combat/__tests__/Engine.test.ts`

**Step 1: Write failing test — attacker doubles when speed diff ≥ 4**

```typescript
// In Engine.test.ts
it('attacker performs follow-up attack when speed diff >= 4', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS);

  // Fast attacker
  const fast = new Unit('a1', 'Swordmaster', Faction.PLAYER, UnitClass.SWORDMASTER,
    createStats({ hp: 30, maxHp: 30, str: 10, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
    3, 3);
  grid.placeUnit(fast, 3, 3);

  // Slow defender
  const slow = new Unit('e1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
    createStats({ hp: 25, maxHp: 25, str: 8, skl: 5, spd: 4, luk: 2, def: 4, res: 1 }),
    4, 3);
  grid.placeUnit(slow, 4, 3);

  const engine = new CombatEngine(grid);
  // Force hits, no crits
  const rng = makeRng([0, 0, 0, 0]); // all RNs = 0 → all hits, no crits
  const result = engine.resolveCombat(fast, slow, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng);

  // Attacker should get 2 entries, defender gets 1 counter
  expect(result.log.length).toBe(3);
  expect(result.log[0].attacker).toBe(fast);
  expect(result.log[1].attacker).toBe(slow);  // counter
  expect(result.log[2].attacker).toBe(fast);  // follow-up
});
```

**Step 2:** Run `npx vitest run src/game/combat/__tests__/Engine.test.ts` — expected FAIL (only 2 entries, no follow-up).

**Step 3: Modify `resolveCombat()` to execute follow-up attack**

Refactor `resolveCombat()` in `Engine.ts`:

```typescript
resolveCombat(
  attacker: Unit, defender: Unit,
  attackerWeapon: WeaponData, defenderWeapon: WeaponData,
  rng: () => number = Math.random,
): CombatResult {
  const log: CombatLogEntry[] = [];

  // Helper: perform one attack and apply damage
  const performAttack = (att: Unit, def: Unit, wpn: WeaponData, defWpn: WeaponData): CombatLogEntry => {
    const entry = this.resolveAttack(att, def, wpn, defWpn, rng);
    if (entry.hit) {
      def.takeDamage(entry.damage);
    }
    return entry;
  };

  // Determine follow-up eligibility
  const attSpd = attacker.stats.spd;
  const defSpd = defender.stats.spd;
  const attackerDoubles = attSpd - defSpd >= 4;
  const defenderDoubles = defSpd - attSpd >= 4;

  // --- Attacker's attack(s) ---
  // First attack
  log.push(performAttack(attacker, defender, attackerWeapon, defenderWeapon));
  
  // Follow-up (if eligible and defender still alive)
  if (attackerDoubles && defender.isAlive) {
    log.push(performAttack(attacker, defender, attackerWeapon, defenderWeapon));
  }

  // Check if defender died before counter
  if (!defender.isAlive) {
    const expAward = calcCombatExp(attacker.level, defender.level, true, true);
    return { log, attackerDied: false, defenderDied: true, expAward };
  }

  // --- Defender's counterattack(s) ---
  if (this.isInRange(defender.gridX, defender.gridY, attacker.gridX, attacker.gridY, defenderWeapon)) {
    // First counter
    log.push(performAttack(defender, attacker, defenderWeapon, attackerWeapon));

    // Defender follow-up (if eligible and attacker still alive)
    if (defenderDoubles && attacker.isAlive) {
      log.push(performAttack(defender, attacker, defenderWeapon, attackerWeapon));
    }
  }

  const attackerDied = !attacker.isAlive;
  const defenderDied = !defender.isAlive;
  const expAward = attackerDied ? 0 
    : calcCombatExp(attacker.level, defender.level, log.some(e => e.attacker === attacker && e.hit), defenderDied);

  return { log, attackerDied, defenderDied, expAward };
}
```

**Step 4:** Run test — expected PASS.

**Step 5:** Run full test suite `npx vitest run` — verify no regressions.

**Step 6:** Commit.

---

### Task 3: Test defender doubles on counterattack

**Objective:** Verify that a fast defender gets their own follow-up on counter.

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts` (append)

**Step 1: Write failing test**

```typescript
it('defender performs follow-up counter when speed diff >= 4', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS);

  // Slow attacker
  const slow = new Unit('a1', 'Brigand', Faction.PLAYER, UnitClass.BRIGAND,
    createStats({ hp: 30, maxHp: 30, str: 10, skl: 5, spd: 4, luk: 2, def: 5, res: 1 }),
    3, 3);
  grid.placeUnit(slow, 3, 3);

  // Fast defender (Swordmaster with spd 16)
  const fast = new Unit('e1', 'Swordmaster', Faction.ENEMY, UnitClass.SWORDMASTER,
    createStats({ hp: 30, maxHp: 30, str: 10, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
    4, 3);
  grid.placeUnit(fast, 4, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0, 0, 0, 0]);
  const result = engine.resolveCombat(slow, fast, WEAPON_DB['Iron Axe'], WEAPON_DB['Iron Sword'], rng);

  // Slow attacker hits once, fast defender counters twice
  expect(result.log.length).toBe(3);
  expect(result.log[0].attacker).toBe(slow);  // attacker
  expect(result.log[1].attacker).toBe(fast);  // counter 1
  expect(result.log[2].attacker).toBe(fast);  // counter 2 (follow-up)
});
```

**Step 2:** Run — expected FAIL.

**Step 3:** Already implemented in Task 2 (the `defenderDoubles` check handles this).

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 4: Test no follow-up when first hit kills

**Objective:** Verify that a killing blow stops the follow-up from firing.

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts` (append)

**Step 1: Write failing test**

```typescript
it('does not follow-up if first hit kills the defender', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS);

  // Fast attacker with enough atk to one-shot
  const fast = new Unit('a1', 'Berserker', Faction.PLAYER, UnitClass.BERSERKER,
    createStats({ hp: 30, maxHp: 30, str: 25, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
    3, 3);
  grid.placeUnit(fast, 3, 3);

  // Fragile defender
  const fragile = new Unit('e1', 'Mage', Faction.ENEMY, UnitClass.MAGE,
    createStats({ hp: 8, maxHp: 8, str: 1, mag: 5, skl: 5, spd: 4, luk: 2, def: 1, res: 5 }),
    4, 3);
  grid.placeUnit(fragile, 4, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0, 0, 0, 0]); // all hits
  const result = engine.resolveCombat(fast, fragile, WEAPON_DB['Killer Axe'], WEAPON_DB.Fire, rng);

  // Should only have 1 log entry (one-shot kill, no follow-up needed)
  expect(result.log.length).toBe(1);
  expect(result.defenderDied).toBe(true);
});
```

**Step 2:** Run — expected FAIL (might still log a follow-up against dead unit).

**Step 3:** Already handled by the `defender.isAlive` guard in Task 2 implementation.

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 5: Test no double when speed diff < 4

**Objective:** Verify standard combat (no double) still works correctly with refactored code.

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts` (append)

**Step 1: Write failing test**

```typescript
it('no follow-up when speed diff is less than 4', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS);

  const a = new Unit('a1', 'Mercenary', Faction.PLAYER, UnitClass.MERCENARY,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
    3, 3);
  grid.placeUnit(a, 3, 3);

  const b = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 6, spd: 7, luk: 2, def: 5, res: 2 }),
    4, 3);
  grid.placeUnit(b, 4, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0, 0, 0, 0]);
  const result = engine.resolveCombat(a, b, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Lance'], rng);

  // Standard: attacker hits, defender counters (no doubles)
  expect(result.log.length).toBe(2);
  expect(result.log[0].attacker).toBe(a);
  expect(result.log[1].attacker).toBe(b);
});
```

**Step 2:** Run — expected FAIL (old code produces 2 entries but test validates the new structure).

**Step 3:** Already covered.

**Step 4:** Run — expected PASS.

**Step 5:** Run full suite: `npx vitest run` — all green.

**Step 6:** Commit.

---

### Task 6: Verify combat preview unchanged

**Objective:** Ensure `previewCombat()` still works and `doubleAttack` field remains accurate.

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts` (append)

**Step 1: Write test**

```typescript
it('previewCombat shows doubleAttack=true when spd diff >= 4', () => {
  const grid = new Grid(8, 8);
  const engine = new CombatEngine(grid);
  const fast = /* ... spd 12 ... */;
  const slow = /* ... spd 7 ... */;

  const preview = engine.previewCombat(fast, slow, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe']);
  expect(preview.attacker.doubleAttack).toBe(true);
  expect(preview.defender?.doubleAttack).toBe(false);
});
```

**Step 2:** Run — should already PASS (preview computation unchanged).

**Step 3:** Commit.

---

### Task 7: Edge case — attacker dies to defender counter before follow-up

**Objective:** If attacker gets first hit, then defender counter kills attacker, attacker's follow-up should NOT fire.

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts` (append)

**Step 1: Write failing test**

```typescript
it('attacker does not follow-up if killed by defender counter', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS);

  // Fast but fragile attacker
  const fast = new Unit('a1', 'Swordmaster', Faction.PLAYER, UnitClass.SWORDMASTER,
    createStats({ hp: 10, maxHp: 10, str: 8, skl: 10, spd: 16, luk: 5, def: 2, res: 1 }),
    3, 3);
  grid.placeUnit(fast, 3, 3);

  // Slow but deadly defender
  const strong = new Unit('e1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
    createStats({ hp: 20, maxHp: 20, str: 18, skl: 5, spd: 4, luk: 2, def: 5, res: 1 }),
    4, 3);
  grid.placeUnit(strong, 4, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0, 0, 0, 0]); // all hits
  const result = engine.resolveCombat(fast, strong, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng);

  // Attacker hits (doesn't kill), defender counters and kills, no attacker follow-up
  expect(result.attackerDied).toBe(true);
  // Attacker should appear only once in log (their first attack, not a follow-up)
  const attackerEntries = result.log.filter(e => e.attacker === fast);
  expect(attackerEntries.length).toBe(1);
});
```

**Step 2:** Run — expected FAIL.

**Step 3:** Fix — the current code should already handle this since `resolveCombat()` checks `attacker.isAlive` before the follow-up. Verify.

**Step 4:** Run — expected PASS.

**Step 5:** Run full suite: `npx vitest run`.

**Step 6:** Commit.

---

### Task 8: Edge case — attacker bow vs melee (no counter) but attacker still doubles

**Objective:** Bow users at range should still get their follow-up against melee enemies who can't counter.

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts` (append)

**Step 1: Write test**

```typescript
it('bow attacker doubles against melee enemy who cannot counter', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(5, 3, TerrainType.PLAINS); // range 2

  const archer = new Unit('a1', 'Archer', Faction.PLAYER, UnitClass.ARCHER,
    createStats({ hp: 20, maxHp: 20, str: 10, skl: 10, spd: 14, luk: 5, def: 5, res: 3 }),
    3, 3);
  grid.placeUnit(archer, 3, 3);

  const soldier = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
    createStats({ hp: 30, maxHp: 30, str: 8, skl: 6, spd: 8, luk: 2, def: 5, res: 2 }),
    5, 3);
  grid.placeUnit(soldier, 5, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0, 0, 0, 0]);
  const result = engine.resolveCombat(archer, soldier, WEAPON_DB['Iron Bow'], WEAPON_DB['Iron Lance'], rng);

  // Archer doubles, soldier cannot counter (range 1 weapon at range 2)
  // Log should have 2 entries, both from archer
  expect(result.log.length).toBe(2);
  expect(result.log.every(e => e.attacker === archer)).toBe(true);
});
```

**Step 2:** Run — expected PASS (no counter already works, follow-up works).

**Step 3:** Commit.

---

### Task 9: Run full test suite and lint

**Objective:** Final validation.

```bash
npx vitest run
npm run lint
```

All tests green. No lint errors. Done.

---

## Verification Checklist

- [ ] Doubles fire when `spdDiff >= 4`
- [ ] Doubles don't fire when `spdDiff < 4`
- [ ] Killing blow on first hit prevents follow-up
- [ ] Defender can double on their counter
- [ ] Attacker follow-up cancelled if killed by defender counter
- [ ] Preview `doubleAttack` field unchanged and accurate
- [ ] Bow users double at range (no counter needed)
- [ ] All existing combat tests still pass
- [ ] All existing game engine tests still pass
