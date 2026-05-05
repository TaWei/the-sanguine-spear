# Save and Resume System — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Implement a Fire Emblem–style save and resume system. Players can save the game from the tactical map (BattleScene), view a list of save files from the main menu, and resume from any save. Saves capture full deterministic game state.

**Architecture:**
- `src/game/save/` — pure logic for serializing/deserializing game state. Zero Phaser imports. 100% unit-testable.
- `SaveData` — flat JSON-serializable snapshot of everything needed to reconstruct a `GameEngine`.
- `SaveManager` — pure class for CRUD operations on `localStorage`. No Phaser.
- Scene glue — `BattleScene` adds a "Save" menu option; `MainMenuScene` adds a "Load Game" button that lists saves.

**Tech Stack:** TypeScript, Vitest, `localStorage` API, Phaser 3 (scenes only).

---

## Design Decisions

1. **Storage backend:** `localStorage` (key prefix `tss_save_`). Max ~5 MB is plenty for this game's save size.
2. **Save slots:** Up to 5 slots plus 1 auto/quicksave slot (`slot_auto`). Fire Emblem GBA style.
3. **Save from:** BattleScene only, during Player phase, when no modal is open (no battle overlay, no menu, no cutscene). This mirrors Fire Emblem's map-save (not mid-battle).
4. **Resume:** From MainMenuScene — list all saves with level name, turn number, phase, date, and play time.
5. **Snapshot vs. delta:** Full snapshot every time. Simple, robust, no migration complexity.
6. **What gets saved:** Level ID, grid terrain, all units (stats, position, state, inventory, level, exp, tier, growths, AI config), turn manager (phase, turn number), trigger engine (consumed triggers, firstCombat flag).
7. **What does NOT get saved:** Scene UI state (menus, graphics, selected unit, animations), action queue (must be empty to save), enemy preview state. These are rebuilt on resume.
8. **Validation:** A save file has a `version` field. If version mismatch on load, reject with clear error.

---

## Task List

---

### Task 1: Define SaveData types

**Objective:** Create the flat data types that represent a complete game snapshot.

**Files:**
- Create: `src/game/save/SaveData.ts`
- Test: `src/game/save/__tests__/SaveData.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { SaveData, SAVE_VERSION } from '../SaveData';

describe('SaveData', () => {
  it('has a current version constant', () => {
    expect(SAVE_VERSION).toBe(1);
  });

  it('can construct a minimal valid SaveData object', () => {
    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      levelId: 'level-1',
      turnNumber: 1,
      currentPhase: 'player',
      gridCols: 16,
      gridRows: 12,
      terrain: [{ x: 0, y: 0, type: 'plains' }],
      units: [],
      consumedTriggers: [],
      firstCombatOccurred: false,
    };
    expect(data.version).toBe(1);
    expect(data.levelId).toBe('level-1');
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/save/__tests__/SaveData.test.ts
```
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/game/save/SaveData.ts
import { TerrainType } from '../map/Terrain';
import { Faction, UnitClass, UnitTier } from '../units/Unit';
import { UnitStats } from '../units/Stats';
import { Item } from '../items/ItemTypes';
import { GamePhase } from '../state/TurnManager';
import { UnitStateType } from '../state/UnitState';
import { GrowthRates } from '../progression/GrowthRates';
import type { AiBehavior } from '../ai/Behavior';
import type { AiPersonality } from '../ai/Personality';

export const SAVE_VERSION = 1;

export interface TerrainSnapshot {
  x: number;
  y: number;
  type: TerrainType;
}

export interface UnitSnapshot {
  id: string;
  name: string;
  faction: Faction;
  unitClass: UnitClass;
  stats: UnitStats;
  gridX: number;
  gridY: number;
  state: UnitStateType;
  level: number;
  exp: number;
  growthRates: GrowthRates;
  tier: UnitTier;
  inventory: Item[];
  aiBehavior?: AiBehavior;
  aiPersonality?: AiPersonality;
}

export interface SaveData {
  version: number;
  timestamp: number;
  playTimeMs?: number;
  levelId: string;
  turnNumber: number;
  currentPhase: GamePhase;
  gridCols: number;
  gridRows: number;
  terrain: TerrainSnapshot[];
  units: UnitSnapshot[];
  consumedTriggers: string[];
  firstCombatOccurred: boolean;
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/save/__tests__/SaveData.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/save/SaveData.ts src/game/save/__tests__/SaveData.test.ts
git commit -m "feat(save): define SaveData types and version"
```

---

### Task 2: Unit serializer

**Objective:** Extract a `UnitSnapshot` from a `Unit` instance, and reconstruct a `Unit` from a `UnitSnapshot`.

**Files:**
- Create: `src/game/save/UnitSerializer.ts`
- Test: `src/game/save/__tests__/UnitSerializer.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { serializeUnit, deserializeUnit } from '../UnitSerializer';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createWeaponItem } from '../../items/ItemTypes';

describe('UnitSerializer', () => {
  it('round-trips a basic unit', () => {
    const unit = new Unit('u1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    const snap = serializeUnit(unit);
    expect(snap.id).toBe('u1');
    expect(snap.name).toBe('Rowan');
    expect(snap.faction).toBe('player');
    expect(snap.gridX).toBe(2);
    expect(snap.gridY).toBe(5);
    expect(snap.state).toBe('idle');

    const restored = deserializeUnit(snap);
    expect(restored.id).toBe('u1');
    expect(restored.name).toBe('Rowan');
    expect(restored.gridX).toBe(2);
    expect(restored.gridY).toBe(5);
    expect(restored.state.current).toBe('idle');
    expect(restored.stats.hp).toBe(22);
  });

  it('round-trips inventory items', () => {
    const unit = new Unit('u2', 'Elara', Faction.PLAYER, UnitClass.MAGE, createStats({
      hp: 16, maxHp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5,
    }), 3, 6);
    unit.inventory.add(createWeaponItem('Fire', 'magic', 5, 90, 0, 1, 2, true));
    const snap = serializeUnit(unit);
    expect(snap.inventory).toHaveLength(1);
    expect(snap.inventory[0].name).toBe('Fire');

    const restored = deserializeUnit(snap);
    expect(restored.inventory.items).toHaveLength(1);
    expect(restored.inventory.items[0].name).toBe('Fire');
  });

  it('round-trips exhausted state', () => {
    const unit = new Unit('u3', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, createStats({
      hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
    }), 12, 4);
    unit.hasActed = true;
    const snap = serializeUnit(unit);
    expect(snap.state).toBe('exhausted');

    const restored = deserializeUnit(snap);
    expect(restored.state.isExhausted()).toBe(true);
  });

  it('round-trips AI config', () => {
    const unit = new Unit('u4', 'Archer', Faction.ENEMY, UnitClass.ARCHER, createStats({
      hp: 20, maxHp: 20, str: 7, mag: 0, skl: 8, spd: 7, luk: 4, def: 4, res: 2, mov: 5,
    }), 14, 5, { aiBehavior: 'attack_in_range', aiPersonality: 'aggressive' });
    const snap = serializeUnit(unit);
    expect(snap.aiBehavior).toBe('attack_in_range');
    expect(snap.aiPersonality).toBe('aggressive');

    const restored = deserializeUnit(snap);
    expect(restored.aiBehavior).toBe('attack_in_range');
    expect(restored.aiPersonality).toBe('aggressive');
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/save/__tests__/UnitSerializer.test.ts
```
Expected: FAIL — functions not found

**Step 3: Write minimal implementation**

```typescript
// src/game/save/UnitSerializer.ts
import { Unit, UnitOptions, Faction, UnitClass, UnitTier } from '../units/Unit';
import { createStats } from '../units/Stats';
import { UnitSnapshot } from './SaveData';
import { UNIT_STATE, UnitStateType } from '../state/UnitState';

export function serializeUnit(unit: Unit): UnitSnapshot {
  return {
    id: unit.id,
    name: unit.name,
    faction: unit.faction,
    unitClass: unit.unitClass,
    stats: { ...unit.stats },
    gridX: unit.gridX,
    gridY: unit.gridY,
    state: unit.state.current,
    level: unit.level,
    exp: unit.exp,
    growthRates: { ...unit.growthRates },
    tier: unit.tier,
    inventory: Array.from(unit.inventory.items),
    aiBehavior: unit.aiBehavior,
    aiPersonality: unit.aiPersonality,
  };
}

export function deserializeUnit(snap: UnitSnapshot): Unit {
  const options: UnitOptions = {
    level: snap.level,
    exp: snap.exp,
    growthRates: snap.growthRates,
    aiBehavior: snap.aiBehavior,
    aiPersonality: snap.aiPersonality,
  };
  const unit = new Unit(
    snap.id,
    snap.name,
    snap.faction,
    snap.unitClass,
    createStats(snap.stats),
    snap.gridX,
    snap.gridY,
    options,
  );
  // Restore stats exactly (createStats clamps hp, but the snapshot already has correct values)
  if (snap.stats.hp !== unit.stats.hp) {
    const diff = unit.stats.hp - snap.stats.hp;
    if (diff > 0) {
      unit.takeDamage(diff);
    }
  }
  // Restore state
  switch (snap.state) {
    case UNIT_STATE.IDLE:
      break; // already idle
    case UNIT_STATE.MOVING:
      unit.state.transition(UNIT_STATE.MOVING);
      break;
    case UNIT_STATE.MENU:
      unit.state.transition(UNIT_STATE.MOVING);
      unit.state.transition(UNIT_STATE.MENU);
      break;
    case UNIT_STATE.EXHAUSTED:
      unit.hasActed = true;
      break;
  }
  // Restore inventory
  for (const item of snap.inventory) {
    unit.inventory.add(item);
  }
  // Restore tier if promoted
  if (snap.tier === 'promoted' && unit.tier !== 'promoted') {
    // tier is set by applyPromotion; we can't directly set it.
    // The promotion engine will have updated class and stats.
    // For snapshot restore, we accept that promoted units will be reconstructed
    // with their post-promotion class/stats already in the snapshot.
    // No extra action needed here.
  }
  return unit;
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/save/__tests__/UnitSerializer.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/save/UnitSerializer.ts src/game/save/__tests__/UnitSerializer.test.ts
git commit -m "feat(save): add Unit serializer with round-trip tests"
```

---

### Task 3: GameEngine snapshot and restore

**Objective:** Add `snapshot()` and `restore()` methods to `GameEngine` that use the serializer.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Test: `src/game/__tests__/GameEngine.save.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { SAVE_VERSION } from '../save/SaveData';

describe('GameEngine save/restore', () => {
  it('snapshot returns valid SaveData', () => {
    const engine = new GameEngine(16, 12);
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    const snap = engine.snapshot('level-1');
    expect(snap.version).toBe(SAVE_VERSION);
    expect(snap.levelId).toBe('level-1');
    expect(snap.units).toHaveLength(1);
    expect(snap.turnNumber).toBe(1);
    expect(snap.currentPhase).toBe('player');
  });

  it('restore rebuilds engine from snapshot', () => {
    const engine = new GameEngine(16, 12);
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, createStats({
      hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
    }), 12, 4);
    const snap = engine.snapshot('level-1');

    const restored = new GameEngine(1, 1);
    restored.restore(snap);

    expect(restored.grid.cols).toBe(16);
    expect(restored.grid.rows).toBe(12);
    expect(restored.getAllUnits()).toHaveLength(2);
    const rowan = restored.getUnit(2, 5);
    expect(rowan?.name).toBe('Rowan');
    expect(rowan?.faction).toBe('player');
    const bandit = restored.getUnit(12, 4);
    expect(bandit?.name).toBe('Bandit');
    expect(bandit?.faction).toBe('enemy');
    expect(restored.turnManager.turnNumber).toBe(1);
    expect(restored.turnManager.currentPhase).toBe('player');
  });

  it('restore preserves turn number and phase', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, createStats({
      hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
    }), 5, 5);

    // Advance to enemy turn 3
    engine.endTurn(); // player -> enemy
    engine.endTurn(); // enemy -> ally
    engine.endTurn(); // ally -> player (turn 2)
    engine.endTurn(); // player -> enemy
    engine.endTurn(); // enemy -> ally
    engine.endTurn(); // ally -> player (turn 3)
    engine.endTurn(); // player -> enemy (turn 3)

    const snap = engine.snapshot('level-1');
    expect(snap.turnNumber).toBe(3);
    expect(snap.currentPhase).toBe('enemy');

    const restored = new GameEngine(1, 1);
    restored.restore(snap);
    expect(restored.turnManager.turnNumber).toBe(3);
    expect(restored.turnManager.currentPhase).toBe('enemy');
  });

  it('restore preserves unit state and stats', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    const rowan = engine.getUnit(2, 5)!;
    rowan.takeDamage(5);
    rowan.hasActed = true;

    const snap = engine.snapshot('level-1');
    const restored = new GameEngine(1, 1);
    restored.restore(snap);

    const restoredRowan = restored.getUnit(2, 5)!;
    expect(restoredRowan.stats.hp).toBe(17);
    expect(restoredRowan.state.isExhausted()).toBe(true);
  });

  it('restore preserves trigger engine state', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    engine.loadLevel({
      id: 'level-1', name: 'Test', cols: 8, rows: 8,
      terrain: [], units: [],
      triggers: [{ id: 't1', cutsceneId: 'c1', condition: { type: 'on_first_combat' }, oneShot: true }],
    });
    engine.markFirstCombat();
    const trigger = engine.evaluateTrigger({ eventType: 'on_first_combat' });
    expect(trigger).toBeNull(); // consumed

    const snap = engine.snapshot('level-1');
    const restored = new GameEngine(1, 1);
    restored.restore(snap);

    expect(restored.evaluateTrigger({ eventType: 'on_first_combat' })).toBeNull();
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/__tests__/GameEngine.save.test.ts
```
Expected: FAIL — `snapshot` and `restore` methods don't exist

**Step 3: Write minimal implementation**

Add to `src/game/GameEngine.ts` (after `loadLevel`, before `getUnit`):

```typescript
import { SaveData } from './save/SaveData';
import { serializeUnit, deserializeUnit } from './save/UnitSerializer';

// ... existing imports ...

  snapshot(levelId: string): SaveData {
    const terrain: SaveData['terrain'] = [];
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        terrain.push({ x, y, type: this.grid.getTerrain(x, y) });
      }
    }
    return {
      version: 1,
      timestamp: Date.now(),
      levelId,
      turnNumber: this.turnManager.turnNumber,
      currentPhase: this.turnManager.currentPhase,
      gridCols: this.grid.cols,
      gridRows: this.grid.rows,
      terrain,
      units: this.units.map((u) => serializeUnit(u)),
      consumedTriggers: Array.from(this.triggerEngine['consumed'] ?? []),
      firstCombatOccurred: this.triggerEngine['firstCombatOccurred'] ?? false,
    };
  }

  restore(data: SaveData): void {
    // Rebuild grid
    this.grid = new Grid(data.gridCols, data.gridRows);
    for (const t of data.terrain) {
      this.grid.setTerrain(t.x, t.y, t.type);
    }
    // Rebuild units
    this.units = [];
    for (const u of data.units) {
      const unit = deserializeUnit(u);
      this.units.push(unit);
      this.grid.placeUnit(unit, unit.gridX, unit.gridY);
    }
    // Restore turn manager
    this.turnManager.currentPhase = data.currentPhase; // needs setter or reflection
    this.turnManager.turnNumber = data.turnNumber;     // needs setter or reflection
    // Restore trigger engine
    this.triggerEngine.reset();
    this.triggerEngine['consumed'] = new Set(data.consumedTriggers);
    this.triggerEngine['firstCombatOccurred'] = data.firstCombatOccurred;
  }
```

**Note:** The TurnManager and CutsceneTriggerEngine currently have private fields with no setters. You need to add package-internal setters or make the fields accessible. The simplest approach:

In `src/game/state/TurnManager.ts`, add:
```typescript
  set currentPhase(phase: GamePhase) { this.phase = phase; }
  set turnNumber(turn: number) { this.turn = turn; }
```

In `src/game/cutscene/TriggerEngine.ts`, add public methods:
```typescript
  getConsumed(): Set<string> { return new Set(this.consumed); }
  setConsumed(consumed: Set<string>): void { this.consumed = new Set(consumed); }
  getFirstCombatOccurred(): boolean { return this.firstCombatOccurred; }
  setFirstCombatOccurred(v: boolean): void { this.firstCombatOccurred = v; }
```

Then update `GameEngine.snapshot()` and `restore()` to use these public accessors instead of bracket notation.

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/__tests__/GameEngine.save.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/state/TurnManager.ts src/game/cutscene/TriggerEngine.ts src/game/__tests__/GameEngine.save.test.ts
git commit -m "feat(save): add GameEngine.snapshot() and restore()"
```

---

### Task 4: SaveManager (localStorage CRUD)

**Objective:** Pure class for creating, listing, loading, and deleting save files from `localStorage`.

**Files:**
- Create: `src/game/save/SaveManager.ts`
- Test: `src/game/save/__tests__/SaveManager.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../SaveManager';
import { SaveData } from '../SaveData';

// Mock localStorage for Vitest (node environment)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('SaveManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('saves and loads data', () => {
    const mgr = new SaveManager();
    const data: SaveData = {
      version: 1, timestamp: 1000, levelId: 'level-1',
      turnNumber: 1, currentPhase: 'player',
      gridCols: 8, gridRows: 8, terrain: [], units: [],
      consumedTriggers: [], firstCombatOccurred: false,
    };
    mgr.save('slot_0', data);
    const loaded = mgr.load('slot_0');
    expect(loaded).not.toBeNull();
    expect(loaded!.levelId).toBe('level-1');
    expect(loaded!.timestamp).toBe(1000);
  });

  it('lists all saves', () => {
    const mgr = new SaveManager();
    mgr.save('slot_0', { version: 1, timestamp: 1000, levelId: 'level-1', turnNumber: 1, currentPhase: 'player', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: false });
    mgr.save('slot_1', { version: 1, timestamp: 2000, levelId: 'level-2', turnNumber: 3, currentPhase: 'enemy', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: true });
    const list = mgr.listSaves();
    expect(list).toHaveLength(2);
    expect(list[0].slot).toBe('slot_0');
    expect(list[1].slot).toBe('slot_1');
  });

  it('deletes a save', () => {
    const mgr = new SaveManager();
    mgr.save('slot_0', { version: 1, timestamp: 1000, levelId: 'level-1', turnNumber: 1, currentPhase: 'player', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: false });
    mgr.delete('slot_0');
    expect(mgr.load('slot_0')).toBeNull();
    expect(mgr.listSaves()).toHaveLength(0);
  });

  it('returns null for missing save', () => {
    const mgr = new SaveManager();
    expect(mgr.load('slot_99')).toBeNull();
  });

  it('rejects save data with wrong version', () => {
    const mgr = new SaveManager();
    const badData = { version: 999, timestamp: 1000, levelId: 'level-1', turnNumber: 1, currentPhase: 'player', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: false } as SaveData;
    mgr.save('slot_bad', badData);
    expect(mgr.load('slot_bad')).toBeNull();
  });

  it('generates save metadata for UI', () => {
    const mgr = new SaveManager();
    mgr.save('slot_0', { version: 1, timestamp: 1000, levelId: 'level-1', turnNumber: 5, currentPhase: 'player', gridCols: 8, gridRows: 8, terrain: [], units: [], consumedTriggers: [], firstCombatOccurred: false });
    const list = mgr.listSaves();
    expect(list[0].meta.turnNumber).toBe(5);
    expect(list[0].meta.currentPhase).toBe('player');
    expect(list[0].meta.levelId).toBe('level-1');
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/save/__tests__/SaveManager.test.ts
```
Expected: FAIL — SaveManager doesn't exist

**Step 3: Write minimal implementation**

```typescript
// src/game/save/SaveManager.ts
import { SaveData, SAVE_VERSION } from './SaveData';

const PREFIX = 'tss_save_';

export interface SaveMetadata {
  slot: string;
  meta: {
    levelId: string;
    turnNumber: number;
    currentPhase: string;
    timestamp: number;
    playTimeMs?: number;
  };
}

export class SaveManager {
  save(slot: string, data: SaveData): void {
    const payload = JSON.stringify(data);
    localStorage.setItem(`${PREFIX}${slot}`, payload);
  }

  load(slot: string): SaveData | null {
    const raw = localStorage.getItem(`${PREFIX}${slot}`);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== SAVE_VERSION) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  delete(slot: string): void {
    localStorage.removeItem(`${PREFIX}${slot}`);
  }

  listSaves(): SaveMetadata[] {
    const results: SaveMetadata[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const slot = key.slice(PREFIX.length);
      const data = this.load(slot);
      if (!data) continue;
      results.push({
        slot,
        meta: {
          levelId: data.levelId,
          turnNumber: data.turnNumber,
          currentPhase: data.currentPhase,
          timestamp: data.timestamp,
          playTimeMs: data.playTimeMs,
        },
      });
    }
    return results.sort((a, b) => a.slot.localeCompare(b.slot));
  }
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/save/__tests__/SaveManager.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/save/SaveManager.ts src/game/save/__tests__/SaveManager.test.ts
git commit -m "feat(save): add SaveManager with localStorage CRUD"
```

---

### Task 5: Barrel export for save module

**Objective:** Export save module from `src/game/index.ts`.

**Files:**
- Modify: `src/game/index.ts`

**Step 1: Write failing test**

No new test needed — existing barrel-import smoke test should verify.

**Step 2: Run existing smoke test**

```bash
npx vitest run src/game/__tests__/smoke.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// Append to src/game/index.ts
export * from './save';
```

Create `src/game/save/index.ts`:
```typescript
export { SaveData, SAVE_VERSION, TerrainSnapshot, UnitSnapshot } from './SaveData';
export { SaveManager, SaveMetadata } from './SaveManager';
export { serializeUnit, deserializeUnit } from './UnitSerializer';
```

**Step 4: Run smoke test to verify pass**

```bash
npx vitest run src/game/__tests__/smoke.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/index.ts src/game/save/index.ts
git commit -m "feat(save): export save module from game barrel"
```

---

### Task 6: Add "Load Game" to MainMenuScene

**Objective:** Show a list of save files on the main menu. Clicking a save resumes the game.

**Files:**
- Modify: `src/scenes/MainMenuScene.ts`

**Step 1: Understand current MainMenuScene**

Current buttons: "New Campaign", "Level 2", "Watch Prologue". We add "Load Game" and a save list overlay.

**Step 2: Implement scene changes**

```typescript
// Add imports at top of src/scenes/MainMenuScene.ts
import { SaveManager, SaveMetadata } from '../game/save';
import { getLevel } from '../game/levels/LevelData';

// In create(), after the prologueBtn setup, add:

const loadBtn = this.add
  .text(cx, cy + 240, '[ Load Game ]', {
    fontSize: '24px',
    color: '#ecf0f1',
    backgroundColor: '#2c3e50',
    padding: { x: 20, y: 10 },
  })
  .setOrigin(0.5)
  .setInteractive({ useHandCursor: true });

loadBtn.on('pointerover', () => loadBtn.setStyle({ color: '#f1c40f' }));
loadBtn.on('pointerout', () => loadBtn.setStyle({ color: '#ecf0f1' }));
loadBtn.on(
  'pointerdown',
  (
    _pointer: unknown,
    _localX: number,
    _localY: number,
    event: Phaser.Types.Input.EventData,
  ) => {
    event.stopPropagation();
    this.showLoadMenu();
  },
);
```

Add the `showLoadMenu()` method to `MainMenuScene`:

```typescript
private saveListContainer: Phaser.GameObjects.Container | null = null;

private showLoadMenu(): void {
  if (this.saveListContainer) {
    this.saveListContainer.destroy();
    this.saveListContainer = null;
    return;
  }

  const mgr = new SaveManager();
  const saves = mgr.listSaves();

  const cx = this.cameras.main.centerX;
  const cy = this.cameras.main.centerY;

  this.saveListContainer = this.add.container(0, 0);

  // Background panel
  const panel = this.add.rectangle(cx, cy + 120, 500, 300, 0x1a1a2e, 0.95);
  panel.setStrokeStyle(2, 0x34495e);
  this.saveListContainer.add(panel);

  // Title
  const title = this.add.text(cx, cy - 10, 'Load Game', {
    fontSize: '28px',
    color: '#f1c40f',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  this.saveListContainer.add(title);

  if (saves.length === 0) {
    const empty = this.add.text(cx, cy + 60, 'No save files found.', {
      fontSize: '18px',
      color: '#bdc3c7',
    }).setOrigin(0.5);
    this.saveListContainer.add(empty);
  } else {
    saves.forEach((save, index) => {
      const y = cy + 40 + index * 50;
      const level = getLevel(save.meta.levelId);
      const levelName = level?.name ?? save.meta.levelId;
      const dateStr = new Date(save.meta.timestamp).toLocaleString();
      const label = `${index + 1}. ${levelName} — Turn ${save.meta.turnNumber} (${save.meta.currentPhase}) — ${dateStr}`;

      const row = this.add.text(cx, y, label, {
        fontSize: '16px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      row.on('pointerover', () => row.setStyle({ color: '#f1c40f' }));
      row.on('pointerout', () => row.setStyle({ color: '#ecf0f1' }));
      row.on('pointerdown', (_p: unknown, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('BattleScene', { levelId: save.meta.levelId, saveSlot: save.slot });
        });
      });

      this.saveListContainer.add(row);
    });
  }

  // Close button
  const closeBtn = this.add.text(cx, cy + 220, '[ Close ]', {
    fontSize: '18px',
    color: '#e74c3c',
    backgroundColor: '#2c3e50',
    padding: { x: 16, y: 6 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#ff6b6b' }));
  closeBtn.on('pointerout', () => closeBtn.setStyle({ color: '#e74c3c' }));
  closeBtn.on('pointerdown', (_p: unknown, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    this.saveListContainer?.destroy();
    this.saveListContainer = null;
  });

  this.saveListContainer.add(closeBtn);
  this.saveListContainer.setDepth(100);
}
```

**Step 3: Verify build**

```bash
npm run build
```
Expected: PASS (ignore tsc ES5 false positives if any)

**Step 4: Commit**

```bash
git add src/scenes/MainMenuScene.ts
git commit -m "feat(save): add Load Game menu to MainMenuScene"
```

---

### Task 7: BattleScene resume from save

**Objective:** When `BattleScene` receives a `saveSlot` in its init data, load that save instead of starting fresh.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Write the change**

In `BattleScene.create(data?)`, change:

```typescript
// BEFORE:
  create(data?: { levelId?: string }): void {
    // ...
    const levelId = data?.levelId ?? 'level-1';
    this.currentLevelId = levelId;
    const level = getLevel(levelId);
    if (!level) {
      throw new Error(`Unknown level: ${levelId}`);
    }
    this.engine = new GameEngine(level.cols, level.rows);
    this.engine.loadLevel(level);
```

To:

```typescript
// AFTER:
  create(data?: { levelId?: string; saveSlot?: string }): void {
    // ...
    const levelId = data?.levelId ?? 'level-1';
    this.currentLevelId = levelId;
    const level = getLevel(levelId);
    if (!level) {
      throw new Error(`Unknown level: ${levelId}`);
    }

    this.engine = new GameEngine(level.cols, level.rows);

    if (data?.saveSlot) {
      const mgr = new SaveManager();
      const saveData = mgr.load(data.saveSlot);
      if (!saveData) {
        throw new Error(`Save slot not found: ${data.saveSlot}`);
      }
      this.engine.restore(saveData);
    } else {
      this.engine.loadLevel(level);
    }
```

**Step 2: Verify build**

```bash
npm run build
```
Expected: PASS

**Step 3: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(save): allow BattleScene to resume from a save slot"
```

---

### Task 8: Add "Save" option to BattleScene

**Objective:** Add a save button to the BattleScene UI (visible during player phase, when no modal is open).

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Plan the UI**

Add a small "Save" text button in the top-right corner of the screen. Only visible during player phase when:
- `!this.inBattleMode`
- `!this.battleMenu.isVisible`
- `!this.isAnimatingMovement`
- `!this.levelUpSequence`
- `!this.promotionSequence`
- `this.engine.turnManager.isPlayerPhase()`

**Step 2: Add save button creation in `createUI()`**

Find `createUI()` in BattleScene. Add after the phase text:

```typescript
// In createUI():
this.saveBtn = this.add.text(this.cameras.main.width - 20, 20, '[ Save ]', {
  fontSize: '18px',
  color: '#ecf0f1',
  backgroundColor: '#2c3e50',
  padding: { x: 12, y: 6 },
})
  .setOrigin(1, 0)
  .setInteractive({ useHandCursor: true })
  .setDepth(10);

this.saveBtn.on('pointerover', () => this.saveBtn!.setStyle({ color: '#f1c40f' }));
this.saveBtn.on('pointerout', () => this.saveBtn!.setStyle({ color: '#ecf0f1' }));
this.saveBtn.on('pointerdown', (_p: unknown, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
  event.stopPropagation();
  this.openSaveMenu();
});
```

Add `saveBtn` field to the class:
```typescript
private saveBtn: Phaser.GameObjects.Text | null = null;
```

**Step 3: Add visibility toggle**

Add a method to update save button visibility, and call it from appropriate places:

```typescript
private updateSaveBtnVisibility(): void {
  if (!this.saveBtn) return;
  const canSave =
    this.engine.turnManager.isPlayerPhase() &&
    !this.inBattleMode &&
    !this.battleMenu.isVisible &&
    !this.isAnimatingMovement &&
    !this.levelUpSequence &&
    !this.promotionSequence &&
    !this.statusOverlay &&
    !this.itemOverlay;
  this.saveBtn.setVisible(canSave);
}
```

Call `this.updateSaveBtnVisibility()` at the end of:
- `triggerEndTurn()`
- `handleTileClick()` (after all branches)
- `undoMove()`
- `showBattleMenu()`
- `hideBattleMenu()`
- `endBattleMode()`
- `onMovementAnimationComplete()`

**Step 4: Add save menu overlay**

```typescript
private saveMenuContainer: Phaser.GameObjects.Container | null = null;

private openSaveMenu(): void {
  if (this.saveMenuContainer) return;
  this.inputEnabled = false;

  const cx = this.cameras.main.centerX;
  const cy = this.cameras.main.centerY;

  this.saveMenuContainer = this.add.container(0, 0).setDepth(100);

  // Dim background
  const dim = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
  this.saveMenuContainer.add(dim);

  // Panel
  const panel = this.add.rectangle(cx, cy, 400, 320, 0x1a1a2e, 0.95);
  panel.setStrokeStyle(2, 0x34495e);
  this.saveMenuContainer.add(panel);

  // Title
  const title = this.add.text(cx, cy - 120, 'Save Game', {
    fontSize: '24px', color: '#f1c40f', fontStyle: 'bold',
  }).setOrigin(0.5);
  this.saveMenuContainer.add(title);

  const mgr = new SaveManager();
  const existing = mgr.listSaves();
  const slots = ['slot_0', 'slot_1', 'slot_2', 'slot_3', 'slot_4'];

  slots.forEach((slot, index) => {
    const save = existing.find((s) => s.slot === slot);
    const label = save
      ? `${index + 1}. ${save.meta.levelId} — Turn ${save.meta.turnNumber}`
      : `${index + 1}. [ Empty ]`;
    const y = cy - 60 + index * 45;

    const row = this.add.text(cx, y, label, {
      fontSize: '16px',
      color: '#ecf0f1',
      backgroundColor: '#2c3e50',
      padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    row.on('pointerover', () => row.setStyle({ color: '#f1c40f' }));
    row.on('pointerout', () => row.setStyle({ color: '#ecf0f1' }));
    row.on('pointerdown', (_p: unknown, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      const data = this.engine.snapshot(this.currentLevelId);
      mgr.save(slot, data);
      this.closeSaveMenu();
      // Brief confirmation
      const confirm = this.add.text(cx, cy + 140, 'Game Saved!', {
        fontSize: '18px', color: '#2ecc71', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(101);
      this.time.delayedCall(1200, () => confirm.destroy());
    });

    this.saveMenuContainer.add(row);
  });

  // Cancel button
  const cancel = this.add.text(cx, cy + 140, '[ Cancel ]', {
    fontSize: '18px', color: '#e74c3c', backgroundColor: '#2c3e50', padding: { x: 16, y: 6 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  cancel.on('pointerover', () => cancel.setStyle({ color: '#ff6b6b' }));
  cancel.on('pointerout', () => cancel.setStyle({ color: '#e74c3c' }));
  cancel.on('pointerdown', (_p: unknown, _lx: number, _ly: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    this.closeSaveMenu();
  });

  this.saveMenuContainer.add(cancel);
}

private closeSaveMenu(): void {
  if (!this.saveMenuContainer) return;
  this.saveMenuContainer.destroy();
  this.saveMenuContainer = null;
  this.inputEnabled = true;
  this.updateSaveBtnVisibility();
}
```

**Step 5: Verify build**

```bash
npm run build
```
Expected: PASS

**Step 6: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(save): add Save button and slot picker to BattleScene"
```

---

### Task 9: Full integration test (GameEngine ↔ SaveManager)

**Objective:** End-to-end test that simulates gameplay, saves, restores, and asserts state equality.

**Files:**
- Create: `src/game/save/__tests__/integration.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../GameEngine';
import { SaveManager } from '../SaveManager';
import { Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Save integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('full gameplay save and resume', () => {
    // 1. Setup a game
    const engine = new GameEngine(8, 8);
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, createStats({
      hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
    }), 5, 5);

    // 2. Play a few turns
    engine.endTurn(); // player -> enemy
    engine.endTurn(); // enemy -> ally
    engine.endTurn(); // ally -> player (turn 2)

    // 3. Damage a unit
    const rowan = engine.getUnit(2, 5)!;
    rowan.takeDamage(7);
    rowan.hasActed = true;

    // 4. Save
    const mgr = new SaveManager();
    mgr.save('slot_0', engine.snapshot('level-1'));

    // 5. Restore into a fresh engine
    const restoredEngine = new GameEngine(1, 1);
    const loaded = mgr.load('slot_0')!;
    restoredEngine.restore(loaded);

    // 6. Assert everything matches
    expect(restoredEngine.turnManager.turnNumber).toBe(2);
    expect(restoredEngine.turnManager.currentPhase).toBe('player');
    expect(restoredEngine.getAllUnits()).toHaveLength(2);

    const restoredRowan = restoredEngine.getUnit(2, 5)!;
    expect(restoredRowan.stats.hp).toBe(15);
    expect(restoredRowan.state.isExhausted()).toBe(true);
    expect(restoredRowan.name).toBe('Rowan');

    const restoredBandit = restoredEngine.getUnit(5, 5)!;
    expect(restoredBandit.name).toBe('Bandit');
    expect(restoredBandit.faction).toBe('enemy');
    expect(restoredBandit.isAlive).toBe(true);
  });

  it('save metadata is readable by MainMenu logic', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    engine.endTurn();
    engine.endTurn();
    engine.endTurn();
    engine.endTurn(); // turn 2, enemy

    const mgr = new SaveManager();
    mgr.save('slot_1', engine.snapshot('level-2'));

    const list = mgr.listSaves();
    expect(list).toHaveLength(1);
    expect(list[0].slot).toBe('slot_1');
    expect(list[0].meta.levelId).toBe('level-2');
    expect(list[0].meta.turnNumber).toBe(2);
    expect(list[0].meta.currentPhase).toBe('enemy');
  });
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/save/__tests__/integration.test.ts
```
Expected: FAIL — file doesn't exist

**Step 3: Write minimal implementation**

The implementation is already done in previous tasks. Just create the test file.

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/save/__tests__/integration.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/save/__tests__/integration.test.ts
git commit -m "test(save): add full gameplay save/resume integration test"
```

---

### Task 10: Run full test suite and build

**Objective:** Verify no regressions.

**Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass

**Step 2: Run build**

```bash
npm run build
```
Expected: Build succeeds (ignore ES5 tsc false positives)

**Step 3: Commit any final fixes**

```bash
git commit -m "chore(save): finalize save/resume system"
```

---

## Verification Checklist

- [ ] `SaveData` types defined and versioned
- [ ] `UnitSerializer` round-trips all unit properties (stats, state, inventory, AI config)
- [ ] `GameEngine.snapshot()` produces valid `SaveData`
- [ ] `GameEngine.restore()` reconstructs engine exactly from `SaveData`
- [ ] `SaveManager` CRUD works with `localStorage`
- [ ] `SaveManager` rejects saves with wrong version
- [ ] `MainMenuScene` shows loadable save list
- [ ] `BattleScene` resumes from save slot when `saveSlot` passed
- [ ] `BattleScene` shows save button during valid player phase
- [ ] Save slot picker allows overwriting empty or existing slots
- [ ] Integration test: gameplay → save → load → identical state
- [ ] All existing tests still pass
- [ ] Build succeeds

---

## Future Extensions (out of scope for this plan)

1. **Play time tracking:** Increment `playTimeMs` on the save by tracking session duration.
2. **Auto-save:** Save to `slot_auto` at the start of each player turn.
3. **Save screenshots:** Capture a canvas thumbnail and store as base64.
4. **Multiple chapters / overworld:** Add an `OverworldScene` that sits between MainMenu and BattleScene; save from there too.
5. **Cloud saves:** Replace `localStorage` with an HTTP backend.
6. **Save compression:** Gzip the JSON string if save sizes grow.
