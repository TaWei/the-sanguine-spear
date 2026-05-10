# Plan 16: Steal + Doors & Chests

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add Thief class, Steal command (steal items from enemies with lower Spd), and door/chest opening via keys or Thief's Lockpick ability.

**Architecture:** `ThiefActions` static class for steal eligibility and execution. `DoorChestEngine` for door/chest state on the grid. Keys consumed on use. Thieves can open doors/chests without keys (Lockpick skill). Door/Chest terrain types added to the map system.

**Tech Stack:** TypeScript, Vitest.

**Fire Emblem GBA reference:**
- **Steal:** Thief/Rogue can steal an item if: (1) thief Spd > target Spd, (2) target has an item in any inventory slot, (3) thief has an empty inventory slot. Stealing a weapon only possible if the weapon is NOT equipped (FE7) or always (FE8). We'll use the simpler FE8 rule: can steal any item from inventory.
- **Steal does not consume thief's action** (can act after stealing in the same turn).
- **Doors/Chests:** Opened via Door Key, Chest Key, Lockpick (thief only), or Unlock staff (future Plan 17).
- Door/Chest terrain blocks movement until opened.

---

## Design Decisions

1. **Steal only from enemies** in adjacent tiles. Thief must have Spd > target Spd. Target must have at least one stealable item. Thief must have an empty inventory slot.
2. **Steal consumes the thief's action** (sets state to EXHAUSTED) to keep it from being free. (Note: GBA FE allows acting after steal, but for our game balance we consume action.)
3. **Door and Chest as TerrainType** — new types `'door'` and `'chest'` in the terrain system. Doors block movement (moveCost: 99). Chests are passable. Both have an `isOpen` state.
4. **TerrainData** extended with `isDoor`/`isChest` flags and an `open()` method.
5. **Keys in inventory** — `Door Key` and `Chest Key` already defined in `ItemTypes` as `KeyItem`. Thieves have implicit keys.
6. **Thief class added** with class Con 6, primary weapon Sword.

---

### Task 1: Add Thief to UnitClass and class CON

**Objective:** Register the Thief class with proper CON.

**Files:**
- Modify: `src/game/units/Unit.ts` — add `THIEF: 'thief'` to `UnitClass`
- Modify: `src/game/units/Constitution.ts` — add Thief Con (6)
- Modify: `src/game/combat/Effectiveness.ts` — no special tags needed
- Test: `src/game/units/__tests__/Constitution.test.ts`

**Step 1: Add to UnitClass**

```typescript
export const UnitClass = {
  // ... existing ...
  THIEF: 'thief',
} as const;
```

**Step 2: Add CON**

```typescript
[UnitClass.THIEF]: 6,
```

**Step 3: Add Thief to fallback weapons** in `GameEngine.getWeaponForUnit`:

```typescript
if (unit.unitClass === 'thief') {
  return WEAPON_DB['Iron Sword'];
}
```

**Step 4: Test** — verify `getBaseCon(UnitClass.THIEF)` returns 6.

---

### Task 2: Add Door and Chest terrain types

**Objective:** Extend the terrain system with door/chest types.

**Files:**
- Modify: `src/game/map/Terrain.ts` — add `'door'` and `'chest'` to `TerrainType`, define their data
- Test: `src/game/map/__tests__/Terrain.test.ts`

**TerrainData:**

```typescript
door: {
  moveCost: 99,  // impassable until opened
  defenseBonus: 0,
  avoidBonus: 0,
  isDoor: true,
  isChest: false,
  isOpen: false,
},
chest: {
  moveCost: 1,   // passable (unit can stand on chest tile)
  defenseBonus: 0,
  avoidBonus: 0,
  isDoor: false,
  isChest: true,
  isOpen: false,
},
```

Extend `TerrainData` interface:

```typescript
export interface TerrainData {
  moveCost: number;
  defenseBonus: number;
  avoidBonus: number;
  isDoor?: boolean;
  isChest?: boolean;
  isOpen?: boolean;
}
```

**Test:** `TERRAIN_DEFS.door.moveCost` is 99, `isDoor` is true.

---

### Task 3: Build Door/Chest opening engine

**Objective:** Create `DoorChestEngine` to handle opening logic.

**Files:**
- Create: `src/game/map/DoorChestEngine.ts`
- Test: `src/game/map/__tests__/DoorChestEngine.test.ts`

**Interface:**

```typescript
export class DoorChestEngine {
  canOpenDoor(unit: Unit, grid: Grid, x: number, y: number): boolean {
    // Check: tile is a door, door is closed, unit adjacent
    // Check: unit has Door Key OR unit is Thief (Lockpick)
  }

  openDoor(grid: Grid, unit: Unit, x: number, y: number): void {
    // Consume key if not thief
    // Set terrain to 'plains' (or 'open door')
    // Remove key from inventory
  }

  canOpenChest(unit: Unit, grid: Grid, x: number, y: number): boolean {
    // Check: tile is a chest, chest not opened, unit on tile
    // Check: unit has Chest Key OR unit is Thief
  }

  openChest(grid: Grid, unit: Unit, x: number, y: number): Item | null {
    // Consume key if not thief
    // Return the chest's item
    // Mark chest as open (change terrain to plains)
  }
}
```

**Logic:**
- If unit is Thief (`unit.unitClass === UnitClass.THIEF`), no key consumed (Lockpick).
- Otherwise, find and consume a matching key from inventory.
- Door: change terrain to `'plains'` (makes tile passable).
- Chest: change terrain to `'plains'`, return pre-defined item (for now, return null — chest contents defined per-level later).

**Test:**
```typescript
it('thief opens door without key', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, 'door');
  const thief = new Unit('t1', 'Thief', Faction.PLAYER, UnitClass.THIEF, stats, 3, 2);
  const engine = new DoorChestEngine();
  expect(engine.canOpenDoor(thief, grid, 3, 3)).toBe(true);
  engine.openDoor(grid, thief, 3, 3);
  expect(grid.getTerrain(3, 3)).toBe('plains');
});

it('non-thief consumes Door Key to open', () => {
  const grid = new Grid(8, 8);
  grid.setTerrain(3, 3, 'door');
  const unit = new Unit('u1', 'Unit', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
  unit.inventory.add(createKeyItem('Door Key'));
  const engine = new DoorChestEngine();
  engine.openDoor(grid, unit, 3, 3);
  // Key consumed
  expect(unit.inventory.items.some(i => i.name === 'Door Key')).toBe(false);
});
```

---

### Task 4: Build Steal engine (StealRules)

**Objective:** Static methods to check steal eligibility and execute steal.

**Files:**
- Create: `src/game/units/StealRules.ts`
- Test: `src/game/units/__tests__/StealRules.test.ts`

**Interface:**

```typescript
export class StealRules {
  /** Check if thief can steal from target */
  static canSteal(thief: Unit, target: Unit): boolean {
    if (!thief.isAlive || !target.isAlive) return false;
    if (thief.unitClass !== UnitClass.THIEF) return false;
    if (target.faction === Faction.PLAYER) return false; // can't steal from allies
    if (thief.stats.spd <= target.stats.spd) return false; // must be faster
    if (target.inventory.items.length === 0) return false; // nothing to steal
    if (thief.inventory.items.length >= 5) return false; // no room
    return true;
  }

  /** Execute steal: move an item from target to thief */
  static steal(thief: Unit, target: Unit, itemIndex: number): void {
    if (!this.canSteal(thief, target)) throw new Error('Cannot steal');
    if (itemIndex < 0 || itemIndex >= target.inventory.items.length) throw new Error('Invalid item index');
    // Remove from target, add to thief
    // (Need mutable inventory access — may need to add removeAt/stealItem methods to Inventory)
  }
}
```

**Test:**
```typescript
it('thief can steal when faster', () => {
  const thief = new Unit('t1', 'Thief', Faction.PLAYER, UnitClass.THIEF,
    createStats({ hp: 20, str: 5, mag: 0, skl: 8, spd: 12, luk: 3, def: 3, res: 2, mov: 6 }),
    3, 3);
  const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND,
    createStats({ hp: 25, str: 10, mag: 0, skl: 5, spd: 8, luk: 0, def: 8, res: 2, mov: 5 }),
    4, 3);
  enemy.inventory.add(createRecoveryItem('Vulnerary', 10));
  expect(StealRules.canSteal(thief, enemy)).toBe(true);
});

it('thief cannot steal when slower', () => {
  const thief = new Unit('t1', 'Thief', Faction.PLAYER, UnitClass.THIEF,
    createStats({ hp: 20, str: 5, mag: 0, skl: 8, spd: 8, luk: 3, def: 3, res: 2, mov: 6 }),
    3, 3);
  const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND,
    createStats({ hp: 25, str: 10, mag: 0, skl: 5, spd: 10, luk: 0, def: 8, res: 2, mov: 5 }),
    4, 3);
  expect(StealRules.canSteal(thief, enemy)).toBe(false);
});

it('thief cannot steal with full inventory', () => {
  // Fill thief's inventory (5 items)
  // ...verify canSteal returns false
});
```

---

### Task 5: Add Inventory steal support

**Objective:** Add `removeAt(index)` method to Inventory for steal.

**Files:**
- Modify: `src/game/items/Inventory.ts` — add `removeAt(index: number): Item | null`
- Test: `src/game/items/__tests__/Inventory.test.ts`

```typescript
// In Inventory class:
removeAt(index: number): Item | null {
  if (index < 0 || index >= this._items.length) return null;
  const [item] = this._items.splice(index, 1);
  return item;
}
```

---

### Task 6: Wire Steal + Door/Chest into GameEngine

**Objective:** Expose steal, open door, and open chest as GameEngine methods.

**Files:**
- Modify: `src/game/GameEngine.ts` — add `canSteal`, `steal`, `canOpenDoor`, `openDoor`, `canOpenChest`, `openChest`
- Test: `src/game/__tests__/GameEngine.test.ts`

**Add to GameEngine:**

```typescript
import { StealRules } from './units/StealRules';
import { DoorChestEngine } from './map/DoorChestEngine';

private doorChestEngine = new DoorChestEngine();

canSteal(thief: Unit, target: Unit): boolean {
  if (!this.areAdjacent(thief, target)) return false;
  return StealRules.canSteal(thief, target);
}

steal(thief: Unit, target: Unit, itemIndex: number): void {
  if (!this.canSteal(thief, target)) throw new Error('Cannot steal');
  StealRules.steal(thief, target, itemIndex);
  thief.state.transition('MENU'); // consume action
}

canOpenDoor(unit: Unit, x: number, y: number): boolean {
  return this.doorChestEngine.canOpenDoor(unit, this.grid, x, y);
}

openDoor(unit: Unit, x: number, y: number): void {
  this.doorChestEngine.openDoor(this.grid, unit, x, y);
}

canOpenChest(unit: Unit, x: number, y: number): boolean {
  return this.doorChestEngine.canOpenChest(unit, this.grid, x, y);
}

openChest(unit: Unit, x: number, y: number): Item | null {
  return this.doorChestEngine.openChest(this.grid, unit, x, y);
}
```

**Integration tests:**
- Thief adjacent to enemy with item → can steal
- Thief steals → item moves inventories
- Merc with Door Key opens door → key consumed, terrain becomes plains
- Thief opens door without key
- Thief opens chest without key

---

### Task 7: Update save/load for door/chest state

**Objective:** Door/chest open state must persist across save/load.

**Files:**
- Modify: `src/game/save/SaveData.ts` — terrain snapshot already captures terrain type. When door/chest is opened, terrain changes to `'plains'`, so the open state is implicitly saved. No changes needed.
- Verify: `src/game/save/__tests__/integration.test.ts`

---

### Task 8: Run full suite

Run: `npx vitest run`

Fix regressions, particularly around new TerrainType values and UnitClass additions.

---

## Verification Checklist

- [ ] Thief class added with CON 6, primary weapon Sword
- [ ] `Door` terrain blocks movement (moveCost 99)
- [ ] `Chest` terrain is passable
- [ ] Thief can open doors without key
- [ ] Non-thief needs Door Key to open door
- [ ] Thief can open chests without key
- [ ] Non-thief needs Chest Key to open chest
- [ ] Key consumed on use (for non-thieves)
- [ ] Steal: thief Spd > target Spd required
- [ ] Steal: requires empty inventory slot
- [ ] Steal: cannot steal from allies
- [ ] Steal: item moves from target to thief
- [ ] Opened doors/chests save/load correctly (terrain becomes plains)
- [ ] Full test suite passes
