# Level 2 — Lava & Cliff Terrain Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a second playable level featuring lava tiles (damage over time) and cliff tiles (difficult terrain traversable only by flying units). Extract hardcoded level data from `BattleScene` into a proper level system.

**Architecture:** Extend the existing `TerrainType` enum and `TerrainData` interface with hazard properties. Add `isFlying` to `Unit`. Modify `computeMoveRange` and `findPath` to accept unit-specific terrain cost resolution. Create a `LevelDefinition` type and level registry. Keep all pure logic in `src/game/` and all rendering in `src/scenes/`.

**Tech Stack:** TypeScript, Vitest, Phaser 3

---

## Task 1: Add `LAVA` and `CLIFF` terrain types

**Objective:** Extend `TerrainType` and `TERRAIN_DEFS` with two new terrain types.

**Files:**
- Modify: `src/game/map/Terrain.ts`
- Test: `src/game/map/__tests__/Terrain.test.ts`

**Step 1: Write failing test**

```typescript
it('lava terrain has high move cost and hazard damage', () => {
  const t = TERRAIN_DEFS[TerrainType.LAVA];
  expect(t.moveCost).toBe(2);
  expect(t.hazardDamage).toBe(5);
});

it('cliff terrain is difficult but not impassable', () => {
  const t = TERRAIN_DEFS[TerrainType.CLIFF];
  expect(t.moveCost).toBe(4);
  expect(t.defenseBonus).toBe(1);
});

it('seven terrain types are defined', () => {
  const types: TerrainType[] = ['plains', 'forest', 'mountain', 'water', 'wall', 'lava', 'cliff'];
  for (const type of types) {
    expect(TERRAIN_DEFS[type]).toBeDefined();
  }
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/map/__tests__/Terrain.test.ts -v`
Expected: FAIL — `LAVA` and `CLIFF` not defined

**Step 3: Write minimal implementation**

```typescript
export const TerrainType = {
  PLAINS: 'plains',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',
  WALL: 'wall',
  LAVA: 'lava',
  CLIFF: 'cliff',
} as const;

export interface TerrainData {
  type: TerrainType;
  moveCost: number;
  defenseBonus: number;
  avoidBonus: number;
  hazardDamage?: number;
}

export const TERRAIN_DEFS: Record<TerrainType, TerrainData> = {
  plains: { type: 'plains', moveCost: 1, defenseBonus: 0, avoidBonus: 0 },
  forest: { type: 'forest', moveCost: 2, defenseBonus: 1, avoidBonus: 20 },
  mountain: { type: 'mountain', moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  water: { type: 'water', moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  wall: { type: 'wall', moveCost: 99, defenseBonus: 0, avoidBonus: 0 },
  lava: { type: 'lava', moveCost: 2, defenseBonus: 0, avoidBonus: 0, hazardDamage: 5 },
  cliff: { type: 'cliff', moveCost: 4, defenseBonus: 1, avoidBonus: 10 },
};
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/map/__tests__/Terrain.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/map/Terrain.ts src/game/map/__tests__/Terrain.test.ts
git commit -m "feat: add LAVA and CLIFF terrain types"
```

---

## Task 2: Add `isFlying` property to `Unit`

**Objective:** Allow units to declare whether they are flying (affects cliff traversal).

**Files:**
- Modify: `src/game/units/Unit.ts`
- Test: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Write failing test**

```typescript
it('pegasus knight is flying', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 7 });
  const unit = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, stats, 0, 0);
  expect(unit.isFlying).toBe(true);
});

it('lord is not flying', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  const unit = new Unit('u1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
  expect(unit.isFlying).toBe(false);
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/units/__tests__/Unit.test.ts -v`
Expected: FAIL — `isFlying` property does not exist

**Step 3: Write minimal implementation**

Add to `Unit` class after `isEnemy` getter:

```typescript
get isFlying(): boolean {
  return this.unitClass === UnitClass.PEGASUS_KNIGHT;
}
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/units/__tests__/Unit.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/units/Unit.ts src/game/units/__tests__/Unit.test.ts
git commit -m "feat: add isFlying property to Unit"
```

---

## Task 3: Create terrain cost resolver for unit-specific movement

**Objective:** Centralize terrain cost lookup so flying units get reduced cliff cost.

**Files:**
- Create: `src/game/movement/TerrainCost.ts`
- Test: `src/game/movement/__tests__/TerrainCost.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { getTerrainMoveCost } from '../TerrainCost';
import { TerrainType } from '../../map/Terrain';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('TerrainCost', () => {
  it('returns normal move cost for plains', () => {
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    expect(getTerrainMoveCost(unit, TerrainType.PLAINS)).toBe(1);
  });

  it('returns high move cost for cliff on non-flying unit', () => {
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    expect(getTerrainMoveCost(unit, TerrainType.CLIFF)).toBe(4);
  });

  it('returns reduced move cost for cliff on flying unit', () => {
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 7 });
    const unit = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, stats, 0, 0);
    expect(getTerrainMoveCost(unit, TerrainType.CLIFF)).toBe(1);
  });

  it('returns normal move cost for lava regardless of flying', () => {
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const lord = new Unit('u1', 'Lord', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const peg = new Unit('u2', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, stats, 0, 0);
    expect(getTerrainMoveCost(lord, TerrainType.LAVA)).toBe(2);
    expect(getTerrainMoveCost(peg, TerrainType.LAVA)).toBe(2);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/movement/__tests__/TerrainCost.test.ts -v`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
import { TerrainType } from '../map/Terrain';
import { Unit } from '../units/Unit';

export function getTerrainMoveCost(unit: Unit, terrain: TerrainType): number {
  switch (terrain) {
    case TerrainType.CLIFF:
      return unit.isFlying ? 1 : 4;
    case TerrainType.LAVA:
      return 2;
    case TerrainType.FOREST:
      return 2;
    case TerrainType.MOUNTAIN:
    case TerrainType.WATER:
    case TerrainType.WALL:
      return 99;
    case TerrainType.PLAINS:
    default:
      return 1;
  }
}
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/movement/__tests__/TerrainCost.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/movement/TerrainCost.ts src/game/movement/__tests__/TerrainCost.test.ts
git commit -m "feat: add terrain cost resolver with flying support"
```

---

## Task 4: Update `computeMoveRange` to use unit-specific terrain costs

**Objective:** Make movement range respect flying units on cliffs.

**Files:**
- Modify: `src/game/movement/MoveRange.ts`
- Modify: `src/game/movement/index.ts` (export `getTerrainMoveCost`)
- Test: `src/game/movement/__tests__/MoveRange.test.ts`

**Step 1: Write failing test**

Add to `MoveRange.test.ts`:

```typescript
it('flying unit can traverse cliffs at reduced cost', () => {
  const grid = new Grid(5, 5);
  grid.setTerrain(2, 2, TerrainType.CLIFF);
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
  const pegasus = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, stats, 1, 2);
  const range = computeMoveRange(pegasus, grid);
  expect(range.has('2,2')).toBe(true);
});

it('non-flying unit cannot traverse cliffs within normal movement', () => {
  const grid = new Grid(5, 5);
  grid.setTerrain(2, 2, TerrainType.CLIFF);
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
  const lord = new Unit('u1', 'Lord', Faction.PLAYER, UnitClass.LORD, stats, 1, 2);
  const range = computeMoveRange(lord, grid);
  expect(range.has('2,2')).toBe(false);
});

it('non-flying unit can traverse cliffs with enough movement', () => {
  const grid = new Grid(5, 5);
  grid.setTerrain(2, 2, TerrainType.CLIFF);
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 4 });
  const lord = new Unit('u1', 'Lord', Faction.PLAYER, UnitClass.LORD, stats, 1, 2);
  const range = computeMoveRange(lord, grid);
  expect(range.has('2,2')).toBe(true);
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/movement/__tests__/MoveRange.test.ts -v`
Expected: FAIL — pegasus cannot traverse cliff

**Step 3: Write minimal implementation**

Modify `MoveRange.ts` to import and use `getTerrainMoveCost`:

```typescript
import { Grid } from '../map/Grid';
import { Unit } from '../units/Unit';
import { getTerrainMoveCost } from './TerrainCost';

export function computeMoveRange(unit: Unit, grid: Grid): Map<string, number> {
  // ... existing setup ...

  while (queue.length > 0) {
    // ... extract x, y, cost ...

    for (const [dx, dy] of dirs) {
      // ... bounds check ...

      const terrain = grid.getTerrain(nx, ny);
      const terrainCost = getTerrainMoveCost(unit, terrain);

      // Impassable terrain
      if (terrainCost >= 99) {
        continue;
      }

      // ... rest of existing logic ...
    }
  }

  return visited;
}
```

Replace the line `const terrainData = grid.getTerrainData(nx, ny); const terrainCost = terrainData.moveCost;` with the new terrain-aware lookup.

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/movement/__tests__/MoveRange.test.ts -v`
Expected: PASS (all existing + new tests)

**Step 5: Update barrel export**

Add to `src/game/movement/index.ts`:
```typescript
export { getTerrainMoveCost } from './TerrainCost';
```

**Step 6: Commit**

```bash
git add src/game/movement/MoveRange.ts src/game/movement/index.ts src/game/movement/__tests__/MoveRange.test.ts
git commit -m "feat: flying units traverse cliffs at reduced cost"
```

---

## Task 5: Update `findPath` to use unit-specific terrain costs

**Objective:** Pathfinding must also respect flying units on cliffs.

**Files:**
- Modify: `src/game/movement/Pathfinder.ts`
- Test: `src/game/movement/__tests__/Pathfinder.test.ts`

**Step 1: Write failing test**

Add to `Pathfinder.test.ts`:

```typescript
it('finds path through cliff for flying unit', () => {
  const grid = new Grid(5, 5);
  grid.setTerrain(2, 2, TerrainType.CLIFF);
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
  const pegasus = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, stats, 1, 2);
  const path = findPath(pegasus, grid, 3, 2);
  expect(path).not.toBeNull();
  expect(path!.some((p) => p.x === 2 && p.y === 2)).toBe(true);
});

it('does not find path through cliff for non-flying unit with low mov', () => {
  const grid = new Grid(5, 5);
  grid.setTerrain(2, 2, TerrainType.CLIFF);
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 3 });
  const lord = new Unit('u1', 'Lord', Faction.PLAYER, UnitClass.LORD, stats, 1, 2);
  const path = findPath(lord, grid, 3, 2);
  expect(path).toBeNull();
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/movement/__tests__/Pathfinder.test.ts -v`
Expected: FAIL — path through cliff not found for flying unit

**Step 3: Write minimal implementation**

Modify `Pathfinder.ts`:

```typescript
import { Grid, GridNeighbor } from '../map/Grid';
import { Unit } from '../units/Unit';
import { getTerrainMoveCost } from './TerrainCost';

// ... inside the while loop, replace:
// const terrainCost = grid.getTerrainData(nx, ny).moveCost;
// with:
const terrain = grid.getTerrain(nx, ny);
const terrainCost = getTerrainMoveCost(unit, terrain);
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/movement/__tests__/Pathfinder.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/movement/Pathfinder.ts src/game/movement/__tests__/Pathfinder.test.ts
git commit -m "feat: pathfinding respects flying units on cliffs"
```

---

## Task 6: Create `TerrainHazardEngine` for lava damage

**Objective:** Pure-logic engine that computes hazard damage for units standing on hazardous terrain.

**Files:**
- Create: `src/game/hazards/TerrainHazardEngine.ts`
- Test: `src/game/hazards/__tests__/TerrainHazardEngine.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { TerrainHazardEngine } from '../TerrainHazardEngine';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('TerrainHazardEngine', () => {
  it('applies lava damage to unit standing on lava', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.LAVA);
    const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const engine = new TerrainHazardEngine();
    const damage = engine.computeHazardDamage(unit, grid);
    expect(damage).toBe(5);
  });

  it('applies no damage on safe terrain', () => {
    const grid = new Grid(5, 5);
    const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const engine = new TerrainHazardEngine();
    const damage = engine.computeHazardDamage(unit, grid);
    expect(damage).toBe(0);
  });

  it('does not overkill unit with hazard damage', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(2, 2, TerrainType.LAVA);
    const stats = createStats({ hp: 3, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const engine = new TerrainHazardEngine();
    const damage = engine.computeHazardDamage(unit, grid);
    expect(damage).toBe(3); // capped to current HP
  });

  it('returns hazard report for all live units', () => {
    const grid = new Grid(5, 5);
    grid.setTerrain(1, 1, TerrainType.LAVA);
    grid.setTerrain(3, 3, TerrainType.LAVA);
    const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const u1 = new Unit('u1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    const u2 = new Unit('u2', 'B', Faction.PLAYER, UnitClass.MAGE, stats, 2, 2);
    const u3 = new Unit('u3', 'C', Faction.ENEMY, UnitClass.BRIGAND, stats, 3, 3);
    const engine = new TerrainHazardEngine();
    const report = engine.applyHazards([u1, u2, u3], grid);
    expect(report.damagedUnits).toHaveLength(2);
    expect(report.damagedUnits.map((d) => d.unit.id)).toContain('u1');
    expect(report.damagedUnits.map((d) => d.unit.id)).toContain('u3');
    expect(report.damagedUnits.find((d) => d.unit.id === 'u1')!.damage).toBe(5);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/hazards/__tests__/TerrainHazardEngine.test.ts -v`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
import { Grid } from '../map/Grid';
import { Unit } from '../units/Unit';

export interface HazardDamage {
  unit: Unit;
  damage: number;
  terrain: string;
}

export interface HazardReport {
  damagedUnits: HazardDamage[];
}

export class TerrainHazardEngine {
  computeHazardDamage(unit: Unit, grid: Grid): number {
    const terrain = grid.getTerrain(unit.gridX, unit.gridY);
    const terrainData = grid.getTerrainData(unit.gridX, unit.gridY);
    const hazardDamage = terrainData.hazardDamage ?? 0;
    if (hazardDamage <= 0) return 0;
    return Math.min(hazardDamage, unit.stats.hp);
  }

  applyHazards(units: Unit[], grid: Grid): HazardReport {
    const damagedUnits: HazardDamage[] = [];
    for (const unit of units) {
      if (!unit.isAlive) continue;
      const damage = this.computeHazardDamage(unit, grid);
      if (damage > 0) {
        const terrain = grid.getTerrain(unit.gridX, unit.gridY);
        unit.takeDamage(damage);
        damagedUnits.push({ unit, damage, terrain });
      }
    }
    return { damagedUnits };
  }
}
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/hazards/__tests__/TerrainHazardEngine.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/hazards/TerrainHazardEngine.ts src/game/hazards/__tests__/TerrainHazardEngine.test.ts
git commit -m "feat: add TerrainHazardEngine for lava damage"
```

---

## Task 7: Integrate hazards into `GameEngine` and `TurnManager`

**Objective:** Apply terrain hazards at the start of each phase.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/state/TurnManager.ts` (add hook for pre-phase events)
- Test: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

Add to `GameEngine.test.ts`:

```typescript
it('applies lava damage at start of enemy phase', () => {
  const engine = new GameEngine(5, 5);
  const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
  engine.setTerrain(2, 2, TerrainType.LAVA);
  const hpBefore = unit.stats.hp;
  engine.endTurn(); // player → enemy, should apply hazards
  expect(unit.stats.hp).toBe(hpBefore - 5);
});

it('does not apply hazard damage during same phase', () => {
  const engine = new GameEngine(5, 5);
  const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
  engine.setTerrain(2, 2, TerrainType.LAVA);
  const hpBefore = unit.stats.hp;
  // No phase change yet
  expect(unit.stats.hp).toBe(hpBefore);
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/__tests__/GameEngine.test.ts -v`
Expected: FAIL — no hazard application on phase change

**Step 3: Write minimal implementation**

Modify `GameEngine.ts`:

```typescript
import { TerrainHazardEngine } from './hazards/TerrainHazardEngine';

// In class body, add:
private hazardEngine: TerrainHazardEngine;

// In constructor:
this.hazardEngine = new TerrainHazardEngine();

// Add method:
applyTerrainHazards(): import('./hazards/TerrainHazardEngine').HazardReport {
  return this.hazardEngine.applyHazards(this.getLiveUnits(), this.grid);
}

// Modify endTurn() to apply hazards at phase transition:
endTurn(): void {
  const liveUnits = this.getLiveUnits();
  this.turnManager.advancePhase(liveUnits);

  // Apply terrain hazards at the start of the new phase
  this.applyTerrainHazards();

  if (this.turnManager.isEnemyPhase()) {
    // ... existing enemy AI code ...
  }
}
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/__tests__/GameEngine.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat: apply terrain hazards at phase transitions"
```

---

## Task 8: Create `LevelDefinition` types and registry

**Objective:** Define the data structures for level data.

**Files:**
- Create: `src/game/levels/LevelDefinition.ts`
- Create: `src/game/levels/index.ts`
- Test: `src/game/levels/__tests__/LevelDefinition.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { LevelDefinition, UnitPlacement } from '../LevelDefinition';
import { TerrainType } from '../../map/Terrain';
import { Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('LevelDefinition', () => {
  it('can define a level with terrain and units', () => {
    const level: LevelDefinition = {
      id: 'test',
      name: 'Test Level',
      cols: 5,
      rows: 5,
      terrain: [
        { x: 1, y: 1, type: TerrainType.LAVA },
        { x: 2, y: 2, type: TerrainType.CLIFF },
      ],
      units: [
        {
          id: 'p1',
          name: 'Rowan',
          faction: Faction.PLAYER,
          unitClass: UnitClass.LORD,
          stats: createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 }),
          x: 0,
          y: 0,
        },
      ],
    };
    expect(level.id).toBe('test');
    expect(level.terrain).toHaveLength(2);
    expect(level.units).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/levels/__tests__/LevelDefinition.test.ts -v`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
import { TerrainType } from '../map/Terrain';
import { Faction, UnitClass } from '../units/Unit';
import { UnitStats } from '../units/Stats';

export interface UnitPlacement {
  id: string;
  name: string;
  faction: Faction;
  unitClass: UnitClass;
  stats: UnitStats;
  x: number;
  y: number;
}

export interface TerrainPlacement {
  x: number;
  y: number;
  type: TerrainType;
}

export interface LevelDefinition {
  id: string;
  name: string;
  cols: number;
  rows: number;
  terrain: TerrainPlacement[];
  units: UnitPlacement[];
}
```

Barrel export `src/game/levels/index.ts`:
```typescript
export * from './LevelDefinition';
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/levels/__tests__/LevelDefinition.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/levels/LevelDefinition.ts src/game/levels/index.ts src/game/levels/__tests__/LevelDefinition.test.ts
git commit -m "feat: add LevelDefinition types for level data"
```

---

## Task 9: Extract Level 1 from `BattleScene` into `LevelData.ts`

**Objective:** Create the level registry with the existing level 1 data.

**Files:**
- Create: `src/game/levels/LevelData.ts`
- Test: `src/game/levels/__tests__/LevelData.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { LEVELS, getLevel } from '../LevelData';

describe('LevelData', () => {
  it('has level 1 defined', () => {
    const level1 = getLevel('level-1');
    expect(level1).toBeDefined();
    expect(level1!.name).toBe('The Sanguine Plains');
    expect(level1!.units.length).toBeGreaterThan(0);
  });

  it('has level 2 defined', () => {
    const level2 = getLevel('level-2');
    expect(level2).toBeDefined();
    expect(level2!.name).toBe('The Molten Pass');
    expect(level2!.units.length).toBeGreaterThan(0);
  });

  it('returns undefined for unknown level', () => {
    expect(getLevel('nonexistent')).toBeUndefined();
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/levels/__tests__/LevelData.test.ts -v`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Extract the hardcoded data from `BattleScene.populateMap()` and `spawnUnits()` into level definitions.

```typescript
import { LevelDefinition } from './LevelDefinition';
import { TerrainType } from '../map/Terrain';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';

export const LEVEL_1: LevelDefinition = {
  id: 'level-1',
  name: 'The Sanguine Plains',
  cols: 16,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        if (x === 0 || x === 15 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
        } else if ((x + y) % 7 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
        } else if ((x * y) % 11 === 0) {
          terrain.push({ x, y, type: TerrainType.WATER });
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'p1',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 }),
      x: 2,
      y: 5,
    },
    {
      id: 'p2',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 16, maxHp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5 }),
      x: 3,
      y: 6,
    },
    {
      id: 'e1',
      name: 'Bandit',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 }),
      x: 12,
      y: 4,
    },
    {
      id: 'e2',
      name: 'Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 20, maxHp: 20, str: 7, mag: 0, skl: 6, spd: 5, luk: 2, def: 7, res: 1, mov: 5 }),
      x: 13,
      y: 6,
    },
  ],
};

export const LEVEL_2: LevelDefinition = {
  id: 'level-2',
  name: 'The Molten Pass',
  cols: 16,
  rows: 12,
  terrain: (() => {
    const terrain: { x: number; y: number; type: TerrainType }[] = [];
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        // Border walls
        if (x === 0 || x === 15 || y === 0 || y === 11) {
          terrain.push({ x, y, type: TerrainType.MOUNTAIN });
          continue;
        }
        // Central lava river
        if (x >= 6 && x <= 9 && y >= 3 && y <= 8) {
          terrain.push({ x, y, type: TerrainType.LAVA });
          continue;
        }
        // Cliff barriers on either side of the lava
        if ((x === 5 || x === 10) && y >= 2 && y <= 9) {
          terrain.push({ x, y, type: TerrainType.CLIFF });
          continue;
        }
        // Scattered forests
        if ((x + y) % 9 === 0) {
          terrain.push({ x, y, type: TerrainType.FOREST });
          continue;
        }
      }
    }
    return terrain;
  })(),
  units: [
    {
      id: 'p1',
      name: 'Rowan',
      faction: Faction.PLAYER,
      unitClass: UnitClass.LORD,
      stats: createStats({ hp: 24, maxHp: 24, str: 9, mag: 2, skl: 8, spd: 9, luk: 7, def: 7, res: 3, mov: 5 }),
      x: 2,
      y: 5,
    },
    {
      id: 'p2',
      name: 'Elara',
      faction: Faction.PLAYER,
      unitClass: UnitClass.MAGE,
      stats: createStats({ hp: 18, maxHp: 18, str: 1, mag: 10, skl: 7, spd: 8, luk: 6, def: 3, res: 8, mov: 5 }),
      x: 2,
      y: 6,
    },
    {
      id: 'p3',
      name: 'Sylvie',
      faction: Faction.PLAYER,
      unitClass: UnitClass.PEGASUS_KNIGHT,
      stats: createStats({ hp: 20, maxHp: 20, str: 7, mag: 2, skl: 8, spd: 11, luk: 6, def: 5, res: 5, mov: 7 }),
      x: 3,
      y: 4,
    },
    {
      id: 'e1',
      name: 'Bandit',
      faction: Faction.ENEMY,
      unitClass: UnitClass.BRIGAND,
      stats: createStats({ hp: 28, maxHp: 28, str: 10, mag: 0, skl: 5, spd: 6, luk: 3, def: 6, res: 1, mov: 5 }),
      x: 13,
      y: 4,
    },
    {
      id: 'e2',
      name: 'Soldier',
      faction: Faction.ENEMY,
      unitClass: UnitClass.SOLDIER,
      stats: createStats({ hp: 22, maxHp: 22, str: 8, mag: 0, skl: 7, spd: 6, luk: 2, def: 8, res: 1, mov: 5 }),
      x: 13,
      y: 6,
    },
    {
      id: 'e3',
      name: 'Archer',
      faction: Faction.ENEMY,
      unitClass: UnitClass.ARCHER,
      stats: createStats({ hp: 20, maxHp: 20, str: 7, mag: 0, skl: 8, spd: 7, luk: 4, def: 4, res: 2, mov: 5 }),
      x: 14,
      y: 5,
    },
  ],
};

export const LEVELS: LevelDefinition[] = [LEVEL_1, LEVEL_2];

export function getLevel(id: string): LevelDefinition | undefined {
  return LEVELS.find((l) => l.id === id);
}
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/levels/__tests__/LevelData.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/levels/LevelData.ts src/game/levels/__tests__/LevelData.test.ts
git commit -m "feat: add Level 1 and Level 2 data definitions"
```

---

## Task 10: Add level-loading method to `GameEngine`

**Objective:** Allow `GameEngine` to initialize from a `LevelDefinition`.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Test: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

Add to `GameEngine.test.ts`:

```typescript
import { getLevel } from '../levels/LevelData';

it('can load a level definition', () => {
  const level = getLevel('level-1')!;
  const engine = new GameEngine(level.cols, level.rows);
  engine.loadLevel(level);
  expect(engine.getAllUnits()).toHaveLength(level.units.length);
  expect(engine.grid.getTerrain(0, 0)).toBe('mountain');
});

it('can load level 2 with lava and cliffs', () => {
  const level = getLevel('level-2')!;
  const engine = new GameEngine(level.cols, level.rows);
  engine.loadLevel(level);
  const lavaTiles = level.terrain.filter((t) => t.type === TerrainType.LAVA);
  const cliffTiles = level.terrain.filter((t) => t.type === TerrainType.CLIFF);
  expect(lavaTiles.length).toBeGreaterThan(0);
  expect(cliffTiles.length).toBeGreaterThan(0);
  expect(engine.getAllUnits()).toHaveLength(level.units.length);
  const sylvie = engine.getUnit(3, 4);
  expect(sylvie).not.toBeNull();
  expect(sylvie!.unitClass).toBe(UnitClass.PEGASUS_KNIGHT);
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/game/__tests__/GameEngine.test.ts -v`
Expected: FAIL — `loadLevel` method does not exist

**Step 3: Write minimal implementation**

Add to `GameEngine.ts`:

```typescript
import { LevelDefinition } from './levels/LevelDefinition';

// Add method to GameEngine class:
loadLevel(level: LevelDefinition): void {
  // Clear existing units from grid tracking
  for (const unit of this.units) {
    this.grid.removeUnit(unit.gridX, unit.gridY);
  }
  this.units = [];

  // Set terrain
  for (const t of level.terrain) {
    this.setTerrain(t.x, t.y, t.type);
  }

  // Spawn units
  for (const u of level.units) {
    this.addUnit(u.id, u.name, u.faction, u.unitClass, u.stats, u.x, u.y);
  }
}
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/game/__tests__/GameEngine.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat: add loadLevel to GameEngine"
```

---

## Task 11: Update `BattleScene` rendering for new terrains

**Objective:** Add colors for lava and cliff tiles.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Identify the change location**

In `BattleScene.ts`, update `TERRAIN_COLORS`:

```typescript
const TERRAIN_COLORS: Record<string, number> = {
  plains: 0x8fbc8f,
  forest: 0x228b22,
  mountain: 0x808080,
  water: 0x4682b4,
  wall: 0x2f4f4f,
  lava: 0xff4500,
  cliff: 0xa0522d,
};
```

**Step 2: No test needed for rendering (manual verification)**

**Step 3: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: add terrain colors for lava and cliff"
```

---

## Task 12: Refactor `BattleScene` to use level loading

**Objective:** Replace hardcoded `populateMap` and `spawnUnits` with `loadLevel`.

**Files:**
- Modify: `src/scenes/BattleScene.ts`
- Modify: `src/game/index.ts` (export levels)

**Step 1: Write the refactor**

In `BattleScene.ts`:

```typescript
import { getLevel } from '../game/levels/LevelData';

// Replace populateMap() and spawnUnits() calls in create() with:
private loadLevel(levelId: string): void {
  const level = getLevel(levelId);
  if (!level) {
    throw new Error(`Level not found: ${levelId}`);
  }
  this.engine.loadLevel(level);
  this.syncTileColors();
  this.syncUnitSprites();
}
```

In `create()`:
```typescript
this.createGridVisuals();
this.loadLevel('level-2'); // or 'level-1'
this.setupInput();
this.createUI();
```

Remove `populateMap()` and `spawnUnits()` methods entirely.

**Step 2: Export levels from game barrel**

Update `src/game/index.ts`:
```typescript
export * from './levels';
```

**Step 3: Run all tests**

Run: `npm test`
Expected: All pass

**Step 4: Commit**

```bash
git add src/scenes/BattleScene.ts src/game/index.ts
git commit -m "refactor: BattleScene uses level loading system"
```

---

## Task 13: Add visual hazard indicator for lava tiles

**Objective:** Make lava tiles visually distinct with a subtle pulse or glow effect.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Add lava tile animation in `create()`**

After `syncTileColors()` in `loadLevel()`, add:

```typescript
// Animate lava tiles with subtle pulse
for (let y = 0; y < GRID_ROWS; y++) {
  for (let x = 0; x < GRID_COLS; x++) {
    if (this.engine.grid.getTerrain(x, y) === TerrainType.LAVA) {
      const rect = this.tileRects[y][x];
      this.tweens.add({
        targets: rect,
        alpha: { from: 1, to: 0.7 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
```

**Step 2: Manual browser verification**

Run: `npm run dev`
Open: http://localhost:5173
Check: Lava tiles pulse between bright and dim orange.

**Step 3: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: add lava tile pulse animation"
```

---

## Task 14: Add level selection to main menu (optional but recommended)

**Objective:** Allow the player to choose between Level 1 and Level 2.

**Files:**
- Modify: `src/scenes/MainMenuScene.ts`

**Step 1: Read `MainMenuScene.ts`**

Find where it transitions to `BattleScene`. Add a second button or change the existing flow to show level selection.

**Step 2: Modify to pass level ID**

```typescript
// In MainMenuScene, when starting the game:
this.scene.start('BattleScene', { levelId: 'level-2' });
```

In `BattleScene`, read the level ID from init data:

```typescript
private levelId = 'level-1';

init(data: { levelId?: string }): void {
  if (data?.levelId) {
    this.levelId = data.levelId;
  }
}
```

Then use `this.levelId` in `loadLevel()`.

**Step 3: Commit**

```bash
git add src/scenes/MainMenuScene.ts src/scenes/BattleScene.ts
git commit -m "feat: pass level ID from main menu to battle scene"
```

---

## Verification Checklist

- [ ] All `src/game/` tests pass (`npm test`)
- [ ] `LAVA` and `CLIFF` terrain types are defined with correct stats
- [ ] `pegasus_knight` has `isFlying === true`
- [ ] Flying units can traverse `CLIFF` at cost 1
- [ ] Non-flying units pay cost 4 for `CLIFF`
- [ ] `LAVA` deals 5 damage per phase transition
- [ ] `TerrainHazardEngine` caps damage to current HP (no overkill)
- [ ] `LevelDefinition` type exists and is used
- [ ] `LevelData.ts` contains both Level 1 and Level 2
- [ ] `GameEngine.loadLevel()` initializes grid + units from definition
- [ ] `BattleScene` renders lava tiles in orange with pulse animation
- [ ] `BattleScene` renders cliff tiles in brown
- [ ] No Phaser imports in `src/game/`

## Common Pitfalls

1. **Forgetting to update `src/game/index.ts` barrel export** — Always export new modules from the barrel so scenes can import them cleanly.

2. **Hardcoding terrain costs in multiple places** — Always use `getTerrainMoveCost(unit, terrain)`; never check `unit.isFlying` directly in `MoveRange` or `Pathfinder`.

3. **Applying hazards at the wrong time** — Hazards apply at phase transitions (via `endTurn()`), not on every move or every frame.

4. **Lava damage overkill** — `TerrainHazardEngine` must cap damage at `unit.stats.hp` so units go to 0 HP, not negative.

5. **Grid size mismatch** — Level 2 uses the same 16×12 grid as Level 1. If you change grid size, update `constants.ts` or make `BattleScene` dynamic.
