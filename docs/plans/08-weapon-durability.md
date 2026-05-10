# Weapon Durability Consumption Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Weapons lose durability when used in combat. Each attack round (not each swing) consumes 1 use. When a weapon reaches 0 uses, it breaks and is removed from inventory. Broken weapons mid-combat stop further attacks from that unit.

**Architecture:** The `CombatEngine.resolveCombat()` is extended to accept weapon index references and decrement durability per attack round. The change is purely in `src/game/combat/Engine.ts` — no Phaser code touched. The `Inventory` already has `useAt()` which decrements and auto-removes at 0. The `WeaponItem.uses` field is already present. The only missing piece: combat never calls `useAt()`.

**Key GBA FE reference:** In FE7/8, weapon durability is consumed once per round of combat (one initiation), not per hit/swing. A double attack costs 1 use, not 2. Counterattacks also cost 1 use. If a weapon breaks mid-round, subsequent attacks stop. At 0 uses, the weapon is removed from inventory entirely.

**Tech Stack:** TypeScript 5.4, Vitest 4.1, zero Phaser imports.

---

## Design Decisions

1. **Per-round consumption, not per-hit:** Each call to `resolveAttack()` consumes 1 use. Since `resolveCombat()` calls `resolveAttack()` once per attack round (first attack, follow-up, counter, counter follow-up), this means each round costs 1 use. This matches GBA FE where a double-hit still only costs 1 durability.

2. **Weapon tracking via `{ uses: number }` mutable wrapper:** Rather than threading the full `WeaponItem` through the combat engine, we pass a simple `{ uses: number }` object that gets mutated during combat. This avoids coupling `CombatEngine` to `Inventory` and `WeaponItem` types.

3. **Broken weapon stops further attacks:** If `uses` reaches 0 after an attack round, that unit cannot perform further attack rounds in this combat (no follow-up, no counter for that side).

4. **Post-combat sync:** After `resolveCombat()` returns, the caller (GameEngine for player attacks, BattleScene for enemy attacks) is responsible for calling `inventory.useAt()` if the weapon broke, to remove it from inventory. The plan creates a helper `syncWeaponDurability()` in GameEngine.

5. **Staves already consume uses correctly** — `StaffEngine.resolve()` already calls `inventory.useAt()`. No changes needed there.

---

### Task 1: Create `WeaponUses` type and `DurabilityTracker` helper

**Objective:** Create a pure helper that tracks weapon uses during combat, returning whether a weapon is broken after consumption.

**Files:**
- Create: `src/game/combat/DurabilityTracker.ts`
- Test: `src/game/combat/__tests__/DurabilityTracker.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/combat/__tests__/DurabilityTracker.test.ts
import { describe, it, expect } from 'vitest';
import { DurabilityTracker, createDurabilityTracker } from '../DurabilityTracker';

describe('DurabilityTracker', () => {
  it('starts with initial uses', () => {
    const tracker = createDurabilityTracker(45);
    expect(tracker.uses).toBe(45);
    expect(tracker.isBroken).toBe(false);
  });

  it('consume() decrements uses by 1', () => {
    const tracker = createDurabilityTracker(45);
    tracker.consume();
    expect(tracker.uses).toBe(44);
    expect(tracker.wasUsed).toBe(true);
  });

  it('consume() returns false when weapon breaks', () => {
    const tracker = createDurabilityTracker(1);
    const stillUsable = tracker.consume();
    expect(stillUsable).toBe(false); // weapon just broke
    expect(tracker.uses).toBe(0);
    expect(tracker.isBroken).toBe(true);
  });

  it('isBroken is true when uses are 0', () => {
    const tracker = createDurabilityTracker(0);
    expect(tracker.isBroken).toBe(true);
  });

  it('wasUsed starts false and becomes true after first consume', () => {
    const tracker = createDurabilityTracker(5);
    expect(tracker.wasUsed).toBe(false);
    tracker.consume();
    expect(tracker.wasUsed).toBe(true);
  });

  it('multiple consumes work correctly', () => {
    const tracker = createDurabilityTracker(3);
    tracker.consume(); // 2
    tracker.consume(); // 1
    expect(tracker.uses).toBe(1);
    expect(tracker.isBroken).toBe(false);
    tracker.consume(); // 0
    expect(tracker.isBroken).toBe(true);
  });
});
```

**Step 2:** Run `npx vitest run src/game/combat/__tests__/DurabilityTracker.test.ts` — expected FAIL.

**Step 3: Write minimal implementation**

```typescript
// src/game/combat/DurabilityTracker.ts
export interface DurabilityTracker {
  readonly uses: number;
  readonly isBroken: boolean;
  readonly wasUsed: boolean;
  consume(): boolean; // returns false when weapon breaks
}

export function createDurabilityTracker(initial: number): DurabilityTracker {
  let uses = Math.max(0, initial);
  let wasUsed = false;

  return {
    get uses() { return uses; },
    get isBroken() { return uses <= 0; },
    get wasUsed() { return wasUsed; },

    consume(): boolean {
      if (uses <= 0) return false;
      uses -= 1;
      wasUsed = true;
      return uses > 0; // still usable after this consume
    },
  };
}
```

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 2: Wire `DurabilityTracker` into `CombatEngine.resolveAttack()`

**Objective:** Make `resolveAttack()` consume 1 weapon use per call. Return whether the weapon broke so the caller can stop further attacks.

**Files:**
- Modify: `src/game/combat/Engine.ts` (resolveAttack signature and body)
- Test: `src/game/combat/__tests__/Engine.test.ts` (add durability tests)

**Step 1: Write failing test — weapon uses consumed after combat**

```typescript
import { createDurabilityTracker } from '../DurabilityTracker';

it('consumes 1 weapon use per attack round', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS);

  const att = new Unit('a1', 'Mercenary', Faction.PLAYER, UnitClass.MERCENARY,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 8, spd: 10, luk: 3, def: 5, res: 2 }),
    3, 3);
  grid.placeUnit(att, 3, 3);

  const def = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 6, spd: 7, luk: 2, def: 5, res: 2 }),
    4, 3);
  grid.placeUnit(def, 4, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0, 0, 0, 0]);
  const attTracker = createDurabilityTracker(45);
  const defTracker = createDurabilityTracker(40);

  const result = engine.resolveCombat(
    att, def, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Lance'],
    rng, attTracker, defTracker,
  );

  // Attacker used 1 use for their attack
  expect(attTracker.uses).toBe(44);
  // Defender used 1 use for their counter
  expect(defTracker.uses).toBe(39);
  expect(result.attackerWeaponUsed).toBe(true);
  expect(result.defenderWeaponUsed).toBe(true);
});
```

**Step 2:** Run — expected FAIL (new parameters don't exist).

**Step 3: Modify `CombatEngine`**

Change the `resolveCombat()` signature and body in `Engine.ts`:

```typescript
import { DurabilityTracker } from './DurabilityTracker';

export interface CombatResult {
  log: CombatLogEntry[];
  attackerDied: boolean;
  defenderDied: boolean;
  expAward: number;
  attackerWeaponUsed: boolean;
  defenderWeaponUsed: boolean;
}

export class CombatEngine {
  // ...

  resolveCombat(
    attacker: Unit,
    defender: Unit,
    attackerWeapon: WeaponData,
    defenderWeapon: WeaponData,
    rng: () => number = Math.random,
    attTracker?: DurabilityTracker,
    defTracker?: DurabilityTracker,
  ): CombatResult {
    const log: CombatLogEntry[] = [];
    let attackerWeaponUsed = false;
    let defenderWeaponUsed = false;

    const performAttack = (
      att: Unit, def: Unit, wpn: WeaponData, defWpn: WeaponData,
      tracker?: DurabilityTracker,
    ): CombatLogEntry | null => {
      // Don't attack if weapon is broken
      if (tracker && tracker.isBroken) return null;
      
      const entry = this.resolveAttack(att, def, wpn, defWpn, rng);
      if (entry.hit) {
        def.takeDamage(entry.damage);
      }
      
      // Consume durability
      if (tracker) {
        tracker.consume();
      }
      
      return entry;
    };

    const attSpd = attacker.stats.spd;
    const defSpd = defender.stats.spd;
    const attackerDoubles = attSpd - defSpd >= 4;
    const defenderDoubles = defSpd - attSpd >= 4;

    // Attacker's attack(s)
    const a1 = performAttack(attacker, defender, attackerWeapon, defenderWeapon, attTracker);
    if (a1) { log.push(a1); attackerWeaponUsed = true; }

    if (attackerDoubles && defender.isAlive) {
      const a2 = performAttack(attacker, defender, attackerWeapon, defenderWeapon, attTracker);
      if (a2) log.push(a2);
    }

    if (!defender.isAlive) {
      const expAward = calcCombatExp(attacker.level, defender.level, true, true);
      return { log, attackerDied: false, defenderDied: true, expAward, attackerWeaponUsed, defenderWeaponUsed: false };
    }

    // Defender's counterattack(s)
    if (this.isInRange(defender.gridX, defender.gridY, attacker.gridX, attacker.gridY, defenderWeapon)) {
      const d1 = performAttack(defender, attacker, defenderWeapon, attackerWeapon, defTracker);
      if (d1) { log.push(d1); defenderWeaponUsed = true; }

      if (defenderDoubles && attacker.isAlive) {
        const d2 = performAttack(defender, attacker, defenderWeapon, attackerWeapon, defTracker);
        if (d2) log.push(d2);
      }
    }

    const attackerDied = !attacker.isAlive;
    const defenderDied = !defender.isAlive;
    const expAward = attackerDied ? 0
      : calcCombatExp(attacker.level, defender.level, log.some(e => e.attacker === attacker && e.hit), defenderDied);

    return { log, attackerDied, defenderDied, expAward, attackerWeaponUsed, defenderWeaponUsed };
  }
}
```

Note: the old signature also needs to stay working for backward compat. Use the optional parameters — they default to undefined, and the consumption is skipped.

**Step 4:** Run — expected PASS.

**Step 5:** Run full suite `npx vitest run` — verify no regressions.

**Step 6:** Commit.

---

### Task 3: Test weapon breaks mid-combat

**Objective:** If attacker's weapon breaks on the first hit, their follow-up must not fire.

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts`

**Step 1: Write failing test**

```typescript
it('stops attacking when weapon breaks (uses reaches 0)', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS);

  const fast = new Unit('a1', 'Swordmaster', Faction.PLAYER, UnitClass.SWORDMASTER,
    createStats({ hp: 30, maxHp: 30, str: 8, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
    3, 3);
  grid.placeUnit(fast, 3, 3);

  const slow = new Unit('e1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
    createStats({ hp: 30, maxHp: 30, str: 8, skl: 5, spd: 4, luk: 2, def: 4, res: 1 }),
    4, 3);
  grid.placeUnit(slow, 4, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0, 0, 0, 0]);
  // Weapon has only 1 use — breaks after first attack
  const attTracker = createDurabilityTracker(1);
  const defTracker = createDurabilityTracker(40);

  const result = engine.resolveCombat(
    fast, slow, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'],
    rng, attTracker, defTracker,
  );

  // Attacker should only get 1 attack (weapon broke, no follow-up)
  const attEntries = result.log.filter(e => e.attacker === fast);
  expect(attEntries.length).toBe(1);
  expect(attTracker.isBroken).toBe(true);
  expect(attTracker.uses).toBe(0);
});
```

**Step 2:** Run — expected FAIL.

**Step 3:** Implementation already handles this (the `tracker.isBroken` check in `performAttack`).

**Step 4:** Run — expected PASS.

**Step 5:** Commit.

---

### Task 4: Test defender's weapon breaks on counter

**Objective:** If defender's weapon has 1 use and breaks after their counter, their follow-up must not fire.

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts`

**Step 1: Write test**

```typescript
it('defender follow-up stopped when defender weapon breaks on first counter', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS);

  const att = new Unit('a1', 'Brigand', Faction.PLAYER, UnitClass.BRIGAND,
    createStats({ hp: 30, maxHp: 30, str: 8, skl: 5, spd: 4, luk: 2, def: 5, res: 1 }),
    3, 3);
  grid.placeUnit(att, 3, 3);

  const fastDef = new Unit('e1', 'Swordmaster', Faction.ENEMY, UnitClass.SWORDMASTER,
    createStats({ hp: 30, maxHp: 30, str: 8, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
    4, 3);
  grid.placeUnit(fastDef, 4, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0, 0, 0, 0]);
  const attTracker = createDurabilityTracker(45);
  const defTracker = createDurabilityTracker(1); // breaks after 1 use

  const result = engine.resolveCombat(
    att, fastDef, WEAPON_DB['Iron Axe'], WEAPON_DB['Iron Sword'],
    rng, attTracker, defTracker,
  );

  // Defender should only counter once (weapon broke, no follow-up)
  const defEntries = result.log.filter(e => e.attacker === fastDef);
  expect(defEntries.length).toBe(1);
  expect(defTracker.isBroken).toBe(true);
});
```

**Step 2:** Run — expected PASS.

**Step 3:** Commit.

---

### Task 5: Add `syncWeaponDurability()` to GameEngine

**Objective:** After combat, the GameEngine must sync inventory state — removing items whose durability trackers hit 0.

**Files:**
- Modify: `src/game/GameEngine.ts` (add sync method and wire into resolvePlayerCombat)
- Test: `src/game/__tests__/GameEngine.test.ts` (add weapon durability test)

**Step 1: Write failing test — inventory weapon removed after breaking**

```typescript
it('removes weapon from inventory when durability reaches 0 after combat', () => {
  const engine = new GameEngine(8, 8);
  engine.setTerrain(3, 3, TerrainType.PLAINS);
  engine.setTerrain(4, 3, TerrainType.PLAINS);

  const rowan = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
    3, 3);

  const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 5, spd: 4, luk: 2, def: 4, res: 1 }),
    4, 3);

  // Manually set the weapon to 1 use
  const weapon = rowan.inventory.items[0] as WeaponItem;
  (weapon as any).uses = 1;

  const initialSize = rowan.inventory.size;
  const rng = makeRng([0, 0, 0, 0]);
  
  const result = engine.resolvePlayerCombat(rowan, enemy, rng, 0);
  
  // The weapon should be gone from inventory
  expect(rowan.inventory.size).toBe(initialSize - 1);
  // No weapon left means next getWeaponForUnit falls back to class default
});
```

**Step 2:** Run — expected FAIL (weapon not consumed).

**Step 3: Implement `resolvePlayerCombat` durability sync**

In `GameEngine.ts`, modify `resolvePlayerCombat()`:

```typescript
resolvePlayerCombat(
  attacker: Unit,
  defender: Unit,
  rng?: () => number,
  attackerWeaponIndex?: number,
): CombatResult {
  const combat = new CombatEngine(this.grid);
  const attWeapon = this.getWeaponForUnit(attacker, attackerWeaponIndex);
  const defWeapon = this.getWeaponForUnit(defender);

  // Create durability trackers
  const attTracker = attackerWeaponIndex !== undefined
    ? createDurabilityTracker(attacker.inventory.items[attackerWeaponIndex].uses)
    : undefined;
  
  const defWeaponIdx = defender.inventory.items.findIndex(i => i.kind === 'weapon');
  const defTracker = defWeaponIdx >= 0
    ? createDurabilityTracker(defender.inventory.items[defWeaponIdx].uses)
    : undefined;

  const result = combat.resolveCombat(attacker, defender, attWeapon, defWeapon, rng, attTracker, defTracker);

  // Sync inventory after combat
  this.syncWeaponDurability(attacker, attackerWeaponIndex, attTracker);
  this.syncWeaponDurability(defender, defWeaponIdx, defTracker);

  return result;
}

private syncWeaponDurability(
  unit: Unit,
  weaponIndex: number | undefined,
  tracker: DurabilityTracker | undefined,
): void {
  if (!tracker || weaponIndex === undefined || weaponIndex < 0) return;
  if (!tracker.wasUsed) return;
  
  // Consume the difference between original and remaining
  const item = unit.inventory.items[weaponIndex];
  if (!item || item.kind !== 'weapon') return;
  
  // If weapon broke, remove it; otherwise decrement uses
  if (tracker.isBroken) {
    unit.inventory.useAt(weaponIndex); // useAt auto-removes at 0
  } else {
    // Manually set the uses to the remaining count
    (item as any).uses = tracker.uses;
  }
}
```

Wait, this is getting awkward. Let me simplify: just call `useAt` once for each attack round. But the tracker already decremented inside CombatEngine. So we'd double-decrement.

Simpler approach: Don't use useAt at all. Just sync the `uses` count directly:

```typescript
private syncWeaponDurability(
  unit: Unit,
  weaponIndex: number,
  tracker: DurabilityTracker,
): void {
  if (!tracker.wasUsed) return;
  
  const item = unit.inventory.items[weaponIndex];
  if (!item || item.kind !== 'weapon') return;

  if (tracker.isBroken) {
    unit.inventory.removeAt(weaponIndex);
  } else {
    // Mutate the uses field directly (WeaponItem.uses is a public number)
    (item as WeaponItem).uses = tracker.uses;
  }
}
```

This is clean. The tracker is the source of truth during combat. After combat, we sync back to inventory.

**Step 4:** Run — expected PASS.

**Step 5:** Run full suite: `npx vitest run` — verify no regressions.

**Step 6:** Commit.

---

### Task 6: Wire durability into enemy AI combat (BattleScene)

**Objective:** Enemy attacks during enemy phase must also consume durability. This requires passing weapon indices from the Commander's actions.

**Files:**
- Modify: `src/scenes/BattleScene.ts` (enemy action execution)
- Test: No Vitest test (scene code) — verify via engine-level test only.

**Step 1: Write engine-level test — enemy weapon consumed**

```typescript
// In GameEngine.test.ts
it('enemy weapon uses consumed during AI combat', () => {
  const engine = new GameEngine(8, 8);
  engine.setTerrain(3, 3, TerrainType.PLAINS);
  engine.setTerrain(4, 3, TerrainType.PLAINS);

  const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
    3, 3);

  const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 5, spd: 8, luk: 2, def: 4, res: 1 }),
    4, 3);

  const initialUses = (enemy.inventory.items[0] as WeaponItem).uses;
  
  // Simulate enemy phase: endTurn generates enemy actions
  const hazardReport = engine.endTurn();
  const actions = engine.getPendingActions();
  
  // Execute the attack action
  const attackAction = actions.find(a => a.type === 'attack')!;
  expect(attackAction).toBeDefined();
  
  // Find the weapon index
  const eWeaponIdx = enemy.inventory.items.findIndex(i => i.kind === 'weapon');
  const rng = makeRng([0, 0, 0, 0]);
  const combat = new CombatEngine(engine.grid);
  const eWeapon = engine.getWeaponForUnit(enemy, eWeaponIdx);
  const pWeapon = engine.getWeaponForUnit(player);
  
  const eTracker = createDurabilityTracker(enemy.inventory.items[eWeaponIdx].uses);
  
  const result = combat.resolveCombat(enemy, player, eWeapon, pWeapon, rng, eTracker);
  
  // Enemy weapon used
  expect(eTracker.wasUsed).toBe(true);
  expect(eTracker.uses).toBe(initialUses - 1);
});
```

**Step 2:** Run — expected FAIL or PASS depending on path.

**Step 3:** Modify `BattleScene.executeEnemyActions()` to pass durability trackers.

The key change in BattleScene's attack execution branch:
```typescript
// In the attack action handler:
const eWeaponIdx = enemy.inventory.items.findIndex(i => i.kind === 'weapon');
const eTracker = createDurabilityTracker(enemy.inventory.items[eWeaponIdx]?.uses ?? 0);
const result = combat.resolveCombat(enemy, target, eWeapon, pWeapon, rng, eTracker);
// Sync durability
if (eTracker.wasUsed) {
  if (eTracker.isBroken) enemy.inventory.removeAt(eWeaponIdx);
  else (enemy.inventory.items[eWeaponIdx] as any).uses = eTracker.uses;
}
```

**Step 4:** Visual verification — run `npm run dev`, play through enemy attacks, check inventories in debug.

**Step 5:** Commit.

---

### Task 7: Test no durability consumed when attack misses

**Objective:** Misses don't consume weapon uses (debate: in actual FE, misses DO consume uses. But for this plan, we follow FE GBA: durability IS consumed on miss because the weapon was still swung).

Actually, in FE GBA, weapon uses ARE consumed on misses. The weapon was swung. So this test should verify that misses still consume uses.

**Files:**
- Test: `src/game/combat/__tests__/Engine.test.ts`

**Step 1: Write test**

```typescript
it('consumes weapon use even on miss (weapon was still swung)', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, TerrainType.PLAINS);
  grid.setTerrain(4, 3, TerrainType.PLAINS);

  const att = new Unit('a1', 'Mercenary', Faction.PLAYER, UnitClass.MERCENARY,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 0, spd: 8, luk: 0, def: 5, res: 2 }), // 0 hit
    3, 3);
  grid.placeUnit(att, 3, 3);

  const def = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
    createStats({ hp: 20, maxHp: 20, str: 8, skl: 6, spd: 20, luk: 20, def: 5, res: 2 }), // massive avoid
    4, 3);
  grid.placeUnit(def, 4, 3);

  const engine = new CombatEngine(grid);
  const rng = makeRng([0.99, 0.99]); // always miss
  const attTracker = createDurabilityTracker(45);

  const result = engine.resolveCombat(
    att, def, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Lance'],
    rng, attTracker,
  );

  expect(attTracker.uses).toBe(44); // consumed even on miss
  expect(result.log[0].hit).toBe(false);
});
```

**Step 2:** Run — expected PASS (current implementation consumes on every `performAttack` call regardless of hit/miss).

**Step 3:** Commit.

---

### Task 8: Run full test suite and lint

```bash
npx vitest run
npm run lint
```

All green. Done.

---

## Verification Checklist

- [ ] Weapon uses decrement per attack round (not per swing)
- [ ] Follow-up attacks each consume 1 use (if weapon survives)
- [ ] Counterattacks consume uses from defender's weapon
- [ ] Weapon breaking (uses→0) stops further attacks that round
- [ ] Broken weapon removed from inventory after combat
- [ ] Misses still consume uses (weapon was swung)
- [ ] No durability consumed when no tracker provided (backward compat)
- [ ] Player attacks and enemy AI attacks both consume durability
- [ ] Staves already correctly consume uses (no regression)
- [ ] All existing tests pass
