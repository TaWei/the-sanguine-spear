# Project Plan: The Sanguine Spear — Missing Features

**Approach:** Test-Driven Development (TDD)  
**Pattern:** Red → Green → Refactor for every feature module  
**Test Framework:** Vitest (already configured)  
**Golden Rule:** `src/game/` remains pure logic — zero Phaser imports in game code. All rendering lives in `src/scenes/`.

---

## Table of Contents

1. [Development Principles](#development-principles)
2. [Sprint 1: Map Objectives Engine](#sprint-1-map-objectives-engine)
3. [Sprint 2: Fog of War](#sprint-2-fog-of-war)
4. [Sprint 3: Ally Phase AI](#sprint-3-ally-phase-ai)
5. [Sprint 4: Talk / Recruitment System](#sprint-4-talk--recruitment-system)
6. [Sprint 5: Preparation Screen + Shop Integration](#sprint-5-preparation-screen--shop-integration)
7. [Sprint 6: Turn-Based Reinforcements](#sprint-6-turn-based-reinforcements)
8. [Sprint 7: Village & Fort Tiles](#sprint-7-village--fort-tiles)
9. [Sprint 8: Support System](#sprint-8-support-system)
10. [Sprint 9: Weapon Rank WExp Accumulation](#sprint-9-weapon-rank-wexp-accumulation)
11. [Sprint 10: World Map](#sprint-10-world-map)
12. [Sprint 11: Animated Sprite Sheets](#sprint-11-animated-sprite-sheets)
13. [Sprint 12: Audio System](#sprint-12-audio-system)
14. [Appendix A: TDD Workflow Template](#appendix-a-tdd-workflow-template)
15. [Appendix B: Integration Testing Strategy](#appendix-b-integration-testing-strategy)

---

## Development Principles

### Test-First Workflow

Every module follows the TDD cycle:

```
1. RED    → Write a failing test that describes the behavior
2. GREEN  → Write the minimum implementation to make the test pass
3. REFACTOR → Clean up duplication, improve names, extract helpers
4. REPEAT
```

### File Naming Conventions

```
src/game/<feature>/
  <Module>.ts              # Production code
  __tests__/
    <Module>.test.ts       # Unit tests for the module
    <Module>.edge.test.ts  # Edge case tests (optional)
  index.ts                 # Barrel exports
```

### Testing Rules

| Rule | Rationale |
|------|-----------|
| **No Phaser in game tests** | `src/game/` must remain pure; mock any rendering dependencies |
| **Mock `Math.random()` explicitly** | Use seeded `rng` functions for deterministic combat tests |
| **Test behavior, not implementation** | Assert on outputs and state changes, not internal method calls |
| **One assertion per concern** | Multiple `expect()` calls are fine if they test one logical concept |
| **Use `describe` blocks for states** | e.g., `describe('when unit is on seize tile', () => {...})` |

### Testing Utilities

Create shared test helpers in `src/game/__tests__/testUtils.ts`:

```typescript
// Test factories — avoid verbose object creation in every test
export function createTestUnit(options?: Partial<Unit>): Unit { ... }
export function createTestGrid(cols: number, rows: number): Grid { ... }
export function seededRng(seed: number): () => number { ... }
```

---

## Sprint 1: Map Objectives Engine

**Duration:** 3–4 days  
**Goal:** Replace the single "defeat all enemies" victory condition with full objective support.

### 1.1 Tests: `src/game/objectives/__tests__/SeizeObjective.test.ts`

**RED Phase — Write these tests first:**

```typescript
describe('SeizeObjective', () => {
  it('returns victory when a player unit steps on the seize tile', () => {
    // Arrange: Lord unit adjacent to throne tile
    // Act: move unit onto throne
    // Assert: check() returns { victory: true, defeat: false }
  });

  it('returns ongoing when no player unit is on the seize tile', () => {
    // Arrange: throne exists, no player on it
    // Assert: check() returns ongoing
  });

  it('returns ongoing when a non-lord unit is on the seize tile', () => {
    // Arrange: soldier (not Lord) on throne
    // Assert: check() returns ongoing (only Lords can seize)
  });

  it('returns ongoing when an enemy unit is on the seize tile', () => {
    // Arrange: enemy on throne
    // Assert: check() returns ongoing
  });
});
```

### 1.2 Tests: `src/game/objectives/__tests__/DefendObjective.test.ts`

```typescript
describe('DefendObjective', () => {
  it('returns victory after surviving N turns', () => {
    // Arrange: defend for 7 turns, currently on turn 7
    // Assert: check() returns victory
  });

  it('returns defeat when the defend target dies', () => {
    // Arrange: defend target (e.g., NPC) is dead
    // Assert: check() returns defeat
  });

  it('returns ongoing before the turn limit', () => {
    // Arrange: defend for 7 turns, currently on turn 3
    // Assert: check() returns ongoing
  });
});
```

### 1.3 Tests: `src/game/objectives/__tests__/EscapeObjective.test.ts`

```typescript
describe('EscapeObjective', () => {
  it('returns victory when the escape unit reaches the escape tile', () => {
    // Arrange: designated unit on escape tile
    // Assert: check() returns victory
  });

  it('returns ongoing when the escape unit has not reached the tile', () => {
    // Arrange: escape tile exists, unit not on it
    // Assert: check() returns ongoing
  });
});
```

### 1.4 Tests: `src/game/objectives/__tests__/LevelObjectives.test.ts` (update)

Update the existing test to verify the **composite objective pattern**:

```typescript
describe('LevelObjectives with multiple objectives', () => {
  it('returns victory if ANY objective reports victory', () => { ... });
  it('returns defeat if ANY objective reports defeat', () => { ... });
  it('returns ongoing if all objectives report ongoing', () => { ... });
});
```

### 1.5 Implementation

Create these modules in order (each one makes the corresponding tests pass):

```
src/game/objectives/
  Objective.ts              # Base interface: check(): ObjectiveResult
  SeizeObjective.ts         # Checks if Lord is on throne tile
  DefendObjective.ts        # Checks turn counter + target HP
  EscapeObjective.ts        # Checks if escape unit reached tile
  LevelObjectives.ts        # Composite: aggregates all objectives (refactor existing)
```

**Refactor `LevelDefinition.ts`** to accept `objectives: ObjectiveConfig[]`:

```typescript
export interface ObjectiveConfig {
  type: 'rout' | 'seize' | 'defend' | 'escape';
  // type-specific params
  seizeTile?: { x: number; y: number };
  defendTargetId?: string;
  defendTurns?: number;
  escapeUnitId?: string;
  escapeTile?: { x: number; y: number };
}
```

### 1.6 Integration: `BattleScene.ts`

After `LevelObjectives` passes all tests:

- Add `TerrainType.THRONE`, `TerrainType.GATE`, `TerrainType.ESCAPE`
- In `handleTileClick`: after moving a unit, check `engine.checkObjectives()`
- In `endTurn`: check objectives after each phase transition
- Wire `showVictoryScreen()` / `showDefeatScreen()` to new objective types

### 1.7 Acceptance Criteria

```
✅ Seize: Lord steps on throne → immediate victory screen
✅ Defend: Survive 7 turns → victory screen on turn 7 start
✅ Defend: Target dies before turn 7 → defeat screen
✅ Escape: Designated unit reaches escape tile → victory
✅ Rout: All enemies dead → victory (existing behavior preserved)
```

---

## Sprint 2: Fog of War

**Duration:** 4–5 days  
**Goal:** Implement visibility system so only tiles within unit sight range are visible.

### 2.1 Tests: `src/game/fog/__tests__/VisibilityMap.test.ts`

**RED Phase:**

```typescript
describe('VisibilityMap', () => {
  it('marks tiles within sight range as VISIBLE', () => {
    // Arrange: unit at (5,5) with sight=3
    // Act: computeVisibility(unit, grid)
    // Assert: tile (5,5) is VISIBLE, tile (8,5) is VISIBLE, tile (9,5) is UNSEEN
  });

  it('reduces sight range in forest terrain', () => {
    // Arrange: unit at (5,5), forest at (6,5) blocks line of sight
    // Assert: tile beyond forest is UNSEEN
  });

  it('extends sight range for units on forts', () => {
    // Arrange: unit on fort tile
    // Assert: sight range +2 compared to plains
  });

  it('tracks previously seen tiles as DIMMED', () => {
    // Arrange: unit sees tile, then moves away
    // Assert: previously seen tile is DIMMED, not UNSEEN
  });

  it('merges visibility from all player units', () => {
    // Arrange: two player units with overlapping sight
    // Assert: union of both sight ranges is visible
  });

  it('hides enemy units on UNSEEN tiles', () => {
    // Arrange: enemy on unseen tile
    // Assert: enemy is not visible in unit list, not targetable
  });
});
```

### 2.2 Tests: `src/game/fog/__tests__/FogOfWar.test.ts` (integration)

```typescript
describe('FogOfWar integration', () => {
  it('enemy on unseen tile cannot be attacked', () => {
    // Arrange: enemy at (10,10), player sight only reaches (8,8)
    // Act: player tries to attack
    // Assert: enemy is not in target list
  });

  it('enemy on dimmed tile is visible but not updated', () => {
    // Arrange: enemy was seen, then unit moved away (tile now DIMMED)
    // Assert: enemy sprite shows last known position, not current position
  });
});
```

### 2.3 Implementation

```
src/game/fog/
  FogTileState.ts           # enum: VISIBLE | DIMMED | UNSEEN
  VisibilityMap.ts          # Computes visibility from unit positions
  SightRange.ts             # sight = base + terrain modifier + class modifier
  FogOfWar.ts               # Orchestrates: merges unit visibility, tracks state
  index.ts
```

**Key design decisions:**
- `SightRange.compute(unit, terrainAtUnit)` → returns integer sight radius
- Forests reduce sight by 1; forts increase by 2; mountains increase by 3
- Flying units (Pegasus Knight) ignore terrain sight penalties
- `FogOfWar.update(liveUnits, grid)` — recomputed each time a unit moves or phase changes

### 2.4 Integration: `BattleScene.ts`

- In `syncUnitSprites()`: skip rendering enemies on `UNSEEN` tiles
- In `showMoveRange()`: dim tiles outside visibility instead of hiding them
- In `handleTileClick()`: filter `getAdjacentEnemies()` to only visible enemies
- In `showEnemyPreview()`: don't show stats for enemies on `UNSEEN` tiles
- Add fog overlay graphics (darkened tiles for `UNSEEN`, slightly dimmed for `DIMMED`)

### 2.5 Acceptance Criteria

```
✅ Unseen tiles are darkened; seen-but-not-currently-visible tiles are slightly dimmed
✅ Enemies on unseen tiles don't render and can't be targeted
✅ Enemy threat range is not visible in fog
✅ Moving a unit updates visibility in real time
✅ Ally/enemy phases use their own visibility (enemies can see their own units)
```

---

## Sprint 3: Ally Phase AI

**Duration:** 4–5 days  
**Goal:** Ally units move and attack during the Ally phase, just like enemies do in Enemy phase.

### 3.1 Tests: `src/game/ai/__tests__/AllyCommander.test.ts`

**RED Phase:**

```typescript
describe('AllyCommander', () => {
  it('plans movement for all ally units', () => {
    // Arrange: 2 ally units, enemies nearby
    // Act: planAllyTurn(allies, enemies)
    // Assert: returns 2 move actions
  });

  it('allies attack enemies in range', () => {
    // Arrange: ally adjacent to enemy
    // Act: planAllyTurn
    // Assert: attack action included for that pair
  });

  it('allies avoid attacking player units', () => {
    // Arrange: ally adjacent to both player and enemy
    // Act: planAllyTurn
    // Assert: targets only enemy, never player
  });

  it('allies heal player units if they have staves', () => {
    // Arrange: ally cleric with staff, injured player nearby
    // Act: planAllyTurn
    // Assert: heal action targeting injured player
  });

  it('allies move toward enemies if none in range', () => {
    // Arrange: ally far from enemies
    // Act: planAllyTurn
    // Assert: move action toward nearest enemy
  });
});
```

### 3.2 Implementation

```
src/game/ai/
  AllyCommander.ts          # New: plans ally actions
  Commander.ts              # Refactor: extract shared logic into BaseCommander
```

**Refactor `Commander.ts`:**

Extract common targeting/movement logic into a `BaseCommander` or utility functions:

```typescript
// Shared between Enemy and Ally commanders
function scoreTarget(attacker: Unit, target: Unit, weapon: WeaponData): number { ... }
function findApproachTile(unit: Unit, target: Unit, grid: Grid): { x: number; y: number } { ... }
```

Then:

```typescript
// AllyCommander.ts
export class AllyCommander {
  planAllyTurn(allies: Unit[], enemies: Unit[], players: Unit[]): Action[] {
    // Allies target enemies, avoid players
    // Prioritize: attack enemies > heal players > move toward enemies
  }
}
```

### 3.3 Integration: `GameEngine.ts`

In `endTurn()`:

```typescript
if (this.turnManager.isAllyPhase()) {
  const allies = this.getUnitsByFaction(Faction.ALLY);
  const enemies = this.getUnitsByFaction(Faction.ENEMY);
  const players = this.getUnitsByFaction(Faction.PLAYER);
  const actions = this.allyCommander.planAllyTurn(allies, enemies, players);
  for (const action of actions) {
    this.actionQueue.enqueue(action);
  }
}
```

### 3.4 Integration: `BattleScene.ts`

In `triggerEndTurn()`, after Enemy phase → Ally phase:

```typescript
// Enemy → Ally
const report1 = this.engine.endTurn();
// ... execute ally actions via executeAllyActions() (mirror of executeEnemyActions())
```

### 3.5 Acceptance Criteria

```
✅ Ally units move during Ally phase
✅ Ally units attack enemies in range
✅ Ally units heal injured player units with staves
✅ Ally units never attack player units
✅ Ally actions animate smoothly (same pacing as enemy actions)
```

---

## Sprint 4: Talk / Recruitment System

**Duration:** 3–4 days  
**Goal:** Allow player units to recruit enemies via the "Talk" command.

### 4.1 Tests: `src/game/recruitment/__tests__/TalkEngine.test.ts`

**RED Phase:**

```typescript
describe('TalkEngine', () => {
  it('allows talk when player unit is adjacent to recruitable enemy', () => {
    // Arrange: player unit adjacent to enemy with talk trigger
    // Assert: canTalk(player, enemy) === true
  });

  it('prevents talk when units are not adjacent', () => {
    // Arrange: player unit 2 tiles away from recruitable enemy
    // Assert: canTalk(player, enemy) === false
  });

  it('prevents talk when enemy has no talk trigger', () => {
    // Arrange: player adjacent to normal enemy (no talk data)
    // Assert: canTalk(player, enemy) === false
  });

  it('recruits enemy on talk, switching faction to PLAYER', () => {
    // Arrange: valid talk conditions
    // Act: talk(player, enemy)
    // Assert: enemy.faction === Faction.PLAYER
  });

  it('marks talk as consumed (one-shot)', () => {
    // Arrange: talk already happened
    // Act: canTalk again
    // Assert: returns false (talk is one-time)
  });

  it('gives recruited enemy their starting inventory', () => {
    // Arrange: enemy with no items
    // Act: recruit
    // Assert: enemy.inventory has items (from recruit config)
  });
});
```

### 4.2 Tests: `src/game/cutscene/__tests__/TalkTrigger.test.ts`

```typescript
describe('TalkTrigger', () => {
  it('fires when a talk action occurs', () => {
    // Arrange: trigger with condition.type === 'on_talk'
    // Act: resolve talk
    // Assert: trigger evaluates to true
  });
});
```

### 4.3 Implementation

```
src/game/recruitment/
  TalkEngine.ts             # canTalk(), talk(), tracks consumed talks
  RecruitmentData.ts        # Defines recruit rewards (items, gold, etc.)
  index.ts

src/game/cutscene/
  // Add to TriggerType: 'on_talk'
```

**Update `LevelDefinition.ts`:**

```typescript
export interface TalkConfig {
  recruiterId: string;      // Player unit who can talk
  recruitId: string;        // Enemy unit who can be recruited
  recruitItems?: Item[];    // Items given on recruitment
  oneShot: boolean;
}

export interface LevelDefinition {
  // ... existing fields
  talks?: TalkConfig[];
}
```

**Update `CutsceneTrigger.ts`:**

```typescript
export type TriggerCondition =
  | { type: 'on_first_combat' }
  | { type: 'on_kill'; victimId: string }
  | { type: 'on_talk'; recruiterId: string; recruitId: string }
  | { type: 'on_boss_encounter'; bossId: string }
  // ...
```

### 4.4 Integration: `BattleScene.ts`

In `showPostMoveMenu()`:

```typescript
// After checking adjacent enemies, check for talkable enemies
const talkableEnemies = this.engine.getTalkableEnemies(unit);
if (talkableEnemies.length > 0) {
  // Add "[ Talk ]" button to action menu
}
```

In `handleMenuInput()`:

```typescript
if (this.battleMenu.state === MenuState.CHOOSE_TALK_TARGET) {
  // Handle talk target selection
  this.engine.talk(unit, clickedUnit);
  // Play cutscene if triggered
  this.playCutsceneIfTriggered(
    { eventType: 'on_talk', recruiterId: unit.id, recruitId: clickedUnit.id },
    () => { /* exhaust unit, sync sprites */ }
  );
}
```

### 4.5 Acceptance Criteria

```
✅ "Talk" appears in action menu when adjacent to recruitable enemy
✅ Talking switches enemy faction to PLAYER
✅ Recruited unit gains their defined starting items
✅ Talk is one-time (can't recruit same enemy twice)
✅ Cutscene fires on talk if configured
✅ Talking exhausts the player unit
```

---

## Sprint 5: Preparation Screen + Shop Integration

**Duration:** 5–7 days  
**Goal:** Add a pre-chapter screen where players manage units, inventory, and shop.

### 5.1 Tests: `src/game/prep/__tests__/PrepInventory.test.ts`

**RED Phase:**

```typescript
describe('PrepInventory', () => {
  it('allows equipping a weapon from inventory', () => {
    // Arrange: unit with 2 swords in inventory
    // Act: equip(0)
    // Assert: unit.equippedWeaponIndex === 0
  });

  it('prevents equipping an unusable weapon', () => {
    // Arrange: sword unit trying to equip a lance they can't use
    // Act: equip(lanceIndex)
    // Assert: throws or returns error
  });

  it('allows unequipping the current weapon', () => {
    // Arrange: unit with equipped weapon
    // Act: unequip()
    // Assert: unit.equippedWeaponIndex === null
  });

  it('allows trading items between units in prep', () => {
    // Arrange: two units in the army
    // Act: trade item from A to B
    // Assert: A lost item, B gained item
  });
});
```

### 5.2 Tests: `src/game/prep/__tests__/PrepShop.test.ts`

```typescript
describe('PrepShop', () => {
  it('allows buying items with army gold', () => {
    // Arrange: shop stock has Iron Sword for 500g, army has 1000g
    // Act: buy('Iron Sword', targetUnit)
    // Assert: army gold = 500g, unit has Iron Sword
  });

  it('prevents buying when army gold is insufficient', () => {
    // Arrange: item costs 500g, army has 200g
    // Assert: buy() returns { success: false, reason: 'insufficient_gold' }
  });

  it('allows selling items from unit inventory', () => {
    // Arrange: unit has Iron Sword (sell price: 250g)
    // Act: sell(unit, itemIndex)
    // Assert: unit lost item, army gold +250
  });
});
```

### 5.3 Implementation

```
src/game/prep/
  PrepInventory.ts          # Equip/unequip/trade in prep
  PrepShop.ts              # Buy/sell with army gold (reuses ShopEngine)
  PrepArmy.ts              # Manages the army roster between chapters
  index.ts
```

**Refactor `Unit.ts`:**

```typescript
// Add to Unit class
private _equippedWeaponIndex: number | null = null;
get equippedWeaponIndex(): number | null { return this._equippedWeaponIndex; }
set equippedWeaponIndex(index: number | null) { this._equippedWeaponIndex = index; }
```

**Update `SaveData.ts`:**

```typescript
export interface SaveData {
  // ... existing fields
  armyGold: number;
  convoy: Item[];           // Shared item pool
}
```

**Update `SaveManager.ts`:**

Add `loadArmy()` and `saveArmy()` for persistent army state between chapters.

### 5.4 Integration: New Scene `PrepScene.ts`

```
src/scenes/
  PrepScene.ts             # Pre-chapter management UI
```

**Scene flow:**

```
MainMenu → WorldMap → PrepScene → BattleScene
                              ↑___________↓ (after chapter: return to WorldMap)
```

**PrepScene features:**
- Unit roster list (click to select)
- Inventory panel for selected unit (equip/unequip)
- Shop panel (buy/sell)
- Convoy panel (withdraw/deposit)
- Mission briefing panel (objective, enemy preview)
- "Begin Battle" button

### 5.5 Integration: `MainMenuScene.ts`

Add "Continue" option that loads the latest save and goes to `WorldMapScene`.

### 5.6 Acceptance Criteria

```
✅ Prep screen appears before each chapter
✅ Can equip/unequip weapons per unit
✅ Can buy items with army gold in prep shop
✅ Can sell items for half price
✅ Can trade items between units
✅ Can view mission objective and enemy preview
✅ Army gold and convoy persist between chapters
✅ "Begin Battle" transitions to BattleScene with army state
```

---

## Sprint 6: Turn-Based Reinforcements

**Duration:** 3–4 days  
**Goal:** Enemy and ally units spawn mid-battle on specific turns.

### 6.1 Tests: `src/game/reinforcements/__tests__/ReinforcementGroup.test.ts`

**RED Phase:**

```typescript
describe('ReinforcementGroup', () => {
  it('spawns units on the specified turn', () => {
    // Arrange: group configured to spawn on turn 3
    // Act: checkSpawn(turnNumber = 3)
    // Assert: returns spawnable units
  });

  it('does not spawn before the specified turn', () => {
    // Arrange: group for turn 3
    // Act: checkSpawn(turnNumber = 2)
    // Assert: returns empty array
  });

  it('is one-shot by default (does not respawn)', () => {
    // Arrange: group spawned on turn 3
    // Act: checkSpawn(turnNumber = 3) again
    // Assert: returns empty array
  });

  it('spawns units at configured positions', () => {
    // Arrange: group with 2 Brigands at (0,5) and (0,6)
    // Act: spawn
    // Assert: units placed at exact coordinates
  });

  it('spawns units on nearest empty tile if spawn is occupied', () => {
    // Arrange: spawn tile occupied
    // Act: spawn
    // Assert: unit placed on adjacent empty tile
  });
});
```

### 6.2 Tests: `src/game/reinforcements/__tests__/ReinforcementEngine.test.ts`

```typescript
describe('ReinforcementEngine', () => {
  it('processes reinforcements at start of enemy phase', () => {
    // Arrange: turn 3, enemy reinforcements configured
    // Act: startEnemyPhase()
    // Assert: reinforcements added to grid and action queue
  });

  it('enemy reinforcements act immediately on spawn turn', () => {
    // Arrange: enemy reinforcements spawn on turn 3
    // Act: endTurn() triggers enemy phase
    // Assert: spawned enemies get actions planned by Commander
  });
});
```

### 6.3 Implementation

```
src/game/reinforcements/
  ReinforcementGroup.ts     # Defines a group of units + spawn turn + positions
  ReinforcementEngine.ts    # Processes spawn conditions, handles placement
  index.ts
```

**Update `LevelDefinition.ts`:**

```typescript
export interface ReinforcementConfig {
  groupId: string;
  spawnTurn: number;
  faction: Faction;
  units: {
    id: string;
    name: string;
    unitClass: UnitClass;
    stats: UnitStats;
    spawnX: number;
    spawnY: number;
  }[];
  oneShot: boolean;
}

export interface LevelDefinition {
  // ... existing fields
  reinforcements?: ReinforcementConfig[];
}
```

**Update `GameEngine.ts`:**

```typescript
private reinforcementEngine = new ReinforcementEngine();

loadLevel(def: LevelDefinition): void {
  // ... existing code
  this.reinforcementEngine.register(def.reinforcements ?? []);
}

endTurn(): HazardReport {
  // After advancing phase, check reinforcements
  const newUnits = this.reinforcementEngine.checkSpawn(
    this.turnManager.turnNumber,
    this.turnManager.currentPhase,
  );
  for (const unit of newUnits) {
    this.units.push(unit);
    this.grid.placeUnit(unit, unit.gridX, unit.gridY);
  }
  // ... rest of endTurn logic
}
```

### 6.4 Integration: `BattleScene.ts`

- In `syncUnitSprites()`: newly spawned units should animate in (fade from transparent)
- In `executeEnemyActions()`: if reinforcements spawned this turn, include them in the action list

### 6.5 Acceptance Criteria

```
✅ Reinforcements spawn on the exact configured turn
✅ Reinforcements appear at configured positions (or nearest empty tile)
✅ Enemy reinforcements act immediately on their spawn turn
✅ Ally reinforcements appear during ally phase
✅ Reinforcements are one-shot by default
✅ Spawn animation plays (fade in)
```

---

## Sprint 7: Village & Fort Tiles

**Duration:** 2–3 days  
**Goal:** Add interactive village and fort tiles that grant rewards.

### 7.1 Tests: `src/game/village/__tests__/VillageEngine.test.ts`

**RED Phase:**

```typescript
describe('VillageEngine', () => {
  it('allows visiting when player unit steps on village tile', () => {
    // Arrange: player unit on village
    // Assert: canVisit(unit, x, y) === true
  });

  it('prevents visiting when enemy unit steps on village', () => {
    // Arrange: enemy unit on village
    // Assert: canVisit(unit, x, y) === false
  });

  it('prevents revisiting an already-visited village', () => {
    // Arrange: village already visited
    // Assert: canVisit() === false
  });

  it('grants gold reward on visit', () => {
    // Arrange: village with goldReward = 3000
    // Act: visit()
    // Assert: army gold +3000
  });

  it('grants item reward on visit', () => {
    // Arrange: village with itemReward = 'Elixir'
    // Act: visit()
    // Assert: visiting unit inventory has Elixir
  });

  it('triggers a cutscene on visit', () => {
    // Arrange: village with cutsceneId
    // Act: visit()
    // Assert: cutscene trigger fired
  });
});
```

### 7.2 Tests: `src/game/village/__tests__/FortEngine.test.ts`

```typescript
describe('FortEngine', () => {
  it('restores HP to full when unit ends turn on fort', () => {
    // Arrange: unit at 5/20 HP, standing on fort
    // Act: endTurn()
    // Assert: unit HP = 20/20
  });

  it('provides defense bonus while on fort', () => {
    // Arrange: unit on fort
    // Assert: terrainData.defenseBonus > 0
  });
});
```

### 7.3 Implementation

```
src/game/village/
  VillageEngine.ts          # Visit logic, rewards, tracking visited state
  FortEngine.ts             # HP restore, stat bonuses
  index.ts
```

**Update `TerrainType`:**

```typescript
export enum TerrainType {
  // ... existing types
  VILLAGE = 'village',
  FORT = 'fort',
  THRONE = 'throne',
  ESCAPE = 'escape',
}
```

**Update `Terrain.ts` data:**

```typescript
// Add terrain stats
{
  village: { moveCost: 1, defenseBonus: 1, avoidBonus: 10, hazardDamage: 0 },
  fort:    { moveCost: 1, defenseBonus: 2, avoidBonus: 20, hpRestore: 20 },
  throne:  { moveCost: 1, defenseBonus: 3, avoidBonus: 30, hpRestore: 0 },
}
```

**Update `LevelDefinition.ts`:**

```typescript
export interface VillageConfig {
  x: number;
  y: number;
  goldReward?: number;
  itemReward?: string;
  cutsceneId?: string;
}

export interface LevelDefinition {
  // ... existing fields
  villages?: VillageConfig[];
}
```

### 7.4 Integration: `BattleScene.ts`

In `handleTileClick()`:

```typescript
if (terrain === TerrainType.VILLAGE && !clickedUnit?.hasActed) {
  // Show "Visit" option in action menu
}
```

In `triggerEndTurn()`:

```typescript
// Apply fort healing
for (const unit of this.engine.getLiveUnits()) {
  if (this.engine.grid.getTerrain(unit.gridX, unit.gridY) === TerrainType.FORT) {
    unit.heal(terrainData.hpRestore);
  }
}
```

### 7.5 Acceptance Criteria

```
✅ Villages grant gold/items on first visit
✅ Villages can only be visited once
✅ Villages trigger cutscenes if configured
✅ Forts restore HP at end of turn
✅ Forts provide enhanced defense/avoid bonuses
✅ Village sprite changes to "visited" state after visit
```

---

## Sprint 8: Support System

**Duration:** 5–6 days  
**Goal:** Implement support ranks (C/B/A) with combat bonuses.

### 8.1 Tests: `src/game/support/__tests__/SupportEngine.test.ts`

**RED Phase:**

```typescript
describe('SupportEngine', () => {
  it('accumulates support points when units end turn adjacent', () => {
    // Arrange: units A and B end turn adjacent
    // Act: processSupportPoints(turnEndUnits)
    // Assert: supportPoints[A-B] increased by base amount
  });

  it('ranks up from C to B at threshold', () => {
    // Arrange: A-B at 70 points (C rank threshold = 80)
    // Act: add 15 points
    // Assert: rank = B, points = 85
  });

  it('ranks up from B to A at threshold', () => {
    // Arrange: A-B at 150 points (B threshold = 160)
    // Act: add 15 points
    // Assert: rank = A
  });

  it('provides hit bonus in combat for adjacent supported units', () => {
    // Arrange: A attacks enemy, B is adjacent to A with B-rank support
    // Act: getSupportBonus(A, B)
    // Assert: hit bonus = 5 (B-rank bonus)
  });

  it('provides avoid bonus when supported unit is attacked', () => {
    // Arrange: Enemy attacks A, B is adjacent to A with A-rank
    // Act: getSupportBonus(A, B)
    // Assert: avoid bonus = 10 (A-rank bonus)
  });

  it('caps support points per chapter', () => {
    // Arrange: units already gained max points this chapter
    // Act: end turn adjacent again
    // Assert: no additional points gained
  });
});
```

### 8.2 Implementation

```
src/game/support/
  SupportRank.ts            # enum: NONE | C | B | A | S
  SupportData.ts            # Tracks points and ranks between unit pairs
  SupportEngine.ts          # Point accumulation, rank thresholds, bonus calculation
  SupportBonus.ts           # Hit/avoid/damage bonuses per rank
  index.ts
```

**Support Point Thresholds (FE GBA style):**

```typescript
const RANK_THRESHOLDS = {
  C: 80,
  B: 160,
  A: 240,
};
```

**Support Bonuses (FE GBA style):**

```typescript
const RANK_BONUSES = {
  C: { hit: 2, avoid: 2, damage: 0 },
  B: { hit: 5, avoid: 5, damage: 1 },
  A: { hit: 10, avoid: 10, damage: 2 },
};
```

**Update `CombatEngine.ts`:**

```typescript
// In hit calculation
const supportBonus = this.supportEngine.getCombatBonus(attacker, defender);
finalHit += supportBonus.hit;
finalAvoid += supportBonus.avoid;
```

**Update `SaveData.ts`:**

```typescript
export interface SaveData {
  // ... existing fields
  supportData: SupportData[];  // Persist support points between chapters
}
```

### 8.3 Integration: `BattleScene.ts`

- In `showPostMoveMenu()`: if a unit has available support partners, show "Support" button
- In `showStatusWindow()`: display support rank and partner list
- In combat preview: add support bonus indicators

### 8.4 Acceptance Criteria

```
✅ Support points accumulate when units end turns adjacent
✅ Support ranks up at thresholds (C→B→A)
✅ Adjacent support provides hit/avoid/damage bonuses in combat
✅ Support bonuses display in combat preview
✅ Support data persists between chapters via save/load
✅ Support conversations fire at rank-up (cutscene trigger)
```

---

## Sprint 9: Weapon Rank WExp Accumulation

**Duration:** 2–3 days  
**Goal:** Award weapon experience per combat use, enabling rank progression.

### 9.1 Tests: `src/game/combat/__tests__/WeaponRankExp.test.ts`

**RED Phase:**

```typescript
describe('WeaponRankExp', () => {
  it('awards WExp on a successful hit', () => {
    // Arrange: unit with sword rank D (0 WExp), hits enemy with sword
    // Act: resolveCombat()
    // Assert: unit.swordWExp === 1
  });

  it('awards bonus WExp on a kill', () => {
    // Arrange: unit kills enemy with sword
    // Act: resolveCombat()
    // Assert: unit.swordWExp === 3 (1 for hit + 2 for kill)
  });

  it('ranks up from D to C at threshold', () => {
    // Arrange: unit at 49 WExp (D rank, threshold = 50)
    // Act: award 2 WExp
    // Assert: rank === C, WExp === 51
  });

  it('prevents using weapons above current rank', () => {
    // Arrange: unit with C rank, trying to use B-rank weapon
    // Act: canWield()
    // Assert: returns false
  });

  it('applies rank bonus to hit/crit', () => {
    // Arrange: unit with A-rank sword
    // Act: getWeaponRankBonus('sword', rank)
    // Assert: hit bonus = 5, crit bonus = 5
  });
});
```

### 9.2 Implementation

**Refactor `WeaponRank.ts`:**

```typescript
export enum WeaponRankLevel {
  NONE = '-',
  E = 'E',
  D = 'D',
  C = 'C',
  B = 'B',
  A = 'A',
  S = 'S',
}

const WEXP_THRESHOLDS: Record<WeaponRankLevel, number> = {
  [WeaponRankLevel.NONE]: 0,
  [WeaponRankLevel.E]: 1,
  [WeaponRankLevel.D]: 50,
  [WeaponRankLevel.C]: 100,
  [WeaponRankLevel.B]: 150,
  [WeaponRankLevel.A]: 200,
  [WeaponRankLevel.S]: 251,
};

export function getRankFromWExp(wexp: number): WeaponRankLevel { ... }
export function getWExpGain(hit: boolean, kill: boolean): number { ... }
export function getRankBonus(rank: WeaponRankLevel): { hit: number; crit: number } { ... }
```

**Update `Unit.ts`:**

```typescript
// Add per-unit weapon experience tracking
weaponExp: Record<WeaponType, number> = {
  sword: 0, axe: 0, lance: 0, bow: 0, magic: 0,
};

getWeaponRank(type: WeaponType): WeaponRankLevel {
  return getRankFromWExp(this.weaponExp[type]);
}
```

**Update `CombatEngine.ts`:**

```typescript
// After combat resolution
if (result.attackerHit) {
  const gain = getWExpGain(true, result.defenderDied);
  attacker.weaponExp[attWeapon.type] += gain;
}
if (result.defenderCounterHit) {
  const gain = getWExpGain(true, result.attackerDied);
  defender.weaponExp[defWeapon.type] += gain;
}
```

**Update `Formulas.ts`:**

```typescript
export function computeHit(unit: Unit, weapon: WeaponData): number {
  const baseHit = /* existing formula */;
  const rankBonus = getRankBonus(unit.getWeaponRank(weapon.type));
  return baseHit + rankBonus.hit;
}
```

### 9.3 Acceptance Criteria

```
✅ WExp awarded per hit (+1) and kill (+3 total)
✅ Weapon rank increases at thresholds (E→D→C→B→A→S)
✅ Cannot equip weapons above current rank
✅ Rank bonuses apply to hit and crit in combat formulas
✅ WExp persists between chapters via save/load
✅ WExp display in status window
```

---

## Sprint 10: World Map

**Duration:** 4–5 days  
**Goal:** Add a world map for chapter selection and progression tracking.

### 10.1 Tests: `src/game/worldmap/__tests__/WorldMap.test.ts`

**RED Phase:**

```typescript
describe('WorldMap', () => {
  it('unlocks next chapter after clearing current', () => {
    // Arrange: chapter 1 cleared
    // Act: getAvailableChapters()
    // Assert: chapters 1 and 2 are available
  });

  it('locks future chapters', () => {
    // Arrange: only chapter 1 cleared
    // Act: getAvailableChapters()
    // Assert: chapter 3 is locked
  });

  it('tracks chapter clear status', () => {
    // Arrange: chapter 1 completed
    // Assert: chapterStatus['chapter-1'] === 'CLEARED'
  });

  it('allows replaying cleared chapters', () => {
    // Arrange: chapter 1 cleared
    // Act: selectChapter('chapter-1')
    // Assert: transitions to prep with no rewards
  });
});
```

### 10.2 Tests: `src/game/save/__tests__/WorldMapSave.test.ts`

```typescript
describe('WorldMapSave', () => {
  it('saves chapter progress', () => {
    // Arrange: player cleared chapter 2
    // Act: save()
    // Assert: saveData.chapterProgress includes 'chapter-2'
  });

  it('loads chapter progress on restore', () => {
    // Arrange: save with chapter 2 cleared
    // Act: restore(saveData)
    // Assert: chapter 2 is marked cleared, chapter 3 is available
  });
});
```

### 10.3 Implementation

```
src/game/worldmap/
  WorldMap.ts               # Chapter nodes, unlock logic, progress tracking
  ChapterNode.ts            # Individual chapter data + status
  index.ts

src/scenes/
  WorldMapScene.ts          # Phaser scene: clickable map nodes
```

**Update `SaveData.ts`:**

```typescript
export interface SaveData {
  // ... existing fields
  chapterProgress: Record<string, 'LOCKED' | 'AVAILABLE' | 'CLEARED'>;
  currentChapterId: string;
}
```

**Update `MainMenuScene.ts`:**

```typescript
// "New Game" → WorldMapScene (chapter 1)
// "Continue" → WorldMapScene (latest available chapter)
```

**Update `BattleScene.ts`:**

```typescript
// In showVictoryScreen()
// Instead of auto-advancing, return to WorldMapScene
this.scene.start('WorldMapScene', { chapterCleared: this.currentLevelId });
```

### 10.4 Acceptance Criteria

```
✅ World map displays chapter nodes in a connected graph
✅ Cleared chapters are marked with a checkmark
✅ Available chapters are clickable
✅ Locked chapters are grayed out
✅ Clicking a chapter transitions to PrepScene
✅ Chapter progress persists in save data
✅ Can replay cleared chapters
```

---

## Sprint 11: Animated Sprite Sheets

**Duration:** 7–10 days  
**Goal:** Replace colored rectangles with actual character sprites.

### 11.1 Tests: `src/game/sprites/__tests__/SpriteAtlas.test.ts`

**RED Phase:**

```typescript
describe('SpriteAtlas', () => {
  it('returns the correct sprite key for a unit class', () => {
    // Arrange: Lord class, faction PLAYER
    // Act: getSpriteKey('lord', 'player', 'idle')
    // Assert: returns 'lord-player-idle'
  });

  it('maps weapon type to animation variant', () => {
    // Arrange: Mercenary with sword
    // Act: getAttackAnimation('mercenary', 'sword')
    // Assert: returns sword attack animation key
  });

  it('falls back to generic sprite when class sprite is missing', () => {
    // Arrange: unknown class
    // Act: getSpriteKey('unknown', 'player', 'idle')
    // Assert: returns 'generic-player-idle'
  });
});
```

### 11.2 Tests: `src/game/sprites/__tests__/UnitAnimator.test.ts`

```typescript
describe('UnitAnimator', () => {
  it('plays idle animation by default', () => {
    // Arrange: unit sprite created
    // Assert: sprite plays 'idle' animation
  });

  it('plays attack animation on combat start', () => {
    // Arrange: unit in combat
    // Act: playAttack()
    // Assert: sprite plays 'attack' animation, then returns to idle
  });

  it('plays death animation when HP reaches 0', () => {
    // Arrange: unit dies
    // Act: playDeath()
    // Assert: sprite plays 'death' animation, then is destroyed
  });

  it('flips sprite horizontally when facing left', () => {
    // Arrange: unit moving left
    // Act: moveTo(x - 1, y)
    // Assert: sprite.scaleX = -1
  });
});
```

### 11.3 Implementation

```
src/game/sprites/
  SpriteAtlas.ts            # Maps unit class + faction + state → sprite key
  UnitAnimator.ts           # Manages animation states (idle/move/attack/hit/death)
  SpriteDirection.ts        # LEFT | RIGHT facing
  index.ts

public/assets/sprites/
  units/
    lord-player.png         # Sprite sheet: idle, move, attack, hit, death frames
    lord-enemy.png
    mage-player.png
    // ... etc
```

**Refactor `BattleScene.syncUnitSprites()`:**

Replace rectangle + text containers with `UnitAnimator`-managed sprite objects.

```typescript
// Before: colored rectangles
const body = this.add.rectangle(0, 0, TILE_SIZE - 8, TILE_SIZE - 8, color);

// After: sprite from atlas
const sprite = this.add.sprite(px, py, atlas.getSpriteKey(unit));
this.unitAnimators.set(unit.id, new UnitAnimator(sprite));
```

### 11.4 Asset Requirements

| Asset | Frames | Description |
|-------|--------|-------------|
| `idle` | 2 | Breathing/standing animation |
| `move` | 4 | Walking animation (N/S/E/W) |
| `attack` | 6 | Weapon swing animation |
| `hit` | 2 | Taking damage (flash + recoil) |
| `death` | 4 | Death animation (fade out last frame) |
| `dodge` | 2 | Avoiding an attack |
| `crit` | 8 | Critical hit animation (extended attack) |

### 11.5 Acceptance Criteria

```
✅ Units display class-specific sprites instead of colored rectangles
✅ Idle animation plays when unit is stationary
✅ Movement animation plays during path movement
✅ Attack animation plays during combat
✅ Death animation plays before unit is removed
✅ Sprites face the correct direction based on movement/attack target
✅ Critical hits play extended attack animation
✅ Enemy preview shows unit sprite instead of rectangle
```

---

## Sprint 12: Audio System

**Duration:** 3–4 days  
**Goal:** Add music, SFX, and ambient audio.

### 12.1 Tests: `src/game/audio/__tests__/AudioManager.test.ts`

**RED Phase:**

```typescript
describe('AudioManager', () => {
  it('plays battle music when combat starts', () => {
    // Arrange: AudioManager initialized
    // Act: playBattleMusic()
    // Assert: battleMusic.isPlaying === true
  });

  it('fades music when victory screen appears', () => {
    // Arrange: battle music playing
    // Act: playVictoryFanfare()
    // Assert: battle music volume fades to 0, victory fanfare starts
  });

  it('plays hit SFX on successful attack', () => {
    // Arrange: combat with hit
    // Act: playHitSFX()
    // Assert: hit sound plays
  });

  it('plays miss SFX on missed attack', () => {
    // Arrange: combat with miss
    // Act: playMissSFX()
    // Assert: miss sound plays
  });

  it('mutes all audio when mute is toggled', () => {
    // Arrange: audio playing
    // Act: toggleMute()
    // Assert: all audio volume = 0
  });

  it('respects volume settings', () => {
    // Arrange: volume = 0.5
    // Act: play any sound
    // Assert: sound volume === 0.5
  });
});
```

### 12.2 Implementation

```
src/game/audio/
  AudioManager.ts           # Central audio controller
  MusicPlaylist.ts          # Map scene → background music
  SFXLibrary.ts             # Event → sound effect mapping
  index.ts
```

**Integration points in `BattleScene.ts`:**

```typescript
// In create()
this.audioManager.playMapMusic(this.currentLevelId);

// In startBattleMode()
this.audioManager.playBattleMusic();
this.audioManager.playAttackSFX(attacker.unitClass);

// In runBattleAnimation()
if (entry?.hit) {
  this.audioManager.playHitSFX(entry.critical);
} else {
  this.audioManager.playMissSFX();
}

// In showVictoryScreen()
this.audioManager.playVictoryFanfare();

// In showDefeatScreen()
this.audioManager.playDefeatMusic();

// In triggerEndTurn()
this.audioManager.playPhaseChangeSFX(this.engine.turnManager.currentPhase);
```

**Asset Requirements:**

| Category | Files | Trigger |
|----------|-------|---------|
| Map music | `map-1.mp3`, `map-2.mp3`, `map-3.mp3` | Level start |
| Battle music | `battle.mp3` | Combat start |
| Victory | `victory.mp3` | All enemies defeated |
| Defeat | `defeat.mp3` | All player units dead |
| SFX: Hit | `hit.mp3`, `hit-crit.mp3` | Attack lands |
| SFX: Miss | `miss.mp3` | Attack misses |
| SFX: Menu | `menu-open.mp3`, `menu-select.mp3`, `menu-cancel.mp3` | UI interactions |
| SFX: Phase | `phase-player.mp3`, `phase-enemy.mp3` | Turn phase change |
| SFX: Level up | `level-up.mp3` | Level up animation |

### 12.3 Acceptance Criteria

```
✅ Map music plays on level start, loops seamlessly
✅ Battle music plays during combat
✅ Victory fanfare plays on victory
✅ Hit/miss SFX plays per attack result
✅ Critical hits play enhanced SFX
✅ Menu SFX on all UI interactions
✅ Phase change SFX on turn transitions
✅ Volume and mute settings persist
✅ Audio fades smoothly between tracks
```

---

## Appendix A: TDD Workflow Template

Use this template for every module in every sprint.

### Step 1: Create the Test File

```typescript
// src/game/<feature>/__tests__/<Module>.test.ts
import { describe, it, expect } from 'vitest';

describe('<Module>', () => {
  it('should <expected behavior>', () => {
    // Arrange
    const input = ...;

    // Act
    const result = moduleUnderTest.method(input);

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Step 2: Run the Test (RED)

```bash
npx vitest run src/game/<feature>/__tests__/<Module>.test.ts
# Expected: FAIL — module doesn't exist yet
```

### Step 3: Create Minimal Implementation (GREEN)

```typescript
// src/game/<feature>/<Module>.ts
export class Module {
  method(input: InputType): OutputType {
    // Minimum code to pass the test
    return expectedValue;
  }
}
```

### Step 4: Run the Test (GREEN)

```bash
npx vitest run src/game/<feature>/__tests__/<Module>.test.ts
# Expected: PASS
```

### Step 5: Add More Tests

Repeat steps 1–4 for edge cases:

```typescript
it('should handle empty input', () => { ... });
it('should throw on invalid input', () => { ... });
it('should return default when not found', () => { ... });
```

### Step 6: Refactor

```typescript
// Extract helpers, rename variables, remove duplication
// Re-run tests after every change to ensure nothing breaks
```

### Step 7: Export via Barrel

```typescript
// src/game/<feature>/index.ts
export { Module } from './Module';
```

### Step 8: Integration

Only after all unit tests pass, integrate into `GameEngine.ts` or `BattleScene.ts`.

---

## Appendix B: Integration Testing Strategy

### Layer 1: Unit Tests (per module)

```
Every .ts file in src/game/ has a corresponding .test.ts file
Run: npx vitest run src/game/<feature>/__tests__/
```

### Layer 2: Feature Integration Tests

```
Test interaction between 2–3 related modules
Example: src/game/objectives/__tests__/LevelObjectives.integration.test.ts
Run: npx vitest run src/game/objectives/__tests__/*.integration.test.ts
```

### Layer 3: Game Engine Smoke Tests

```
Test full engine workflows
Example: src/game/__tests__/GameEngine.test.ts (already exists)
Run: npx vitest run src/game/__tests__/GameEngine.test.ts
```

### Layer 4: Scene Smoke Tests

```
Test Phaser scene initialization (minimal, since Phaser requires DOM)
Example: src/scenes/__tests__/BattleSceneState.test.ts (already exists)
```

### Pre-Commit Checklist

```bash
npm run lint          # ESLint check
npm run format:check  # Prettier check
npm test              # All Vitest tests
npx tsc --noEmit      # TypeScript type check
```

---

## Estimated Timeline

| Sprint | Feature | Duration | Cumulative |
|--------|---------|----------|------------|
| 1 | Map Objectives | 3–4 days | 3–4 days |
| 2 | Fog of War | 4–5 days | 7–9 days |
| 3 | Ally Phase AI | 4–5 days | 11–14 days |
| 4 | Talk / Recruitment | 3–4 days | 14–18 days |
| 5 | Prep Screen + Shop | 5–7 days | 19–25 days |
| 6 | Reinforcements | 3–4 days | 22–29 days |
| 7 | Village & Fort | 2–3 days | 24–32 days |
| 8 | Support System | 5–6 days | 29–38 days |
| 9 | Weapon Rank WExp | 2–3 days | 31–41 days |
| 10 | World Map | 4–5 days | 35–46 days |
| 11 | Animated Sprites | 7–10 days | 42–56 days |
| 12 | Audio System | 3–4 days | 45–60 days |

**Total Estimated Duration: 6–8 weeks** (assuming 1 developer, full-time)

**Parallelizable work:**
- Sprites (Sprint 11) can begin once Sprint 1–2 are done
- Audio (Sprint 12) can begin once Sprint 3–4 are done
- Support system (Sprint 8) and Weapon Rank (Sprint 9) can be done in parallel
