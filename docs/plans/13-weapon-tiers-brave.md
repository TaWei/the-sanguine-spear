# Plan 13: Steel, Silver, Brave Weapon Tiers

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add Steel, Silver, and Brave weapon tiers to the WEAPON_DB with GBA-accurate stats. Brave weapons require a minor CombatEngine extension to enable 2 hits on initiation.

**Architecture:** Pure data additions to `WEAPON_DB` + `ItemFactory`. Brave weapons need a `consecutiveAttacks: 2` field on `WeaponData`, and `resolveCombat` fires a second attack immediately after the first (before counter).

**Tech Stack:** TypeScript, Vitest.

**Fire Emblem GBA reference:**
- **Steel:** Higher mt, lower hit, heavier (wt deferred to Plan 14)
- **Silver:** Highest mt, good hit, rare, expensive
- **Brave:** Medium mt, attacks twice on initiation (GBA: 4× total with double)

---

## Design Decisions

1. **Brave mechanics:** `consecutiveAttacks` field (optional, defaults to 1). In `performAttack` (the inner helper in `resolveCombat`), loop `consecutiveAttacks` times. Both hits each roll hit/crit independently and consume 1 durability each.
2. **Steel/Silver are data-only** — no engine changes beyond the DB entries.
3. **Weapon stats (GBA FE7 values):**

| Weapon | Mt | Hit | Crit | Wt | Uses |
|--------|-----|-----|------|-----|------|
| Steel Sword | 8 | 75 | 0 | 10 | 30 |
| Steel Axe | 11 | 65 | 0 | 15 | 30 |
| Steel Lance | 10 | 70 | 0 | 13 | 30 |
| Steel Bow | 9 | 70 | 0 | 9 | 30 |
| Silver Sword | 13 | 80 | 0 | 8 | 20 |
| Silver Axe | 15 | 70 | 0 | 12 | 20 |
| Silver Lance | 14 | 75 | 0 | 10 | 20 |
| Silver Bow | 13 | 75 | 0 | 6 | 20 |
| Brave Sword | 9 | 80 | 0 | 12 | 30 |
| Brave Axe | 10 | 65 | 0 | 16 | 30 |
| Brave Lance | 10 | 70 | 0 | 14 | 30 |
| Brave Bow | 10 | 75 | 0 | 10 | 30 |

*(Weight column saved for Plan 14; include in WeaponData interface now but leave unused.)*

---

### Task 1: Add `consecutiveAttacks` and `weight` to WeaponData

**Objective:** Extend the weapon interface for future fields without breaking existing code.

**Files:**
- Modify: `src/game/combat/Weapons.ts` — `WeaponData` interface + `ItemTypes.ts` `WeaponItem`
- Test: Existing tests should still pass

**Step 1: Extend WeaponData**

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
  effectiveAgainst?: UnitClassTag[];
  consecutiveAttacks?: number;  // NEW: defaults to 1
  weight?: number;              // NEW: for Plan 14
}
```

Also add to `WeaponItem` in `ItemTypes.ts`:

```typescript
export interface WeaponItem {
  kind: 'weapon';
  name: string;
  weaponType: WeaponType;
  mt: number;
  hit: number;
  crit: number;
  minRange: number;
  maxRange: number;
  usesMagic: boolean;
  uses: number;
  consecutiveAttacks?: number;  // NEW
  weight?: number;              // NEW
}
```

**Step 2: Update `createWeaponItem`**

Add optional parameters:
```typescript
export function createWeaponItem(
  name: string, weaponType: WeaponType,
  mt: number, hit: number, crit: number,
  minRange: number, maxRange: number,
  usesMagic: boolean, uses = 40,
  consecutiveAttacks?: number,  // NEW
  weight?: number,              // NEW
): WeaponItem {
  return {
    kind: 'weapon', name, weaponType, mt, hit, crit,
    minRange, maxRange, usesMagic, uses,
    ...(consecutiveAttacks !== undefined && { consecutiveAttacks }),
    ...(weight !== undefined && { weight }),
  };
}
```

**Step 3: Run existing tests** — `npx vitest run src/game/items/__tests__/ItemTypes.test.ts src/game/combat/__tests__/Weapons.test.ts`

---

### Task 2: Add Steel weapons to WEAPON_DB

**Objective:** Add 4 Steel weapons with GBA-accurate stats.

**Files:**
- Modify: `src/game/combat/Weapons.ts` — `WEAPON_DB`
- Test: `src/game/combat/__tests__/Weapons.test.ts`

**Step 1: Write failing test**

```typescript
describe('Steel weapons', () => {
  it.each([
    ['Steel Sword', 'sword', 8, 75, 30],
    ['Steel Axe', 'axe', 11, 65, 30],
    ['Steel Lance', 'lance', 10, 70, 30],
    ['Steel Bow', 'bow', 9, 70, 30],
  ])('%s has mt=%i hit=%i', (name, _type, mt, hit, _uses) => {
    const w = WEAPON_DB[name];
    expect(w).toBeDefined();
    expect(w.mt).toBe(mt);
    expect(w.hit).toBe(hit);
  });
});
```

Run: `npx vitest run src/game/combat/__tests__/Weapons.test.ts` — expect 4 failures

**Step 2: Add to WEAPON_DB**

```typescript
'Steel Sword': {
  name: 'Steel Sword', type: WeaponType.SWORD, mt: 8, hit: 75, crit: 0,
  minRange: 1, maxRange: 1, usesMagic: false, weight: 10,
},
'Steel Axe': {
  name: 'Steel Axe', type: WeaponType.AXE, mt: 11, hit: 65, crit: 0,
  minRange: 1, maxRange: 1, usesMagic: false, weight: 15,
},
'Steel Lance': {
  name: 'Steel Lance', type: WeaponType.LANCE, mt: 10, hit: 70, crit: 0,
  minRange: 1, maxRange: 1, usesMagic: false, weight: 13,
},
'Steel Bow': {
  name: 'Steel Bow', type: WeaponType.BOW, mt: 9, hit: 70, crit: 0,
  minRange: 2, maxRange: 2, usesMagic: false, weight: 9,
},
```

**Step 4: Run test to verify pass**

---

### Task 3: Add Silver weapons to WEAPON_DB

**Objective:** Add 4 Silver weapons.

**Files:**
- Modify: `src/game/combat/Weapons.ts` — `WEAPON_DB`
- Test: `src/game/combat/__tests__/Weapons.test.ts`

Same pattern as Task 2. GBA-accurate stats:

```typescript
'Silver Sword': { name: 'Silver Sword', type: WeaponType.SWORD, mt: 13, hit: 80, crit: 0, minRange: 1, maxRange: 1, usesMagic: false, weight: 8 },
'Silver Axe':   { name: 'Silver Axe', type: WeaponType.AXE, mt: 15, hit: 70, crit: 0, minRange: 1, maxRange: 1, usesMagic: false, weight: 12 },
'Silver Lance': { name: 'Silver Lance', type: WeaponType.LANCE, mt: 14, hit: 75, crit: 0, minRange: 1, maxRange: 1, usesMagic: false, weight: 10 },
'Silver Bow':   { name: 'Silver Bow', type: WeaponType.BOW, mt: 13, hit: 75, crit: 0, minRange: 2, maxRange: 2, usesMagic: false, weight: 6 },
```

**Step 4: Run test to verify pass**

---

### Task 4: Add Brave weapons to WEAPON_DB

**Objective:** Add 4 Brave weapons with `consecutiveAttacks: 2`.

**Files:**
- Modify: `src/game/combat/Weapons.ts` — `WEAPON_DB`
- Test: `src/game/combat/__tests__/Weapons.test.ts`

```typescript
'Brave Sword': { name: 'Brave Sword', type: WeaponType.SWORD, mt: 9, hit: 80, crit: 0, minRange: 1, maxRange: 1, usesMagic: false, consecutiveAttacks: 2, weight: 12 },
'Brave Axe':   { name: 'Brave Axe', type: WeaponType.AXE, mt: 10, hit: 65, crit: 0, minRange: 1, maxRange: 1, usesMagic: false, consecutiveAttacks: 2, weight: 16 },
'Brave Lance': { name: 'Brave Lance', type: WeaponType.LANCE, mt: 10, hit: 70, crit: 0, minRange: 1, maxRange: 1, usesMagic: false, consecutiveAttacks: 2, weight: 14 },
'Brave Bow':   { name: 'Brave Bow', type: WeaponType.BOW, mt: 10, hit: 75, crit: 0, minRange: 2, maxRange: 2, usesMagic: false, consecutiveAttacks: 2, weight: 10 },
```

---

### Task 5: Implement Brave weapon double-hit in CombatEngine

**Objective:** Modify `resolveCombat`'s inner `performAttack` to loop `consecutiveAttacks` times. Both hits in the brave pair happen before the defender's counter.

**Files:**
- Modify: `src/game/combat/Engine.ts` — `performAttack` closure
- Test: `src/game/combat/__tests__/Engine.test.ts`

**Step 1: Write failing test**

```typescript
describe('Brave weapons', () => {
  it('Brave Sword attacks twice before counter', () => {
    const grid = new Grid(8, 8);
    grid.setTerrain(3, 3, 'plains');
    grid.setTerrain(4, 3, 'plains');
    const engine = new CombatEngine(grid);
    const attacker = new Unit('a1', 'Hero', Faction.PLAYER, UnitClass.MERCENARY,
      createStats({ hp: 40, maxHp: 40, str: 12, mag: 0, skl: 15, spd: 15, luk: 5, def: 10, res: 5, mov: 6 }),
      3, 3);
    const defender = new Unit('d1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND,
      createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 5, spd: 5, luk: 0, def: 5, res: 2, mov: 5 }),
      4, 3);
    const weapon = WEAPON_DB['Brave Sword'];
    const defWeapon = WEAPON_DB['Iron Axe'];
    
    // Prevent doubles by equalizing speed
    const result = engine.resolveCombat(attacker, defender, weapon, defWeapon);
    // Should have 2 attacker attacks before any defender attack
    const attackerEntries = result.log.filter(e => e.attacker === attacker);
    expect(attackerEntries.length).toBe(2);
  });

  it('Brave Bow lands two separate hit rolls', () => {
    // Use deterministic RNG: first two hit, third misses
    // Should show 2 hits from the Brave pair
    // ...test with controlled RNG
  });
});
```

**Step 2: Modify `performAttack` in resolveCombat**

Change from single call to loop:

```typescript
const performAttack = (
  att: Unit, def: Unit, wpn: WeaponData, defWpn: WeaponData,
  tracker?: DurabilityTracker,
): CombatLogEntry[] => {
  const entries: CombatLogEntry[] = [];
  const count = wpn.consecutiveAttacks ?? 1;
  
  for (let i = 0; i < count; i++) {
    if (!att.isAlive || !def.isAlive) break;
    if (tracker && tracker.isBroken) break;
    
    const entry = this.resolveHit(att, def, wpn, defWpn, rng);
    if (entry.hit) {
      def.takeDamage(entry.damage);
    }
    if (tracker) {
      tracker.consume();
    }
    entries.push(entry);
  }
  return entries;
};
```

Update the callers to handle `CombatLogEntry[]` instead of single entry.

**Step 4: Run tests** — `npx vitest run src/game/combat/__tests__/Engine.test.ts`

---

### Task 6: Add Steel/Silver/Brave to ItemFactory and createItemByName

**Objective:** Ensure all new weapons are creatable via the factory.

**Files:**
- Modify: `src/game/items/ItemFactory.ts` — add use-count mapping
- Test: `src/game/items/__tests__/ItemFactory.test.ts`

**Logic:** `createItemByName` already reads from `WEAPON_DB`. Need to set appropriate uses:
- Steel: 30 uses
- Silver: 20 uses
- Brave: 30 uses

Add to `createItemByName`:
```typescript
const shortUseWeapons = new Set(['Javelin', 'Hand Axe', 'Silver Sword', 'Silver Axe', 'Silver Lance', 'Silver Bow']);
const uses = shortUseWeapons.has(name) ? 20 : 
  (name.startsWith('Steel') || name.startsWith('Brave')) ? 30 : 40;
```

Test: verify `createItemByName('Steel Sword')` returns weapon with uses=30, Silver with uses=20, Brave with uses=30.

---

### Task 7: Run full suite

Run: `npx vitest run`

---

## Verification Checklist

- [ ] All 12 new weapons in WEAPON_DB with correct stats
- [ ] Steel weapons higher mt, lower hit than Iron
- [ ] Silver weapons highest mt, good hit
- [ ] Brave weapons have `consecutiveAttacks: 2`
- [ ] Brave weapon resolves 2 attacker hits before counter
- [ ] Brave weapon consumes 2 durability per round (one per hit)
- [ ] Standard weapons still resolve 1 hit (consecutiveAttacks defaults to 1)
- [ ] ItemFactory creates all new weapons with correct uses
- [ ] Full test suite passes
