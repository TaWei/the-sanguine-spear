# Phase 6: Polish and Deployment

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Wire the pure game engine to the Phaser rendering layer, add visual polish (animations, effects, juice), and set up deployment.

**Architecture:** The existing Phaser scenes (`BattleScene`, `MainMenuScene`, `BootScene`) are refactored to delegate all game logic to the `src/game/` engine. The `BattleScene` becomes a thin rendering shell that reads state from the engine and translates user input into engine commands. No game logic lives in Phaser code — it's all in `src/game/`.

**Tech Stack:** Phaser 3, TypeScript, Vite

**Prerequisite:** Phase 5 complete.

---

### Task 6.1: Create the GameEngine facade

**Objective:** A single `GameEngine` class in `src/game/` that composes all subsystems (Grid, TurnManager, CombatEngine, Commander) into one unified API. The Phaser layer talks only to this facade.

**Files:**
- Create: `src/game/GameEngine.ts`
- Create: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/__tests__/GameEngine.test.ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Unit, Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { TerrainType } from '../map/Terrain';

describe('GameEngine', () => {
  it('initializes with a grid of specified size', () => {
    const engine = new GameEngine(16, 12);
    expect(engine.grid.cols).toBe(16);
    expect(engine.grid.rows).toBe(12);
  });

  it('starts in player phase', () => {
    const engine = new GameEngine(10, 8);
    expect(engine.turnManager.isPlayerPhase()).toBe(true);
  });

  it('can add units and query them', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.gridX).toBe(2);
    expect(unit.gridY).toBe(5);
    expect(engine.getUnit(2, 5)).toBe(unit);
  });

  it('can get all units by faction', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 7, 5);

    expect(engine.getUnitsByFaction(Faction.PLAYER)).toHaveLength(1);
    expect(engine.getUnitsByFaction(Faction.ENEMY)).toHaveLength(1);
  });

  it('can compute move range for a unit', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 3 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    const range = engine.getMoveRange(unit);
    expect(range.has('5,4')).toBe(true);
  });

  it('can move a unit and update grid', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    engine.moveUnit(unit, 4, 7);
    expect(unit.gridX).toBe(4);
    expect(unit.gridY).toBe(7);
    expect(engine.getUnit(4, 7)).toBe(unit);
    expect(engine.getUnit(2, 5)).toBeNull();
  });

  it('can advance turns and reset units', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.hasActed = true;
    engine.endTurn();
    expect(unit.hasActed).toBe(false);
  });

  it('runs enemy AI on enemy phase', () => {
    const engine = new GameEngine(10, 8);
    const pStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const eStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats, 6, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats, 5, 5);

    engine.endTurn(); // player → enemy
    const actions = engine.getPendingActions();
    expect(actions.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/GameEngine.ts
import { Grid } from './map/Grid';
import { TerrainType } from './map/Terrain';
import { Unit, Faction, UnitClass } from './units/Unit';
import { UnitStats, createStats } from './units/Stats';
import { TurnManager } from './state/TurnManager';
import { ActionQueue, Action, ActionType } from './state/ActionQueue';
import { computeMoveRange } from './movement/MoveRange';
import { CombatEngine } from './combat/Engine';
import { WEAPON_DB } from './combat/Weapons';
import { Commander } from './ai/Commander';

export class GameEngine {
  readonly grid: Grid;
  readonly turnManager: TurnManager;
  private units: Unit[] = [];
  private actionQueue: ActionQueue;
  private combatEngine: CombatEngine;
  private commander: Commander;

  constructor(cols: number, rows: number) {
    this.grid = new Grid(cols, rows);
    this.turnManager = new TurnManager();
    this.actionQueue = new ActionQueue();
    this.combatEngine = new CombatEngine(this.grid);
    this.commander = new Commander(this.grid, WEAPON_DB);
  }

  addUnit(
    id: string, name: string, faction: Faction, unitClass: UnitClass,
    stats: UnitStats, gridX: number, gridY: number,
  ): Unit {
    const unit = new Unit(id, name, faction, unitClass, stats, gridX, gridY);
    this.units.push(unit);
    this.grid.placeUnit(unit, gridX, gridY);
    return unit;
  }

  getUnit(x: number, y: number): Unit | null {
    return this.grid.getUnit(x, y);
  }

  getUnitsByFaction(faction: Faction): Unit[] {
    return this.units.filter(u => u.faction === faction);
  }

  getAllUnits(): Unit[] {
    return this.units;
  }

  getLiveUnits(): Unit[] {
    return this.units.filter(u => u.isAlive);
  }

  getMoveRange(unit: Unit): Map<string, number> {
    return computeMoveRange(unit, this.grid);
  }

  moveUnit(unit: Unit, x: number, y: number): void {
    const oldX = unit.gridX;
    const oldY = unit.gridY;
    this.grid.removeUnit(oldX, oldY);
    unit.moveTo(x, y);
    this.grid.placeUnit(unit, x, y);
  }

  setTerrain(x: number, y: number, type: TerrainType): void {
    this.grid.setTerrain(x, y, type);
  }

  endTurn(): void {
    const liveUnits = this.getLiveUnits();
    this.turnManager.advancePhase(liveUnits);

    if (this.turnManager.isEnemyPhase()) {
      const enemies = this.getUnitsByFaction(Faction.ENEMY);
      const players = this.getUnitsByFaction(Faction.PLAYER);
      const actions = this.commander.planEnemyTurn(enemies, players);
      for (const action of actions) {
        this.actionQueue.enqueue(action);
      }
      // Auto-end enemy phase after queuing actions (for now)
      // In the real game, actions would be executed with animations
      // For the Phaser layer, it'll process these actions one by one
    }
  }

  getPendingActions(): Action[] {
    const actions: Action[] = [];
    while (!this.actionQueue.isEmpty()) {
      const a = this.actionQueue.dequeue();
      if (a) actions.push(a);
    }
    return actions;
  }
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat: add GameEngine facade composing all subsystems"
```

---

### Task 6.2: Refactor BattleScene to use GameEngine

**Objective:** Replace the inline game logic in `BattleScene` with delegation to `GameEngine`. The scene becomes a pure rendering layer.

**Files:**
- Modify: `src/scenes/BattleScene.ts`
- Modify: `src/entities/Unit.ts` (rename or modify to be a visual-only wrapper)
- Modify: `src/entities/Tile.ts`

**Approach:**

The current `BattleScene` mixes logic (movement range, unit selection, phase management) with rendering (Phaser graphics). The refactor:

1. `BattleScene` creates a `GameEngine` instance
2. On `create()`, it syncs the visual grid from `engine.grid`
3. Click handlers call `engine.getMoveRange()`, `engine.moveUnit()`, `engine.endTurn()`
4. Enemy phase actions from `engine.getPendingActions()` are executed with simple tweens

The existing `src/entities/Unit.ts` and `src/entities/Tile.ts` become visual-only wrappers around the game engine's data. Or they can be kept as-is but updated to read from the engine.

**Step 1: Write the refactored BattleScene**

```typescript
// src/scenes/BattleScene.ts
import Phaser from 'phaser';
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from '../constants';
import { GameEngine } from '../game/GameEngine';
import { Unit, Faction, UnitClass } from '../game/units/Unit';
import { createStats } from '../game/units/Stats';
import { TerrainType } from '../game/map/Terrain';
import { WEAPON_DB } from '../game/combat/Weapons';
import { CombatEngine } from '../game/combat/Engine';

const TERRAIN_COLORS: Record<string, number> = {
  plains: 0x8fbc8f, forest: 0x228b22, mountain: 0x808080,
  water: 0x4682b4, wall: 0x2f4f4f,
};

const FACTION_COLORS: Record<string, number> = {
  player: 0x3498db, enemy: 0xe74c3c, ally: 0x2ecc71,
};

export class BattleScene extends Phaser.Scene {
  private engine!: GameEngine;
  private tileRects: Phaser.GameObjects.Rectangle[][] = [];
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private moveGraphics!: Phaser.GameObjects.Graphics;
  private selectedUnit: Unit | null = null;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor() { super({ key: 'BattleScene' }); }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.offsetX = (this.cameras.main.width - GRID_COLS * TILE_SIZE) / 2;
    this.offsetY = (this.cameras.main.height - GRID_ROWS * TILE_SIZE) / 2;

    this.engine = new GameEngine(GRID_COLS, GRID_ROWS);
    this.moveGraphics = this.add.graphics();

    this.createGridVisuals();
    this.populateMap();
    this.spawnUnits();
    this.setupInput();
    this.createUI();
  }

  private createGridVisuals(): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      this.tileRects[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        const px = this.offsetX + x * TILE_SIZE;
        const py = this.offsetY + y * TILE_SIZE;
        const rect = this.add.rectangle(
          px + TILE_SIZE / 2, py + TILE_SIZE / 2,
          TILE_SIZE - 2, TILE_SIZE - 2,
          TERRAIN_COLORS.plains,
        );
        rect.setStrokeStyle(1, 0x1a1a2e);
        rect.setInteractive({ useHandCursor: true });
        this.tileRects[y][x] = rect;
      }
    }
  }

  private populateMap(): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (x === 0 || x === GRID_COLS - 1 || y === 0 || y === GRID_ROWS - 1) {
          this.engine.setTerrain(x, y, TerrainType.MOUNTAIN);
        } else if ((x + y) % 7 === 0) {
          this.engine.setTerrain(x, y, TerrainType.FOREST);
        } else if ((x * y) % 11 === 0) {
          this.engine.setTerrain(x, y, TerrainType.WATER);
        }
      }
    }
    this.syncTileColors();
  }

  private syncTileColors(): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const terrain = this.engine.grid.getTerrain(x, y);
        const color = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.plains;
        const rect = this.tileRects[y][x];
        if (rect) rect.setFillStyle(color);
      }
    }
  }

  private spawnUnits(): void {
    const pStats1 = createStats({ hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const pStats2 = createStats({ hp: 16, maxHp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5 });
    const eStats1 = createStats({ hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const eStats2 = createStats({ hp: 20, maxHp: 20, str: 7, mag: 0, skl: 6, spd: 5, luk: 2, def: 7, res: 1, mov: 5 });

    this.engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats1, 2, 5);
    this.engine.addUnit('p2', 'Elara', Faction.PLAYER, UnitClass.MAGE, pStats2, 3, 6);
    this.engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats1, 12, 4);
    this.engine.addUnit('e2', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER, eStats2, 13, 6);

    this.syncUnitSprites();
  }

  private syncUnitSprites(): void {
    // Clear old sprites
    for (const sprite of this.unitSprites.values()) sprite.destroy();
    this.unitSprites.clear();

    for (const unit of this.engine.getAllUnits()) {
      if (!unit.isAlive) continue;
      const color = FACTION_COLORS[unit.faction] ?? 0xffffff;
      const px = this.offsetX + unit.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = this.offsetY + unit.gridY * TILE_SIZE + TILE_SIZE / 2;

      const body = this.add.rectangle(0, 0, TILE_SIZE - 8, TILE_SIZE - 8, color);
      body.setAlpha(unit.hasActed ? 0.5 : 1);
      const label = this.add.text(0, TILE_SIZE / 2 + 2, unit.name.slice(0, 3), {
        fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5);

      const container = this.add.container(px, py, [body, label]);

      // HP bar
      const hpRatio = unit.stats.hp / unit.stats.maxHp;
      const hpBg = this.add.rectangle(0, -TILE_SIZE / 2 + 4, TILE_SIZE - 4, 4, 0x000000);
      const hpBar = this.add.rectangle(
        -(TILE_SIZE - 4) / 2 + ((TILE_SIZE - 4) * hpRatio) / 2,
        -TILE_SIZE / 2 + 4,
        (TILE_SIZE - 4) * hpRatio,
        4,
        hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf1c40f : 0xe74c3c,
      );
      container.add([hpBg, hpBar]);

      this.unitSprites.set(unit.id, container);
    }
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const gx = Math.floor((pointer.x - this.offsetX) / TILE_SIZE);
      const gy = Math.floor((pointer.y - this.offsetY) / TILE_SIZE);
      if (!this.engine.grid.isInBounds(gx, gy)) return;
      this.handleTileClick(gx, gy);
    });
  }

  private handleTileClick(gx: number, gy: number): void {
    if (!this.engine.turnManager.isPlayerPhase()) return;

    const clickedUnit = this.engine.getUnit(gx, gy);

    // If we have a selected unit and clicked a valid move tile
    if (this.selectedUnit) {
      const range = this.engine.getMoveRange(this.selectedUnit);
      const key = `${gx},${gy}`;
      if (range.has(key) && !clickedUnit) {
        this.engine.moveUnit(this.selectedUnit, gx, gy);
        this.moveGraphics.clear();
        this.selectedUnit.hasActed = true;
        this.selectedUnit = null;
        this.syncUnitSprites();
        return;
      }
    }

    // Select a player unit
    if (clickedUnit && clickedUnit.isPlayer && !clickedUnit.hasActed) {
      this.selectedUnit = clickedUnit;
      this.showMoveRange(clickedUnit);
    }
  }

  private showMoveRange(unit: Unit): void {
    this.moveGraphics.clear();
    const range = this.engine.getMoveRange(unit);
    range.forEach((_cost, key) => {
      const [x, y] = key.split(',').map(Number);
      this.moveGraphics.fillStyle(0x3498db, 0.4);
      this.moveGraphics.fillRect(
        this.offsetX + x * TILE_SIZE,
        this.offsetY + y * TILE_SIZE,
        TILE_SIZE, TILE_SIZE,
      );
    });
  }

  private createUI(): void {
    const phaseText = this.add.text(16, 16, 'Phase: Player', {
      fontSize: '20px', color: '#ecf0f1', backgroundColor: '#2c3e50',
      padding: { x: 10, y: 6 },
    }).setScrollFactor(0);

    const endTurn = this.add.text(16, 60, '[ End Turn ]', {
      fontSize: '16px', color: '#ecf0f1', backgroundColor: '#c0392b',
      padding: { x: 10, y: 6 },
    }).setInteractive({ useHandCursor: true });

    endTurn.on('pointerdown', () => {
      this.engine.endTurn();
      this.syncUnitSprites();
      phaseText.setText(`Phase: ${this.engine.turnManager.isPlayerPhase() ? 'Player' : 'Enemy'}`);

      // Execute enemy actions
      if (this.engine.turnManager.isEnemyPhase()) {
        this.executeEnemyActions(() => {
          this.engine.endTurn(); // enemy → player
          this.syncUnitSprites();
          phaseText.setText('Phase: Player');
        });
      }
    });
  }

  private executeEnemyActions(onComplete: () => void): void {
    const actions = this.engine.getPendingActions();
    if (actions.length === 0) {
      onComplete();
      return;
    }

    const processNext = (index: number) => {
      if (index >= actions.length) {
        onComplete();
        return;
      }

      const action = actions[index];
      if (action.type === 'move' && action.x !== undefined && action.y !== undefined) {
        // Move with tween
        const sprite = this.unitSprites.get(action.actor.id);
        if (sprite) {
          const targetX = this.offsetX + action.x * TILE_SIZE + TILE_SIZE / 2;
          const targetY = this.offsetY + action.y * TILE_SIZE + TILE_SIZE / 2;
          this.tweens.add({
            targets: sprite,
            x: targetX, y: targetY,
            duration: 300,
            onComplete: () => {
              this.engine.moveUnit(action.actor, action.x!, action.y!);
              processNext(index + 1);
            },
          });
        } else {
          processNext(index + 1);
        }
      } else if (action.type === 'attack' && action.targetX !== undefined) {
        // Flash the target
        const target = this.engine.getUnit(action.targetX, action.targetY);
        if (target) {
          // Simple combat: flash target red
          const targetSprite = this.unitSprites.get(target.id);
          if (targetSprite) {
            // Apply damage via combat engine
            const weapon = WEAPON_DB['Iron Axe']; // simplified
            const defWeapon = WEAPON_DB['Iron Sword'];
            const engine = new CombatEngine(this.engine.grid);
            const rng = () => Math.random() * 100;
            engine.resolveCombat(action.actor, target, weapon, defWeapon, rng);

            targetSprite.setAlpha(0.3);
            this.time.delayedCall(200, () => {
              this.syncUnitSprites();
              processNext(index + 1);
            });
          } else {
            processNext(index + 1);
          }
        } else {
          processNext(index + 1);
        }
      } else {
        processNext(index + 1);
      }
    };

    processNext(0);
  }
}
```

**Step 2: Verify the game compiles and runs**

```bash
cd /root/workspace/the-sanguine-spear && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/scenes/BattleScene.ts src/game/GameEngine.ts
git commit -m "refactor: wire BattleScene to GameEngine, pure rendering layer"
```

---

### Task 6.3: Add screen shake and hit effects

**Objective:** Visual juice: screen shake on crits, red flash on hits, fade-out on death.

**Files:**
- Modify: `src/scenes/BattleScene.ts` (add juice to `executeEnemyActions`)

**Add to BattleScene:**

- Screen shake on combat hit: `this.cameras.main.shake(100, 0.005)`
- Critical hit: stronger shake + flash
- Death: fade out sprite before removal
- Movement: smooth tween (already added)

**Step: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: add screen shake, hit flash, and death fade effects"
```

---

### Task 6.4: Add deployment configuration

**Objective:** Add a production build script and basic deployment info for Hostinger KVM2.

**Files:**
- Modify: `package.json` (add preview/build scripts if not already present)
- Create: `.htaccess` (for Apache hosting)
- Create: `DEPLOY.md`

**Step 1: Verify build**

```bash
npm run build
```

Expected: `dist/` directory created with built assets.

**Step 2: Create .htaccess** (for SPA routing on Apache)

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

**Step 3: Create DEPLOY.md**

```markdown
# Deployment

## Build
npm run build

## Serve
The `dist/` directory contains static files. Serve with any web server.

### Nginx
server {
    listen 80;
    root /path/to/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}

### Hostinger KVM2
1. Build: `npm run build`
2. Upload `dist/` to `/var/www/html/` or configure Apache virtual host
3. Enable `.htaccess` override in Apache config
```

**Step 4: Commit**

```bash
git add package.json .htaccess DEPLOY.md
git commit -m "chore: add production build config and deployment docs"
```

---

### Task 6.5: Create game barrel export

**Objective:** Single import for the game engine.

**Files:**
- Create: `src/game/index.ts`

```typescript
export { GameEngine } from './GameEngine';
export * from './map';
export * from './units';
export * from './movement';
export * from './combat';
export * from './ai';
export * from './state';
```

Commit.

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] `npm run build` produces a valid `dist/` directory
- [ ] `npx vitest run` passes all game logic tests
- [ ] BattleScene delegates all logic to GameEngine
- [ ] Unit movement, phase switching, and enemy AI work through the engine
- [ ] Screen shake and visual effects trigger on combat
- [ ] Deployment docs exist

---

## 🎉 Done

The game is now a complete vertical slice: grid-based tactical movement, turn-based phases, combat with Fire Emblem formulas, enemy AI, and visual polish — all built with strict TDD and hyper-modular architecture.
