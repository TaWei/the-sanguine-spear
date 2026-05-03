# AGENTS.md — The Sanguine Spear

> Context file for AI coding agents. Read this at the start of every session before touching code.

## Project Overview

**The Sanguine Spear** is a Fire Emblem-inspired tactical RPG built with:
- **Phaser 3** (v3.80) — rendering and input
- **TypeScript** (v5.4) — all code
- **Vite** (v5.2) — dev server and bundler
- **Vitest** (v4.1) — test runner

**Repo location:** `~/workspace/the-sanguine-spear`
**Dev server:** `npm run dev` → http://localhost:5173
**Tests:** `npm test` (vitest run) or `npx vitest run <path>`
**Build:** `npm run build` → `dist/` (static files)

---

## The Golden Rule: Architecture Separation

```
src/game/     ← PURE LOGIC. Zero Phaser imports. 100% unit-testable.
src/scenes/   ← PHASER RENDERING. Thin shell. Delegates ALL decisions to src/game/.
src/entities/ ← DEPRECATED. Old Phaser wrappers. Not used by current BattleScene.
```

**No file in `src/game/` may import from `phaser`.** Any violation is a design failure.

The `BattleScene` creates a `GameEngine` instance and calls its methods. It does NOT implement game rules inline.

---

## Directory Structure

```
src/
  main.ts                        # Game bootstrap (Phaser config)
  constants.ts                   # Grid size, colors, enums
  types.ts                       # Legacy shared types (superseded by src/game/)
  scenes/
    BootScene.ts                 # Preload stub → MainMenuScene
    MainMenuScene.ts             # Title screen → BattleScene
    BattleScene.ts               # Renders grid, units, UI. Delegates to GameEngine.
  entities/                      # DEPRECATED — old prototype wrappers
    Tile.ts
    Unit.ts
  game/                          # PURE GAME ENGINE
    GameEngine.ts                # Facade composing all subsystems
    index.ts                     # Barrel export of entire engine
    map/
      Terrain.ts                 # TerrainType, TerrainData, TERRAIN_DEFS
      Grid.ts                    # 2D grid with terrain + unit placement
      Cursor.ts                  # Grid-bound cursor with clamping
      index.ts                   # Barrel export
      __tests__/                 # Vitest colocated tests
    units/
      Stats.ts                   # UnitStats, createStats() factory
      Unit.ts                    # Unit class: faction, stats, position, state
      Growth.ts                  # rollLevelUp() — pure growth rate rolling
      index.ts
      __tests__/
    movement/
      MoveRange.ts               # computeMoveRange() — Dijkstra with terrain
      index.ts
      __tests__/
    combat/
      Weapons.ts                 # WeaponType, WEAPON_DB, weapon triangle
      Formulas.ts                # Hit, avoid, crit, damage, 2RN true hit
      Engine.ts                  # CombatEngine.resolveCombat()
      AttackRange.ts             # computeAttackRange()
      index.ts
      __tests__/
    state/
      UnitState.ts               # FSM: Idle → Moving → Menu → Exhausted
      TurnManager.ts             # Phase cycling: Player → Enemy → Ally
      ActionQueue.ts             # FIFO action queue
      index.ts
      __tests__/
    ai/
      Targeting.ts               # scoreTarget(), pickBestTarget()
      Commander.ts               # planEnemyTurn() → Action[]
      index.ts
      __tests__/
    __tests__/
      smoke.test.ts              # Sanity check
      GameEngine.test.ts

docs/plans/
  README.md                      # Master plan overview
  00-test-infrastructure.md
  01-the-board.md                # Phase 1: Terrain, Grid, Cursor
  02-units-and-movement.md       # Phase 2: Unit, Stats, MoveRange
  03-game-loop.md                # Phase 3: TurnManager, UnitState, ActionQueue
  04-combat-and-stats.md         # Phase 4: Weapons, Formulas, CombatEngine
  05-enemy-ai.md                 # Phase 5: Targeting, Commander
  06-polish-and-deployment.md    # Phase 6: GameEngine, BattleScene refactor
```

---

## Game Constants

```typescript
// src/constants.ts
GAME_WIDTH  = 1024
GAME_HEIGHT = 768
TILE_SIZE   = 48
GRID_COLS   = 16
GRID_ROWS   = 12
```

---

## Game Engine API (GameEngine)

```typescript
class GameEngine {
  readonly grid: Grid;                // 16×12 by default
  readonly turnManager: TurnManager;  // starts at Player phase, turn 1

  constructor(cols: number, rows: number);

  addUnit(id, name, faction, unitClass, stats, gridX, gridY): Unit;
  getUnit(x, y): Unit | null;
  getUnitsByFaction(faction): Unit[];
  getAllUnits(): Unit[];
  getLiveUnits(): Unit[];

  getMoveRange(unit): Map<string, number>;  // key: "x,y", value: accumulated cost
  moveUnit(unit, x, y): void;               // updates grid placement
  setTerrain(x, y, type): void;

  endTurn(): void;                          // advances phase, runs enemy AI if needed
  getPendingActions(): Action[];            // dequeues all actions (call after enemy phase)
}
```

---

## Key Data Types

### Faction & UnitClass
```typescript
Faction: 'player' | 'enemy' | 'ally'
UnitClass: 'lord' | 'mercenary' | 'mage' | 'archer' | 'cavalry' | 'pegasus_knight' | 'soldier' | 'brigand'
```

### UnitStats
```typescript
interface UnitStats {
  hp: number; maxHp: number; str: number; mag: number;
  skl: number; spd: number; luk: number; def: number;
  res: number; mov: number;
}
```
Created via `createStats(input)` — clamps `hp` to `[0, maxHp]`, defaults `maxHp` to `hp`.

### Unit
```typescript
class Unit {
  readonly id: string;
  readonly name: string;
  readonly faction: Faction;
  readonly unitClass: UnitClass;
  readonly state: UnitState;

  get stats(): Readonly<UnitStats>;
  get gridX(): number;
  get gridY(): number;
  get hasActed(): boolean;      // derived from state.isExhausted()
  get isAlive(): boolean;       // hp > 0
  get isPlayer(): boolean;
  get isEnemy(): boolean;

  moveTo(x, y): void;
  takeDamage(amount): void;     // clamps hp to 0
  resetState(): void;           // returns UnitState to IDLE
}
```

### TerrainType & TerrainData
```typescript
TerrainType: 'plains' | 'forest' | 'mountain' | 'water' | 'wall'

// TERRAIN_DEFS lookup:
plains:   { moveCost: 1,  defenseBonus: 0, avoidBonus: 0 }
forest:   { moveCost: 2,  defenseBonus: 1, avoidBonus: 20 }
mountain: { moveCost: 99, defenseBonus: 0, avoidBonus: 0 }  // impassable
water:    { moveCost: 99, defenseBonus: 0, avoidBonus: 0 }  // impassable
wall:     { moveCost: 99, defenseBonus: 0, avoidBonus: 0 }  // impassable
```

### WeaponType & WeaponData
```typescript
WeaponType: 'sword' | 'axe' | 'lance' | 'bow' | 'magic'

// WEAPON_DB entries:
'Iron Sword' → { type: 'sword',  mt: 5, hit: 90, crit: 0, minRange: 1, maxRange: 1, usesMagic: false }
'Iron Axe'   → { type: 'axe',    mt: 8, hit: 70, crit: 0, minRange: 1, maxRange: 1, usesMagic: false }
'Iron Lance' → { type: 'lance',  mt: 6, hit: 80, crit: 0, minRange: 1, maxRange: 1, usesMagic: false }
'Iron Bow'   → { type: 'bow',    mt: 6, hit: 85, crit: 0, minRange: 2, maxRange: 2, usesMagic: false }
'Fire'       → { type: 'magic',  mt: 5, hit: 90, crit: 0, minRange: 1, maxRange: 2, usesMagic: true  }
```

Weapon triangle: **Sword > Axe > Lance > Sword**
- Advantage: `+1 mt, +15 hit`
- Disadvantage: `-1 mt, -15 hit`
- Bow and Magic are neutral vs everything

### GamePhase
```typescript
GamePhase: 'player' | 'enemy' | 'ally'
// Cycle: Player → Enemy → Ally → Player ( increments turnNumber on wrap )
```

### UnitState
```typescript
UNIT_STATE: { IDLE, MOVING, MENU, EXHAUSTED }
// Valid transitions:
//   IDLE → MOVING
//   MOVING → MENU, IDLE
//   MENU → EXHAUSTED, IDLE
//   EXHAUSTED → (none)
```

### Action & ActionType
```typescript
ActionType: 'move' | 'attack' | 'wait'
interface Action {
  type: ActionType;
  actor: Unit;
  x?: number; y?: number;           // for MOVE
  targetX?: number; targetY?: number; // for ATTACK
}
```

---

## Combat System (Fire Emblem GBA-style)

### Formulas
```typescript
calcHitRate(weaponHit, skl, luk)      = weaponHit + skl*2 + floor(luk/2)
calcAvoid(spd, luk, terrainAvoid=0)   = spd*2 + luk + terrainAvoid
calcDisplayHit(hitRate, avoid)        = clamp(hitRate - avoid, 0, 100)
calcCritRate(weaponCrit, skl)         = weaponCrit + floor(skl/2)
calcCritAvoid(luk)                    = luk
calcDamage(atkStat, weaponMt, defStat) = max(1, atkStat + weaponMt - defStat)
```

### 2RN True Hit
```typescript
rollTrueHit(displayHit, rng): boolean
// Rolls two RNs 0–99, averages them, returns avg < displayHit
// Makes high hit rates more reliable, low hit rates less reliable
```

### Combat Resolution
```typescript
CombatEngine.resolveCombat(attacker, defender, attWeapon, defWeapon, rng=Math.random)
// 1. Attacker attacks defender
// 2. If defender alive AND in counter range, defender counterattacks
// 3. Critical hits deal 3× damage
// 4. Damage applied via unit.takeDamage()
// Returns: { log: CombatLogEntry[], attackerDied, defenderDied }
```

---

## Enemy AI

### Targeting
```typescript
scoreTarget(attacker, target, weapon, grid): number
// Returns 0 for dead / same-faction / ally targets
// Score = damage + killBonus(50 if damage >= hp) + (maxHp - hp)*2

pickBestTarget(attacker, targets, weapon, grid): Unit | null
```

### Commander
```typescript
Commander.planEnemyTurn(enemies, players): Action[]
// For each living enemy:
//   1. Compute move range (Dijkstra)
//   2. Find reachable player targets
//   3. Pick best target
//   4. Find best approach tile (closest in move range that's in weapon range)
//   5. Emit MOVE action (if needed) + ATTACK action
// Weapon fallback by class: mage→Fire, brigand→Iron Axe, soldier→Iron Lance, default→Iron Sword
```

---

## BattleScene Rendering Layer

The scene creates `GameEngine(GRID_COLS, GRID_ROWS)` and uses it exclusively.

**Visual sync pattern:** `syncUnitSprites()` destroys all unit sprites and rebuilds them from `engine.getAllUnits()`. This is called after any state change (move, combat, end turn).

**Input flow:**
1. Click tile → `handleTileClick(gx, gy)`
2. If unit selected and tile in move range + empty → tween sprite, then `engine.moveUnit()`, mark acted
3. If clicked un-acted player unit → select it, `showMoveRange()`
4. End Turn button → `engine.endTurn()` → if enemy phase, `executeEnemyActions()`

**Enemy action execution:** Sequential async processing via `processNext(index)`:
- MOVE actions: tween sprite, then `engine.moveUnit()`
- ATTACK actions: `CombatEngine.resolveCombat()`, then visual effects (shake/flash/fade)
- After all actions: `engine.endTurn()` back to player

**Visual effects:**
- Normal hit: `cameras.main.shake(100, 0.005)` + target alpha flash 0.3
- Critical: `cameras.main.shake(200, 0.01)` + `cameras.main.flash(200, white)`
- Death: tween alpha to 0 over 500ms
- Movement: tween over 300ms

---

## Testing Conventions

- **Runner:** Vitest. Tests are colocated: `src/game/**/__tests__/*.test.ts`
- **TDD:** Write failing test first, then minimal implementation.
- **No Phaser in tests:** All `src/game/` tests import only from `src/game/`.
- **Deterministic RNG:** Tests that need randomness use a factory:
  ```typescript
  function makeRng(sequence: number[]): () => number {
    let i = 0;
    return () => sequence[i++] ?? 0;
  }
  ```
- **Run single file:** `npx vitest run src/game/combat/__tests__/Engine.test.ts`
- **Run all:** `npm test`

---

## Barrel Exports

Every module has an `index.ts` for clean imports:
```typescript
import { GameEngine } from '../game';
import { Grid, TerrainType } from '../game/map';
import { Unit, Faction, createStats } from '../game/units';
import { computeMoveRange } from '../game/movement';
import { CombatEngine, WEAPON_DB } from '../game/combat';
import { TurnManager, ActionType } from '../game/state';
import { Commander, pickBestTarget } from '../game/ai';
```

---

## Development Workflow

```bash
cd ~/workspace/the-sanguine-spear

# Dev server
npm run dev              # http://localhost:5173

# Tests
npm test                 # all tests
npx vitest run <path>    # single file
npx vitest               # watch mode

# Type check
npx tsc --noEmit

# Build
npm run build            # → dist/
npm run preview          # serve dist/
```

---

## Known Limitations & TODOs

1. **No save/load system** — everything is in-memory.
2. **No action menu** — units auto-exhaust after moving. No attack/wait/item menu.
3. **No inventory system** — weapons are hardcoded by class in `Commander.getWeapon()` and `BattleScene.getWeaponForUnit()`.
4. **No ally phase AI** — ally units exist as a faction but have no AI.
5. **No pathfinding for AI movement** — `findBestApproach` picks closest valid tile, not an actual path.
6. **No animated sprites** — units are colored rectangles with HP bars.
7. **No audio** — no sound effects or music.
8. **No map objectives** — only rout-enemy style combat.
9. **Level-up is not wired to units** — `rollLevelUp()` is a pure function but not integrated into `Unit`.
10. **BattleScene spawns the same 4 units every time** — no map loading or chapter system.
11. **Old entity wrappers** (`src/entities/Tile.ts`, `src/entities/Unit.ts`) are unused. Safe to delete.
12. **No deployment docs for actual hosting** — `DEPLOY.md` and `.htaccess` exist but untested.

---

## Linear Tickets

This repo was implemented via Linear tickets JER-118 through JER-146 under the JER team. If you see references to these in commit messages or plans, that's the source.

---

## Quick Reference: Adding a New Feature

1. If it's game logic → goes in `src/game/<module>/`. Write test first.
2. If it's rendering/visual → goes in `src/scenes/` or new Phaser code.
3. Never put Phaser imports in `src/game/`.
4. Always add barrel export to the module's `index.ts`.
5. Run `npm test` before committing.
6. Run `npx tsc --noEmit` if you modified scene code.
