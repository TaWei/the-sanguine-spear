# The Sanguine Spear — Features 1-5 TDD Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Strict TDD: write failing test → watch it fail → implement → watch it pass → refactor → commit.

**Goal:** Implement 5 Fire Emblem-inspired features:
1. Flying units ignore lava damage
2. Enemy units animate along cardinal grid paths like player units
3. Status window action (non-consuming) showing unit stats
4. Inventory system (max 5 items) with Items menu action (non-consuming unless used)
5. Weapon/item selection when choosing Fight

**Architecture:** Pure logic lives in `src/game/` (zero Phaser imports, 100% testable). Rendering lives in `src/scenes/BattleScene.ts`. The `BattleMenu` state machine controls post-move actions. The `GameEngine` facade wires subsystems together.

**Tech Stack:** TypeScript 5.4, Vitest, Phaser 3.80, Vite.

**Test Command:** `npx vitest run <path>`
**Full Suite:** `npx vitest run`

---

## Item Design Decisions (Fire Emblem Canonical)

Based on Fire Emblem wiki research, we implement these item categories:

| Category | Examples | Behavior |
|----------|----------|----------|
| **Weapon** | Iron Sword, Iron Lance, Iron Axe, Iron Bow, Fire, Killer Sword | Equippable. Used for combat. Has durability (uses). |
| **Recovery** | Vulnerary (heal 10 HP), Elixir (heal all HP) | Consumable. Restores HP. Consumes action. |
| **Key** | Door Key, Chest Key | Consumable. Opens doors/chests. Consumes action. |
| **Stat Booster** | Energy Ring (+2 Str), Secret Book (+2 Skl) | Consumable. Permanent stat boost. Consumes action. |

Simplified for scope:
- Weapons have `uses` that decrement per combat (optional for MVP).
- Recovery items heal immediately.
- Keys are stubbed (no doors/chests yet) but exist in the type system.
- Stat boosters apply immediately and permanently.
- Inventory max = 5 slots. Weapons + items share slots.

---

## Phase A: Flying Units Ignore Lava Damage

### Task A1: Write failing test for flying lava immunity

**Objective:** `TerrainHazardEngine.computeHazardDamage` returns 0 for flying units on lava.

**Files:**
- Test: `src/game/hazards/__tests__/TerrainHazardEngine.test.ts`

**Step 1: Write failing test**

```typescript
it('returns 0 damage for flying units on lava', () => {
  const grid = new Grid(5, 5);
  grid.setTerrain(2, 2, TerrainType.LAVA);
  const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  const pegasus = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, stats, 2, 2);
  const engine = new TerrainHazardEngine();
  expect(engine.computeHazardDamage(pegasus, grid)).toBe(0);
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/hazards/__tests__/TerrainHazardEngine.test.ts
```
Expected: FAIL — `expected 0 to be 5`

**Step 3: Write minimal implementation**

In `src/game/hazards/TerrainHazardEngine.ts`, modify `computeHazardDamage`:

```typescript
computeHazardDamage(unit: Unit, grid: Grid): number {
  if (unit.isFlying) {
    return 0;
  }
  const terrainData = grid.getTerrainData(unit.gridX, unit.gridY);
  const hazardDamage = terrainData.hazardDamage ?? 0;
  if (hazardDamage <= 0) {
    return 0;
  }
  return Math.min(hazardDamage, unit.stats.hp);
}
```

**Step 4: Run test to verify pass**

```bash
npx vitest run src/game/hazards/__tests__/TerrainHazardEngine.test.ts
```
Expected: PASS

**Step 5: Run full suite**

```bash
npx vitest run
```
Expected: all pass

**Step 6: Commit**

```bash
git add src/game/hazards/
git commit -m "feat: flying units ignore lava damage"
```

---

## Phase B: Enemy Cardinal Movement Animation

### Task B1: Write failing test for path-based enemy move actions

**Objective:** `Commander.planEnemyTurn` includes path data in MOVE actions so the scene can animate tile-by-tile.

**Files:**
- Modify: `src/game/state/ActionQueue.ts`
- Modify: `src/game/ai/Commander.ts`
- Test: `src/game/ai/__tests__/Commander.test.ts`

**Step 1: Write failing test**

In `src/game/ai/__tests__/Commander.test.ts`, add:

```typescript
it('move actions include a cardinal path from start to destination', () => {
  const grid = new Grid(5, 5);
  const commander = new Commander(grid, WEAPON_DB);
  const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
  const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 3, 1);
  grid.placeUnit(enemy, 1, 1);
  grid.placeUnit(player, 3, 1);
  const actions = commander.planEnemyTurn([enemy], [player]);
  const moveAction = actions.find((a) => a.type === ActionType.MOVE);
  expect(moveAction).toBeDefined();
  expect(moveAction!.path).toBeDefined();
  expect(moveAction!.path!.length).toBeGreaterThan(0);
  // Each step should be cardinal (Manhattan distance 1 from previous)
  for (let i = 1; i < moveAction!.path!.length; i++) {
    const prev = moveAction!.path![i - 1];
    const curr = moveAction!.path![i];
    const dist = Math.abs(prev.x - curr.x) + Math.abs(prev.y - curr.y);
    expect(dist).toBe(1);
  }
});
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/game/ai/__tests__/Commander.test.ts
```
Expected: FAIL — `path` property does not exist on `Action`

**Step 3: Extend Action type with optional path**

In `src/game/state/ActionQueue.ts`:

```typescript
export interface GridPoint {
  x: number;
  y: number;
}

export interface Action {
  type: ActionType;
  actor: Unit;
  x?: number;
  y?: number;
  targetX?: number;
  targetY?: number;
  path?: GridPoint[];
}
```

**Step 4: Make Commander compute and attach paths**

In `src/game/ai/Commander.ts`:
- Import `findPath` from `../movement/Pathfinder`
- Import `GridPoint` from `../state/ActionQueue`

In `planEnemyTurn`, after computing `movePos`:

```typescript
const movePos = this.findBestApproach(enemy, target, moveRange, weapon);
if (movePos && (movePos[0] !== enemy.gridX || movePos[1] !== enemy.gridY)) {
  const path = findPath(enemy, this.grid, movePos[0], movePos[1]);
  actions.push({
    type: ActionType.MOVE,
    actor: enemy,
    x: movePos[0],
    y: movePos[1],
    path: path ? path.map((n) => ({ x: n.x, y: n.y })) : [{ x: movePos[0], y: movePos[1] }],
  });
  claimedTiles.add(`${String(movePos[0])},${String(movePos[1])}`);
}
```

**Step 5: Run test to verify pass**

```bash
npx vitest run src/game/ai/__tests__/Commander.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add src/game/state/ActionQueue.ts src/game/ai/
git commit -m "feat: enemy move actions include cardinal path"
```

### Task B2: Animate enemies along cardinal paths in BattleScene

**Objective:** `BattleScene.executeEnemyActions` steps enemy sprites tile-by-tile using the path instead of direct tween.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: No test (Phaser rendering)** — modify `executeEnemyActions`:

Replace the direct tween in the `move` branch with path-stepping logic:

```typescript
if (action.type === 'move' && action.x !== undefined && action.y !== undefined) {
  const sprite = this.unitSprites.get(action.actor.id);
  if (sprite && action.path && action.path.length > 0) {
    this.isAnimatingMovement = true;
    let stepIndex = 0;
    const processStep = () => {
      if (stepIndex >= action.path!.length) {
        this.isAnimatingMovement = false;
        this.engine.moveUnit(action.actor, action.x, action.y);
        processNext(index + 1);
        return;
      }
      const step = action.path![stepIndex];
      const targetX = this.offsetX + step.x * TILE_SIZE + TILE_SIZE / 2;
      const targetY = this.offsetY + step.y * TILE_SIZE + TILE_SIZE / 2;
      this.tweens.add({
        targets: sprite,
        x: targetX,
        y: targetY,
        duration: 150,
        ease: 'Linear',
        onComplete: () => {
          stepIndex++;
          processStep();
        },
      });
    };
    processStep();
  } else if (sprite) {
    // Fallback: direct tween (no path provided)
    const targetX = this.offsetX + action.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = this.offsetY + action.y * TILE_SIZE + TILE_SIZE / 2;
    this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration: 300,
      onComplete: () => {
        this.engine.moveUnit(action.actor, action.x!, action.y!);
        processNext(index + 1);
      },
    });
  } else {
    processNext(index + 1);
  }
}
```

**Step 2: Manual verification**
- Launch `npm run dev`
- Start a battle
- End turn to trigger enemy phase
- Verify enemies step one tile at a time in cardinal directions

**Step 3: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: animate enemy movement along cardinal paths"
```

---

## Phase C: Status Window (Non-Consuming Action)

### Task C1: Extend BattleMenu with STATUS action

**Objective:** `MenuAction` gains `STATUS`. Selecting it transitions to a new `CHOOSE_STATUS` state and does not exhaust the unit.

**Files:**
- Modify: `src/game/ui/BattleMenu.ts`
- Test: `src/game/ui/__tests__/BattleMenu.test.ts`

**Step 1: Write failing test**

In `src/game/ui/__tests__/BattleMenu.test.ts`:

```typescript
it('selecting STATUS transitions to CHOOSE_STATUS and preserves action', () => {
  const menu = new BattleMenu();
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.STATUS);
  expect(menu.state).toBe(MenuState.CHOOSE_STATUS);
  expect(menu.selectedAction).toBe(MenuAction.STATUS);
});

it('reset from CHOOSE_STATUS returns to hidden without exhausting unit', () => {
  const menu = new BattleMenu();
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.STATUS);
  menu.reset();
  expect(menu.state).toBe(MenuState.HIDDEN);
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```

**Step 3: Implement**

In `src/game/ui/BattleMenu.ts`:

```typescript
export const MenuAction = {
  FIGHT: 'fight',
  STATUS: 'status',
  END_TURN: 'end_turn',
} as const;

export const MenuState = {
  HIDDEN: 'hidden',
  CHOOSE_ACTION: 'choose_action',
  CHOOSE_TARGET: 'choose_target',
  CHOOSE_STATUS: 'choose_status',
  RESOLVED: 'resolved',
} as const;
```

Update `selectAction`:

```typescript
selectAction(action: MenuAction): void {
  if (this._state !== MenuState.CHOOSE_ACTION) {
    throw new Error(`Cannot select action in state ${this._state}`);
  }
  this._selectedAction = action;
  if (action === MenuAction.END_TURN) {
    this._state = MenuState.RESOLVED;
  } else if (action === MenuAction.STATUS) {
    this._state = MenuState.CHOOSE_STATUS;
  } else {
    this._state = MenuState.CHOOSE_TARGET;
  }
}
```

**Step 4: Run test — expect PASS**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```

**Step 5: Commit**

```bash
git add src/game/ui/BattleMenu.ts src/game/ui/__tests__/BattleMenu.test.ts
git commit -m "feat: add STATUS menu action and CHOOSE_STATUS state"
```

### Task C2: Build pure StatusWindow state machine

**Objective:** `StatusWindow` holds a unit and produces a display-ready stats object. No Phaser dependency.

**Files:**
- Create: `src/game/ui/StatusWindow.ts`
- Test: `src/game/ui/__tests__/StatusWindow.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { StatusWindow } from '../StatusWindow';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('StatusWindow', () => {
  const stats = createStats({ hp: 18, maxHp: 20, str: 7, mag: 2, skl: 6, spd: 8, luk: 5, def: 6, res: 4, mov: 5 });
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);

  it('is inactive by default', () => {
    const sw = new StatusWindow();
    expect(sw.isOpen).toBe(false);
    expect(sw.unit).toBeNull();
  });

  it('opens with a unit', () => {
    const sw = new StatusWindow();
    sw.open(unit);
    expect(sw.isOpen).toBe(true);
    expect(sw.unit).toBe(unit);
  });

  it('produces display stats with all fields', () => {
    const sw = new StatusWindow();
    sw.open(unit);
    const d = sw.displayStats;
    expect(d.name).toBe('Rowan');
    expect(d.class).toBe('lord');
    expect(d.level).toBe(1);
    expect(d.hp).toBe(18);
    expect(d.maxHp).toBe(20);
    expect(d.str).toBe(7);
    expect(d.mag).toBe(2);
    expect(d.skl).toBe(6);
    expect(d.spd).toBe(8);
    expect(d.luk).toBe(5);
    expect(d.def).toBe(6);
    expect(d.res).toBe(4);
    expect(d.mov).toBe(5);
  });

  it('closes and clears unit', () => {
    const sw = new StatusWindow();
    sw.open(unit);
    sw.close();
    expect(sw.isOpen).toBe(false);
    expect(sw.unit).toBeNull();
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run src/game/ui/__tests__/StatusWindow.test.ts
```

**Step 3: Implement StatusWindow**

```typescript
import { Unit } from '../units/Unit';

export interface StatusDisplay {
  name: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export class StatusWindow {
  private _unit: Unit | null = null;

  get isOpen(): boolean {
    return this._unit !== null;
  }

  get unit(): Unit | null {
    return this._unit;
  }

  get displayStats(): StatusDisplay {
    if (!this._unit) {
      throw new Error('StatusWindow is closed');
    }
    const s = this._unit.stats;
    return {
      name: this._unit.name,
      class: this._unit.unitClass,
      level: this._unit.level,
      hp: s.hp,
      maxHp: s.maxHp,
      str: s.str,
      mag: s.mag,
      skl: s.skl,
      spd: s.spd,
      luk: s.luk,
      def: s.def,
      res: s.res,
      mov: s.mov,
    };
  }

  open(unit: Unit): void {
    this._unit = unit;
  }

  close(): void {
    this._unit = null;
  }
}
```

**Step 4: Run test — expect PASS**

```bash
npx vitest run src/game/ui/__tests__/StatusWindow.test.ts
```

**Step 5: Commit**

```bash
git add src/game/ui/StatusWindow.ts src/game/ui/__tests__/StatusWindow.test.ts
git commit -m "feat: add pure StatusWindow state machine"
```

### Task C3: Wire Status into BattleScene

**Objective:** Post-move menu shows Status button. Clicking it opens a modal overlay. Closing the modal returns to the menu without exhausting the unit.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Add status window instance**

In `BattleScene` class, add:

```typescript
private statusWindow: StatusWindow = new StatusWindow();
private statusOverlay: Phaser.GameObjects.Container | null = null;
```

Import `StatusWindow` and `MenuAction`/`MenuState` if not already.

**Step 2: Add Status to post-move menu**

In `showPostMoveMenu`, after creating `fightText` and `endText`, add:

```typescript
const statusText = this.add
  .text(px, py + 48, '[ Status ]', {
    fontSize: '14px',
    color: '#ffffff',
    backgroundColor: '#27ae60',
    padding: { x: 8, y: 4 },
  })
  .setOrigin(0.5)
  .setInteractive({ useHandCursor: true });

statusText.on('pointerdown', (_pointer, _lx, _ly, event) => {
  event.stopPropagation();
  this.battleMenu.selectAction(MenuAction.STATUS);
  this.clearMenuTexts();
  this.showStatusWindow(this.battleMenu.unit!);
});

this.menuTexts.push(fightText, endText, statusText);
```

**Step 3: Implement showStatusWindow / hideStatusWindow**

```typescript
private showStatusWindow(unit: Unit): void {
  this.statusWindow.open(unit);
  this.inputEnabled = false;

  const overlay = this.add.container(0, 0);
  this.statusOverlay = overlay;

  const bg = this.add.rectangle(
    this.cameras.main.width / 2,
    this.cameras.main.height / 2,
    this.cameras.main.width,
    this.cameras.main.height,
    0x000000,
    0.7,
  );
  overlay.add(bg);

  const d = this.statusWindow.displayStats;
  const panelW = 260;
  const panelH = 340;
  const cx = this.cameras.main.width / 2;
  const cy = this.cameras.main.height / 2;

  const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x2c3e50, 0.95);
  panel.setStrokeStyle(2, 0x3498db);
  overlay.add(panel);

  const lines = [
    `${d.name} — Lv ${d.level} ${d.class}`,
    '',
    `HP  ${d.hp} / ${d.maxHp}`,
    `Str ${d.str}`,
    `Mag ${d.mag}`,
    `Skl ${d.skl}`,
    `Spd ${d.spd}`,
    `Luk ${d.luk}`,
    `Def ${d.def}`,
    `Res ${d.res}`,
    `Mov ${d.mov}`,
  ];

  const text = this.add
    .text(cx, cy, lines.join('\n'), {
      fontSize: '14px',
      color: '#ecf0f1',
      align: 'center',
      lineSpacing: 4,
    })
    .setOrigin(0.5);
  overlay.add(text);

  const closeBtn = this.add
    .text(cx, cy + panelH / 2 - 20, '[ Close ]', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#c0392b',
      padding: { x: 10, y: 4 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  overlay.add(closeBtn);

  closeBtn.on('pointerdown', () => {
    this.hideStatusWindow();
  });
}

private hideStatusWindow(): void {
  this.statusOverlay?.destroy();
  this.statusOverlay = null;
  this.statusWindow.close();
  this.inputEnabled = true;

  // Return to action menu (unit NOT exhausted)
  const unit = this.battleMenu.unit;
  if (unit) {
    const enemies = this.engine.getAdjacentEnemies(unit);
    this.battleMenu.show(unit, enemies);
    this.showPostMoveMenu(unit);
  }
}
```

**Step 4: Update outside-menu-click and undoMove to handle status**

In `handleOutsideMenuClick`, add check for status:

```typescript
private handleOutsideMenuClick(): void {
  if (this.statusOverlay) {
    this.hideStatusWindow();
    return;
  }
  // ... existing logic
}
```

In `undoMove`, clear status overlay:

```typescript
private undoMove(): void {
  if (this.statusOverlay) {
    this.hideStatusWindow();
    return;
  }
  // ... existing undoMove logic
}
```

**Step 5: Manual verification**
- Move a unit → post-move menu shows Fight, Status, End Turn
- Click Status → modal appears with unit stats
- Click Close → returns to menu, unit not exhausted
- Click elsewhere while status open → closes status, returns to menu

**Step 6: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: wire Status action into BattleScene with modal overlay"
```

---

## Phase D: Inventory System & Items Menu

### Task D1: Design item types

**Objective:** `ItemType` discriminated union with Weapon, Recovery, Key, StatBooster. `Inventory` class manages up to 5 slots.

**Files:**
- Create: `src/game/items/ItemTypes.ts`
- Test: `src/game/items/__tests__/ItemTypes.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { Item, createWeaponItem, createRecoveryItem, createKeyItem, createStatBoosterItem } from '../ItemTypes';

describe('Item factories', () => {
  it('creates a weapon item', () => {
    const item = createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
    expect(item.kind).toBe('weapon');
    expect(item.name).toBe('Iron Sword');
    expect(item.uses).toBe(40);
  });

  it('creates a recovery item', () => {
    const item = createRecoveryItem('Vulnerary', 10);
    expect(item.kind).toBe('recovery');
    expect(item.name).toBe('Vulnerary');
    expect(item.healAmount).toBe(10);
    expect(item.uses).toBe(3);
  });

  it('creates a key item', () => {
    const item = createKeyItem('Door Key');
    expect(item.kind).toBe('key');
    expect(item.uses).toBe(1);
  });

  it('creates a stat booster', () => {
    const item = createStatBoosterItem('Energy Ring', 'str', 2);
    expect(item.kind).toBe('stat_booster');
    expect(item.stat).toBe('str');
    expect(item.bonus).toBe(2);
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run src/game/items/__tests__/ItemTypes.test.ts
```

**Step 3: Implement**

```typescript
export interface WeaponItem {
  kind: 'weapon';
  name: string;
  weaponType: string;
  mt: number;
  hit: number;
  crit: number;
  minRange: number;
  maxRange: number;
  usesMagic: boolean;
  uses: number;
}

export interface RecoveryItem {
  kind: 'recovery';
  name: string;
  healAmount: number;
  uses: number;
}

export interface KeyItem {
  kind: 'key';
  name: string;
  uses: number;
}

export interface StatBoosterItem {
  kind: 'stat_booster';
  name: string;
  stat: 'str' | 'mag' | 'skl' | 'spd' | 'luk' | 'def' | 'res' | 'mov' | 'maxHp';
  bonus: number;
  uses: number;
}

export type Item = WeaponItem | RecoveryItem | KeyItem | StatBoosterItem;

export function createWeaponItem(
  name: string,
  weaponType: string,
  mt: number,
  hit: number,
  crit: number,
  minRange: number,
  maxRange: number,
  usesMagic: boolean,
  uses = 40,
): WeaponItem {
  return { kind: 'weapon', name, weaponType, mt, hit, crit, minRange, maxRange, usesMagic, uses };
}

export function createRecoveryItem(name: string, healAmount: number, uses = 3): RecoveryItem {
  return { kind: 'recovery', name, healAmount, uses };
}

export function createKeyItem(name: string, uses = 1): KeyItem {
  return { kind: 'key', name, uses };
}

export function createStatBoosterItem(
  name: string,
  stat: StatBoosterItem['stat'],
  bonus: number,
): StatBoosterItem {
  return { kind: 'stat_booster', name, stat, bonus, uses: 1 };
}
```

**Step 4: Run test — expect PASS**

```bash
npx vitest run src/game/items/__tests__/ItemTypes.test.ts
```

**Step 5: Commit**

```bash
git add src/game/items/
git commit -m "feat: add Item type system with weapons, recovery, keys, stat boosters"
```

### Task D2: Build Inventory class

**Objective:** `Inventory` holds up to 5 items, supports add/remove/use. Pure logic.

**Files:**
- Create: `src/game/items/Inventory.ts`
- Test: `src/game/items/__tests__/Inventory.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { Inventory } from '../Inventory';
import { createWeaponItem, createRecoveryItem } from '../ItemTypes';

describe('Inventory', () => {
  const sword = createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
  const vuln = createRecoveryItem('Vulnerary', 10);

  it('starts empty', () => {
    const inv = new Inventory();
    expect(inv.size).toBe(0);
    expect(inv.isFull).toBe(false);
    expect(inv.items).toEqual([]);
  });

  it('adds items up to max 5', () => {
    const inv = new Inventory();
    expect(inv.add(sword)).toBe(true);
    expect(inv.add(vuln)).toBe(true);
    expect(inv.size).toBe(2);
    expect(inv.add(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false))).toBe(true);
    expect(inv.add(createWeaponItem('Iron Axe', 'axe', 8, 70, 0, 1, 1, false))).toBe(true);
    expect(inv.add(createWeaponItem('Iron Bow', 'bow', 6, 85, 0, 2, 2, false))).toBe(true);
    expect(inv.isFull).toBe(true);
    expect(inv.add(createRecoveryItem('Elixir', 999))).toBe(false);
  });

  it('removes an item by index', () => {
    const inv = new Inventory();
    inv.add(sword);
    inv.add(vuln);
    const removed = inv.removeAt(0);
    expect(removed).toBe(sword);
    expect(inv.size).toBe(1);
  });

  it('uses a recovery item and decrements uses', () => {
    const inv = new Inventory();
    inv.add(vuln);
    const result = inv.useAt(0);
    expect(result.consumed).toBe(false);
    expect(result.item.uses).toBe(2);
  });

  it('removes item when uses reach 0', () => {
    const inv = new Inventory();
    const single = createRecoveryItem('Vulnerary', 10, 1);
    inv.add(single);
    const result = inv.useAt(0);
    expect(result.consumed).toBe(true);
    expect(inv.size).toBe(0);
  });

  it('throws when using invalid index', () => {
    const inv = new Inventory();
    expect(() => inv.useAt(0)).toThrow();
  });

  it('provides read-only item list', () => {
    const inv = new Inventory();
    inv.add(sword);
    const items = inv.items;
    expect(items).toHaveLength(1);
    expect(() => items.push(vuln)).toThrow();
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run src/game/items/__tests__/Inventory.test.ts
```

**Step 3: Implement**

```typescript
import { Item } from './ItemTypes';

export interface UseResult {
  item: Item;
  consumed: boolean;
}

export class Inventory {
  private _items: Item[] = [];
  private readonly _max = 5;

  get items(): readonly Item[] {
    return this._items;
  }

  get size(): number {
    return this._items.length;
  }

  get isFull(): boolean {
    return this._items.length >= this._max;
  }

  add(item: Item): boolean {
    if (this.isFull) {
      return false;
    }
    this._items.push(item);
    return true;
  }

  removeAt(index: number): Item | undefined {
    if (index < 0 || index >= this._items.length) {
      return undefined;
    }
    const [removed] = this._items.splice(index, 1);
    return removed;
  }

  useAt(index: number): UseResult {
    if (index < 0 || index >= this._items.length) {
      throw new Error(`Invalid inventory index: ${index}`);
    }
    const item = this._items[index];
    if (item.uses <= 1) {
      this._items.splice(index, 1);
      return { item: { ...item, uses: 0 }, consumed: true };
    }
    const updated = { ...item, uses: item.uses - 1 };
    this._items[index] = updated;
    return { item: updated, consumed: false };
  }
}
```

**Step 4: Run test — expect PASS**

```bash
npx vitest run src/game/items/__tests__/Inventory.test.ts
```

**Step 5: Commit**

```bash
git add src/game/items/
git commit -m "feat: add Inventory class with 5-slot limit and use/remove"
```

### Task D3: Attach Inventory to Unit

**Objective:** `Unit` has an `inventory` field. Existing units get a default weapon.

**Files:**
- Modify: `src/game/units/Unit.ts`
- Modify: `src/game/GameEngine.ts`
- Test: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Write failing test**

In `src/game/units/__tests__/Unit.test.ts`:

```typescript
it('has an inventory', () => {
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
  expect(unit.inventory).toBeDefined();
  expect(unit.inventory.size).toBe(0);
});

it('can receive items into inventory', () => {
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
  const sword = createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
  unit.inventory.add(sword);
  expect(unit.inventory.size).toBe(1);
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```

**Step 3: Implement**

In `src/game/units/Unit.ts`:

```typescript
import { Inventory } from '../items/Inventory';

export class Unit {
  // ... existing fields ...
  readonly inventory: Inventory;

  constructor(/* ... existing params ... */) {
    // ... existing init ...
    this.inventory = new Inventory();
  }
  // ... rest of class ...
}
```

In `src/game/GameEngine.ts`, update `getWeaponForUnit` to check inventory first:

```typescript
getWeaponForUnit(unit: Unit): WeaponData {
  // Find first weapon in inventory
  const weaponItem = unit.inventory.items.find((i) => i.kind === 'weapon');
  if (weaponItem) {
    return {
      name: weaponItem.name,
      type: weaponItem.weaponType as WeaponType,
      mt: weaponItem.mt,
      hit: weaponItem.hit,
      crit: weaponItem.crit,
      minRange: weaponItem.minRange,
      maxRange: weaponItem.maxRange,
      usesMagic: weaponItem.usesMagic,
    };
  }
  // Fallback to class defaults
  if (unit.unitClass === 'mage') return WEAPON_DB.Fire;
  if (unit.unitClass === 'brigand') return WEAPON_DB['Iron Axe'];
  if (unit.unitClass === 'berserker') return WEAPON_DB['Killer Axe'];
  if (unit.unitClass === 'soldier') return WEAPON_DB['Iron Lance'];
  if (unit.unitClass === 'swordmaster') return WEAPON_DB['Killer Sword'];
  return WEAPON_DB['Iron Sword'];
}
```

**Step 4: Seed default weapons when adding units**

In `GameEngine.addUnit`, after creating the unit:

```typescript
const unit = new Unit(id, name, faction, unitClass, stats, gridX, gridY);
// Seed default weapon into inventory
const defaultWeapon = this.getDefaultWeaponItem(unitClass);
if (defaultWeapon) {
  unit.inventory.add(defaultWeapon);
}
this.units.push(unit);
this.grid.placeUnit(unit, gridX, gridY);
return unit;
```

Add helper:

```typescript
private getDefaultWeaponItem(unitClass: UnitClass) {
  switch (unitClass) {
    case 'mage': return createWeaponItem('Fire', 'magic', 5, 90, 0, 1, 2, true);
    case 'brigand': return createWeaponItem('Iron Axe', 'axe', 8, 70, 0, 1, 1, false);
    case 'soldier': return createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false);
    case 'archer': return createWeaponItem('Iron Bow', 'bow', 6, 85, 0, 2, 2, false);
    case 'pegasus_knight': return createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false);
    case 'swordmaster': return createWeaponItem('Killer Sword', 'sword', 7, 85, 30, 1, 1, false);
    case 'berserker': return createWeaponItem('Killer Axe', 'axe', 9, 70, 30, 1, 1, false);
    default: return createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
  }
}
```

**Step 5: Run all unit + engine tests — expect PASS**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts src/game/__tests__/GameEngine.test.ts
```

Fix any failures (likely existing tests that inspect unit internals). Existing `GameEngine.test.ts` may need updates if it tests `getWeaponForUnit`.

**Step 6: Commit**

```bash
git add src/game/units/Unit.ts src/game/GameEngine.ts src/game/units/__tests__/Unit.test.ts
git commit -m "feat: attach Inventory to Unit, seed default weapons"
```

### Task D4: Extend BattleMenu with ITEMS action

**Objective:** `MenuAction` gains `ITEMS`. Selecting it transitions to `CHOOSE_ITEM`. Does not exhaust unit unless an item is actually used.

**Files:**
- Modify: `src/game/ui/BattleMenu.ts`
- Test: `src/game/ui/__tests__/BattleMenu.test.ts`

**Step 1: Write failing test**

```typescript
it('selecting ITEMS transitions to CHOOSE_ITEM', () => {
  const menu = new BattleMenu();
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.ITEMS);
  expect(menu.state).toBe(MenuState.CHOOSE_ITEM);
  expect(menu.selectedAction).toBe(MenuAction.ITEMS);
});

it('confirming item use transitions to RESOLVED', () => {
  const menu = new BattleMenu();
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.ITEMS);
  menu.confirmItemUse(0);
  expect(menu.state).toBe(MenuState.RESOLVED);
  expect(menu.selectedItemIndex).toBe(0);
});

it('canceling item use returns to CHOOSE_ACTION', () => {
  const menu = new BattleMenu();
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.ITEMS);
  menu.cancelItemUse();
  expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
  expect(menu.selectedAction).toBeNull();
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```

**Step 3: Implement**

Update `MenuAction`:

```typescript
export const MenuAction = {
  FIGHT: 'fight',
  ITEMS: 'items',
  STATUS: 'status',
  END_TURN: 'end_turn',
} as const;
```

Update `MenuState`:

```typescript
export const MenuState = {
  HIDDEN: 'hidden',
  CHOOSE_ACTION: 'choose_action',
  CHOOSE_TARGET: 'choose_target',
  CHOOSE_STATUS: 'choose_status',
  CHOOSE_ITEM: 'choose_item',
  RESOLVED: 'resolved',
} as const;
```

Update `BattleMenu`:

```typescript
export class BattleMenu {
  private _selectedItemIndex: number | null = null;

  get selectedItemIndex(): number | null {
    return this._selectedItemIndex;
  }

  selectAction(action: MenuAction): void {
    if (this._state !== MenuState.CHOOSE_ACTION) {
      throw new Error(`Cannot select action in state ${this._state}`);
    }
    this._selectedAction = action;
    if (action === MenuAction.END_TURN) {
      this._state = MenuState.RESOLVED;
    } else if (action === MenuAction.STATUS) {
      this._state = MenuState.CHOOSE_STATUS;
    } else if (action === MenuAction.ITEMS) {
      this._state = MenuState.CHOOSE_ITEM;
    } else {
      this._state = MenuState.CHOOSE_TARGET;
    }
  }

  confirmItemUse(index: number): void {
    if (this._state !== MenuState.CHOOSE_ITEM) {
      throw new Error(`Cannot confirm item use in state ${this._state}`);
    }
    this._selectedItemIndex = index;
    this._state = MenuState.RESOLVED;
  }

  cancelItemUse(): void {
    if (this._state !== MenuState.CHOOSE_ITEM) {
      throw new Error(`Cannot cancel item use in state ${this._state}`);
    }
    this._selectedAction = null;
    this._state = MenuState.CHOOSE_ACTION;
  }

  reset(): void {
    this._state = MenuState.HIDDEN;
    this._unit = null;
    this._enemies = [];
    this._selectedAction = null;
    this._selectedTarget = null;
    this._selectedItemIndex = null;
  }
}
```

**Step 4: Run test — expect PASS**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```

**Step 5: Commit**

```bash
git add src/game/ui/BattleMenu.ts src/game/ui/__tests__/BattleMenu.test.ts
git commit -m "feat: add ITEMS menu action with choose/cancel/confirm flow"
```

### Task D5: Build pure ItemMenu state machine

**Objective:** `ItemMenu` handles selection, use confirmation, and returns a result. No Phaser dependency.

**Files:**
- Create: `src/game/ui/ItemMenu.ts`
- Test: `src/game/ui/__tests__/ItemMenu.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { ItemMenu } from '../ItemMenu';
import { Inventory } from '../../items/Inventory';
import { createWeaponItem, createRecoveryItem } from '../../items/ItemTypes';

describe('ItemMenu', () => {
  it('is inactive by default', () => {
    const menu = new ItemMenu();
    expect(menu.isOpen).toBe(false);
  });

  it('opens with inventory items', () => {
    const menu = new ItemMenu();
    const inv = new Inventory();
    inv.add(createRecoveryItem('Vulnerary', 10));
    menu.open(inv);
    expect(menu.isOpen).toBe(true);
    expect(menu.items).toHaveLength(1);
  });

  it('selecting an item enters confirm state', () => {
    const menu = new ItemMenu();
    const inv = new Inventory();
    inv.add(createRecoveryItem('Vulnerary', 10));
    menu.open(inv);
    menu.selectItem(0);
    expect(menu.selectedIndex).toBe(0);
    expect(menu.awaitingConfirm).toBe(true);
  });

  it('confirming returns use result', () => {
    const menu = new ItemMenu();
    const inv = new Inventory();
    inv.add(createRecoveryItem('Vulnerary', 10));
    menu.open(inv);
    menu.selectItem(0);
    const result = menu.confirmUse();
    expect(result.used).toBe(true);
    expect(result.index).toBe(0);
    expect(menu.isOpen).toBe(false);
  });

  it('canceling returns to item list', () => {
    const menu = new ItemMenu();
    const inv = new Inventory();
    inv.add(createRecoveryItem('Vulnerary', 10));
    menu.open(inv);
    menu.selectItem(0);
    menu.cancel();
    expect(menu.awaitingConfirm).toBe(false);
    expect(menu.selectedIndex).toBeNull();
  });

  it('closing resets state', () => {
    const menu = new ItemMenu();
    const inv = new Inventory();
    inv.add(createRecoveryItem('Vulnerary', 10));
    menu.open(inv);
    menu.close();
    expect(menu.isOpen).toBe(false);
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run src/game/ui/__tests__/ItemMenu.test.ts
```

**Step 3: Implement**

```typescript
import { Inventory } from '../items/Inventory';
import { Item } from '../items/ItemTypes';

export interface ItemUseResult {
  used: boolean;
  index: number | null;
}

export class ItemMenu {
  private _inventory: Inventory | null = null;
  private _selectedIndex: number | null = null;
  private _awaitingConfirm = false;

  get isOpen(): boolean {
    return this._inventory !== null;
  }

  get items(): readonly Item[] {
    return this._inventory?.items ?? [];
  }

  get selectedIndex(): number | null {
    return this._selectedIndex;
  }

  get awaitingConfirm(): boolean {
    return this._awaitingConfirm;
  }

  open(inventory: Inventory): void {
    this._inventory = inventory;
    this._selectedIndex = null;
    this._awaitingConfirm = false;
  }

  selectItem(index: number): void {
    if (!this._inventory || index < 0 || index >= this._inventory.size) {
      throw new Error('Invalid item index');
    }
    this._selectedIndex = index;
    this._awaitingConfirm = true;
  }

  confirmUse(): ItemUseResult {
    if (!this._awaitingConfirm || this._selectedIndex === null) {
      return { used: false, index: null };
    }
    const index = this._selectedIndex;
    this.close();
    return { used: true, index };
  }

  cancel(): void {
    this._selectedIndex = null;
    this._awaitingConfirm = false;
  }

  close(): void {
    this._inventory = null;
    this._selectedIndex = null;
    this._awaitingConfirm = false;
  }
}
```

**Step 4: Run test — expect PASS**

```bash
npx vitest run src/game/ui/__tests__/ItemMenu.test.ts
```

**Step 5: Commit**

```bash
git add src/game/ui/ItemMenu.ts src/game/ui/__tests__/ItemMenu.test.ts
git commit -m "feat: add pure ItemMenu state machine"
```

### Task D6: Wire Items into BattleScene

**Objective:** Post-move menu shows Items button. Clicking opens item list overlay. Using an item applies effects and exhausts unit; canceling returns to menu without exhausting.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Add ItemMenu instance**

In `BattleScene`:

```typescript
private itemMenu: ItemMenu = new ItemMenu();
private itemOverlay: Phaser.GameObjects.Container | null = null;
```

Import `ItemMenu`, `Inventory`, item types.

**Step 2: Add Items to post-move menu**

In `showPostMoveMenu`, after statusText, add:

```typescript
const itemsText = this.add
  .text(px, py + 72, '[ Items ]', {
    fontSize: '14px',
    color: '#ffffff',
    backgroundColor: '#8e44ad',
    padding: { x: 8, y: 4 },
  })
  .setOrigin(0.5)
  .setInteractive({ useHandCursor: true });

itemsText.on('pointerdown', (_pointer, _lx, _ly, event) => {
  event.stopPropagation();
  this.battleMenu.selectAction(MenuAction.ITEMS);
  this.clearMenuTexts();
  this.showItemMenu(this.battleMenu.unit!);
});

this.menuTexts.push(fightText, endText, statusText, itemsText);
```

**Step 3: Implement showItemMenu / hideItemMenu / applyItemEffect**

```typescript
private showItemMenu(unit: Unit): void {
  this.itemMenu.open(unit.inventory);
  this.inputEnabled = false;

  const overlay = this.add.container(0, 0);
  this.itemOverlay = overlay;

  const bg = this.add.rectangle(
    this.cameras.main.width / 2,
    this.cameras.main.height / 2,
    this.cameras.main.width,
    this.cameras.main.height,
    0x000000,
    0.7,
  );
  overlay.add(bg);

  const cx = this.cameras.main.width / 2;
  const cy = this.cameras.main.height / 2;
  const panel = this.add.rectangle(cx, cy, 280, 320, 0x2c3e50, 0.95);
  panel.setStrokeStyle(2, 0x8e44ad);
  overlay.add(panel);

  const title = this.add
    .text(cx, cy - 130, 'Items', { fontSize: '18px', color: '#f1c40f', fontStyle: 'bold' })
    .setOrigin(0.5);
  overlay.add(title);

  const items = this.itemMenu.items;
  const itemTexts: Phaser.GameObjects.Text[] = [];

  items.forEach((item, index) => {
    const y = cy - 90 + index * 36;
    const label = `${item.name} ${item.uses > 0 ? `[${item.uses}]` : ''}`;
    const color = item.kind === 'weapon' ? '#3498db' : item.kind === 'recovery' ? '#2ecc71' : '#ecf0f1';

    const txt = this.add
      .text(cx, y, label, { fontSize: '14px', color, backgroundColor: '#34495e', padding: { x: 10, y: 4 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    overlay.add(txt);
    itemTexts.push(txt);

    txt.on('pointerdown', () => {
      this.itemMenu.selectItem(index);
      this.showItemConfirm(unit, item, index);
    });
  });

  const cancelBtn = this.add
    .text(cx, cy + 130, '[ Cancel ]', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#c0392b',
      padding: { x: 10, y: 4 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  overlay.add(cancelBtn);

  cancelBtn.on('pointerdown', () => {
    this.itemMenu.cancel();
    this.hideItemMenu(false);
  });
}

private showItemConfirm(unit: Unit, item: import('../game/items/ItemTypes').Item, index: number): void {
  // Re-use itemOverlay, add a confirm dialog on top
  const cx = this.cameras.main.width / 2;
  const cy = this.cameras.main.height / 2;

  const dialog = this.add.container(0, 0);
  dialog.setName('confirmDialog');

  const dim = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.5);
  dialog.add(dim);

  const box = this.add.rectangle(cx, cy, 240, 120, 0x1a1a2e, 0.95);
  box.setStrokeStyle(2, 0xf1c40f);
  dialog.add(box);

  const q = this.add
    .text(cx, cy - 20, `Use ${item.name}?`, { fontSize: '14px', color: '#ecf0f1' })
    .setOrigin(0.5);
  dialog.add(q);

  const yes = this.add
    .text(cx - 50, cy + 20, '[ Yes ]', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#27ae60',
      padding: { x: 8, y: 4 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  dialog.add(yes);

  const no = this.add
    .text(cx + 50, cy + 20, '[ No ]', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#c0392b',
      padding: { x: 8, y: 4 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  dialog.add(no);

  yes.on('pointerdown', () => {
    const result = unit.inventory.useAt(index);
    this.applyItemEffect(unit, result.item);
    this.battleMenu.confirmItemUse(index);
    dialog.destroy();
    this.hideItemMenu(true);
  });

  no.on('pointerdown', () => {
    this.itemMenu.cancel();
    dialog.destroy();
  });

  this.itemOverlay!.add(dialog);
}

private applyItemEffect(unit: Unit, item: import('../game/items/ItemTypes').Item): void {
  if (item.kind === 'recovery') {
    const heal = item.healAmount;
    // Clamp HP to maxHp
    const newHp = Math.min(unit.stats.maxHp, unit.stats.hp + heal);
    const actualHeal = newHp - unit.stats.hp;
    if (actualHeal > 0) {
      unit.takeDamage(-actualHeal); // negative damage = heal
    }
  }
  // Stat boosters, keys handled later
}

private hideItemMenu(didUse: boolean): void {
  this.itemOverlay?.destroy();
  this.itemOverlay = null;
  this.itemMenu.close();
  this.inputEnabled = true;

  const unit = this.battleMenu.unit;
  if (!unit) return;

  if (didUse) {
    // Item used → exhaust unit
    unit.state.transition(UNIT_STATE.EXHAUSTED);
    this.clearMenuTexts();
    this.syncUnitSprites();
    this.checkAutoEndTurn();
  } else {
    // Cancelled → return to action menu
    const enemies = this.engine.getAdjacentEnemies(unit);
    this.battleMenu.show(unit, enemies);
    this.showPostMoveMenu(unit);
  }
}
```

**Step 4: Update outside-menu-click and undoMove for item overlay**

```typescript
private handleOutsideMenuClick(): void {
  if (this.itemOverlay) {
    this.hideItemMenu(false);
    return;
  }
  if (this.statusOverlay) {
    this.hideStatusWindow();
    return;
  }
  // ... existing logic
}

private undoMove(): void {
  if (this.itemOverlay) {
    this.hideItemMenu(false);
    return;
  }
  if (this.statusOverlay) {
    this.hideStatusWindow();
    return;
  }
  // ... existing undoMove logic
}
```

**Step 5: Manual verification**
- Move unit → menu shows Fight, Items, Status, End Turn
- Click Items → shows inventory list
- Click an item → confirm dialog
- Yes → item used, unit exhausted, HP healed if recovery
- No / Cancel → back to menu, unit NOT exhausted

**Step 6: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: wire Items menu into BattleScene with use/confirm/cancel"
```

---

## Phase E: Weapon Selection When Fighting

### Task E1: Extend BattleMenu for weapon selection

**Objective:** When FIGHT is selected, if unit has multiple weapons in inventory, menu transitions to `CHOOSE_WEAPON` instead of `CHOOSE_TARGET`.

**Files:**
- Modify: `src/game/ui/BattleMenu.ts`
- Test: `src/game/ui/__tests__/BattleMenu.test.ts`

**Step 1: Write failing test**

```typescript
it('selecting FIGHT with multiple weapons goes to CHOOSE_WEAPON', () => {
  const menu = new BattleMenu();
  player.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
  player.inventory.add(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false));
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.FIGHT);
  expect(menu.state).toBe(MenuState.CHOOSE_WEAPON);
});

it('selecting FIGHT with one weapon goes straight to CHOOSE_TARGET', () => {
  const menu = new BattleMenu();
  // Only the default seeded weapon
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.FIGHT);
  expect(menu.state).toBe(MenuState.CHOOSE_TARGET);
});

it('selecting a weapon transitions to CHOOSE_TARGET', () => {
  const menu = new BattleMenu();
  player.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
  player.inventory.add(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false));
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.FIGHT);
  menu.selectWeapon(1);
  expect(menu.state).toBe(MenuState.CHOOSE_TARGET);
  expect(menu.selectedWeaponIndex).toBe(1);
});

it('canceling weapon selection returns to CHOOSE_ACTION', () => {
  const menu = new BattleMenu();
  player.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
  player.inventory.add(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false));
  menu.show(player, [enemy]);
  menu.selectAction(MenuAction.FIGHT);
  menu.cancelWeaponSelection();
  expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
  expect(menu.selectedAction).toBeNull();
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```

**Step 3: Implement**

Add to `MenuState`:

```typescript
CHOOSE_WEAPON: 'choose_weapon',
```

Update `BattleMenu`:

```typescript
export class BattleMenu {
  private _selectedWeaponIndex: number | null = null;

  get selectedWeaponIndex(): number | null {
    return this._selectedWeaponIndex;
  }

  show(unit: Unit, enemies: Unit[]): void {
    this._unit = unit;
    this._enemies = enemies;
    this._selectedAction = null;
    this._selectedTarget = null;
    this._selectedItemIndex = null;
    this._selectedWeaponIndex = null;
    this._state = MenuState.CHOOSE_ACTION;
  }

  selectAction(action: MenuAction): void {
    if (this._state !== MenuState.CHOOSE_ACTION) {
      throw new Error(`Cannot select action in state ${this._state}`);
    }
    this._selectedAction = action;
    if (action === MenuAction.END_TURN) {
      this._state = MenuState.RESOLVED;
    } else if (action === MenuAction.STATUS) {
      this._state = MenuState.CHOOSE_STATUS;
    } else if (action === MenuAction.ITEMS) {
      this._state = MenuState.CHOOSE_ITEM;
    } else if (action === MenuAction.FIGHT) {
      const weapons = this._unit?.inventory.items.filter((i) => i.kind === 'weapon') ?? [];
      if (weapons.length > 1) {
        this._state = MenuState.CHOOSE_WEAPON;
      } else {
        if (weapons.length === 1) {
          this._selectedWeaponIndex = this._unit!.inventory.items.findIndex((i) => i.kind === 'weapon');
        }
        this._state = MenuState.CHOOSE_TARGET;
      }
    } else {
      this._state = MenuState.CHOOSE_TARGET;
    }
  }

  selectWeapon(index: number): void {
    if (this._state !== MenuState.CHOOSE_WEAPON) {
      throw new Error(`Cannot select weapon in state ${this._state}`);
    }
    this._selectedWeaponIndex = index;
    this._state = MenuState.CHOOSE_TARGET;
  }

  cancelWeaponSelection(): void {
    if (this._state !== MenuState.CHOOSE_WEAPON) {
      throw new Error(`Cannot cancel weapon selection in state ${this._state}`);
    }
    this._selectedAction = null;
    this._selectedWeaponIndex = null;
    this._state = MenuState.CHOOSE_ACTION;
  }

  reset(): void {
    this._state = MenuState.HIDDEN;
    this._unit = null;
    this._enemies = [];
    this._selectedAction = null;
    this._selectedTarget = null;
    this._selectedItemIndex = null;
    this._selectedWeaponIndex = null;
  }
}
```

**Step 4: Run test — expect PASS**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```

**Step 5: Commit**

```bash
git add src/game/ui/BattleMenu.ts src/game/ui/__tests__/BattleMenu.test.ts
git commit -m "feat: add weapon selection flow in BattleMenu"
```

### Task E2: Make GameEngine resolve combat with selected weapon

**Objective:** `resolvePlayerCombat` accepts optional `attackerWeaponIndex` and uses the selected inventory weapon.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Test: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

In `src/game/__tests__/GameEngine.test.ts`:

```typescript
it('resolvePlayerCombat uses selected inventory weapon', () => {
  const engine = new GameEngine(8, 8);
  const att = engine.addUnit('a1', 'A', 'player', 'lord', stats, 2, 2);
  const def = engine.addUnit('d1', 'D', 'enemy', 'brigand', stats, 2, 3);
  att.inventory.add(createWeaponItem('Killer Sword', 'sword', 7, 85, 30, 1, 1, false));
  const result = engine.resolvePlayerCombat(att, def, undefined, 0);
  expect(result.log.length).toBeGreaterThan(0);
});
```

**Step 2: Run test — expect FAIL**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```

**Step 3: Implement**

Update `resolvePlayerCombat`:

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
  return combat.resolveCombat(attacker, defender, attWeapon, defWeapon, rng);
}
```

Update `getWeaponForUnit` to accept optional index:

```typescript
getWeaponForUnit(unit: Unit, weaponIndex?: number): WeaponData {
  const weaponItems = unit.inventory.items.filter((i) => i.kind === 'weapon');
  if (weaponIndex !== undefined && weaponIndex >= 0 && weaponIndex < unit.inventory.size) {
    const item = unit.inventory.items[weaponIndex];
    if (item && item.kind === 'weapon') {
      return {
        name: item.name,
        type: item.weaponType as WeaponType,
        mt: item.mt,
        hit: item.hit,
        crit: item.crit,
        minRange: item.minRange,
        maxRange: item.maxRange,
        usesMagic: item.usesMagic,
      };
    }
  }
  if (weaponItems.length > 0) {
    const item = weaponItems[0];
    return {
      name: item.name,
      type: item.weaponType as WeaponType,
      mt: item.mt,
      hit: item.hit,
      crit: item.crit,
      minRange: item.minRange,
      maxRange: item.maxRange,
      usesMagic: item.usesMagic,
    };
  }
  // Fallback class defaults
  if (unit.unitClass === 'mage') return WEAPON_DB.Fire;
  if (unit.unitClass === 'brigand') return WEAPON_DB['Iron Axe'];
  if (unit.unitClass === 'berserker') return WEAPON_DB['Killer Axe'];
  if (unit.unitClass === 'soldier') return WEAPON_DB['Iron Lance'];
  if (unit.unitClass === 'swordmaster') return WEAPON_DB['Killer Sword'];
  return WEAPON_DB['Iron Sword'];
}
```

Also update `getCombatPreview`, `getAdjacentEnemies`, `getThreatenedTiles` to use the same helper (without index for now, or with a default).

**Step 4: Run test — expect PASS**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat: GameEngine.resolvePlayerCombat supports selected weapon index"
```

### Task E3: Wire weapon selection into BattleScene

**Objective:** When Fight is clicked, if unit has multiple weapons, show weapon list. Selecting a weapon proceeds to target selection.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Update fight button handler**

In `showPostMoveMenu`, the fight click handler becomes:

```typescript
fightText.on('pointerdown', (_pointer, _lx, _ly, event) => {
  event.stopPropagation();
  this.battleMenu.selectAction(MenuAction.FIGHT);
  this.clearMenuTexts();

  if (this.battleMenu.state === MenuState.CHOOSE_WEAPON) {
    this.showWeaponSelection(this.battleMenu.unit!);
  } else {
    this.highlightEnemyTargets(enemies);
  }
});
```

**Step 2: Add showWeaponSelection / hideWeaponSelection**

```typescript
private weaponOverlay: Phaser.GameObjects.Container | null = null;

private showWeaponSelection(unit: Unit): void {
  this.inputEnabled = false;
  const overlay = this.add.container(0, 0);
  this.weaponOverlay = overlay;

  const bg = this.add.rectangle(
    this.cameras.main.width / 2,
    this.cameras.main.height / 2,
    this.cameras.main.width,
    this.cameras.main.height,
    0x000000,
    0.7,
  );
  overlay.add(bg);

  const cx = this.cameras.main.width / 2;
  const cy = this.cameras.main.height / 2;
  const panel = this.add.rectangle(cx, cy, 260, 240, 0x2c3e50, 0.95);
  panel.setStrokeStyle(2, 0xc0392b);
  overlay.add(panel);

  const title = this.add
    .text(cx, cy - 90, 'Choose Weapon', { fontSize: '18px', color: '#f1c40f', fontStyle: 'bold' })
    .setOrigin(0.5);
  overlay.add(title);

  const weapons = unit.inventory.items.filter((i) => i.kind === 'weapon');
  weapons.forEach((w, idx) => {
    const y = cy - 50 + idx * 36;
    const globalIdx = unit.inventory.items.findIndex((i) => i === w);
    const txt = this.add
      .text(cx, y, `${w.name} [Mt ${w.mt} Hit ${w.hit}]`, {
        fontSize: '14px',
        color: '#ecf0f1',
        backgroundColor: '#34495e',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    overlay.add(txt);

    txt.on('pointerdown', () => {
      this.battleMenu.selectWeapon(globalIdx);
      this.hideWeaponSelection();
      const enemies = this.engine.getAdjacentEnemies(unit);
      this.highlightEnemyTargets(enemies);
    });
  });

  const cancelBtn = this.add
    .text(cx, cy + 90, '[ Cancel ]', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#c0392b',
      padding: { x: 10, y: 4 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  overlay.add(cancelBtn);

  cancelBtn.on('pointerdown', () => {
    this.battleMenu.cancelWeaponSelection();
    this.hideWeaponSelection();
    const enemies = this.engine.getAdjacentEnemies(unit);
    this.battleMenu.show(unit, enemies);
    this.showPostMoveMenu(unit);
  });
}

private hideWeaponSelection(): void {
  this.weaponOverlay?.destroy();
  this.weaponOverlay = null;
  this.inputEnabled = true;
}
```

**Step 3: Pass weapon index into combat resolution**

In `startBattleMode`, update:

```typescript
const result = this.engine.resolvePlayerCombat(
  attacker,
  defender,
  undefined,
  this.battleMenu.selectedWeaponIndex ?? undefined,
);
```

**Step 4: Update outside-menu-click and undoMove for weapon overlay**

```typescript
private handleOutsideMenuClick(): void {
  if (this.weaponOverlay) {
    const unit = this.battleMenu.unit;
    this.battleMenu.cancelWeaponSelection();
    this.hideWeaponSelection();
    if (unit) {
      const enemies = this.engine.getAdjacentEnemies(unit);
      this.battleMenu.show(unit, enemies);
      this.showPostMoveMenu(unit);
    }
    return;
  }
  // ... existing overlays ...
}

private undoMove(): void {
  if (this.weaponOverlay) {
    this.hideWeaponSelection();
    return;
  }
  // ... existing overlays ...
}
```

**Step 5: Manual verification**
- Unit with 1 weapon: Fight → straight to target selection
- Unit with 2+ weapons: Fight → weapon list → select → target selection
- Cancel → back to action menu

**Step 6: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: wire weapon selection overlay into BattleScene"
```

---

## Final Integration & Verification

### Task F1: Run full test suite

```bash
npx vitest run
```
Expected: all tests pass. Ignore pre-existing `tsc --noEmit` noise from patch tool if any.

### Task F2: Manual browser verification checklist

- [ ] Flying unit (pegasus knight) stands on lava → no damage after end turn
- [ ] Non-flying unit on lava → still takes 5 damage
- [ ] Enemy phase: enemies step tile-by-tile instead of sliding direct
- [ ] Post-move menu: Fight, Items, Status, End Turn all visible
- [ ] Status: opens modal, shows correct stats, close returns to menu, unit not exhausted
- [ ] Items: opens list, shows seeded weapons + any added items
- [ ] Use recovery item: HP increases, unit exhausted, returns to map
- [ ] Cancel item use: back to menu, unit not exhausted
- [ ] Fight with 1 weapon: straight to target selection
- [ ] Fight with 2+ weapons: weapon list first, then target selection
- [ ] Combat resolves with selected weapon stats
- [ ] End Turn still exhausts unit correctly
- [ ] Victory/defeat screens still work
- [ ] No Phaser imports in `src/game/`

### Task F3: Update barrel exports

Ensure `src/game/ui/index.ts` exports `StatusWindow` and `ItemMenu`.
Ensure `src/game/items/index.ts` exports `ItemTypes`, `Inventory`.

```typescript
// src/game/ui/index.ts
export * from './BattleMenu';
export * from './BattleDisplayState';
export * from './EnemyPreview';
export * from './ExpPopup';
export * from './StatusWindow';
export * from './ItemMenu';

// src/game/items/index.ts
export * from './ItemTypes';
export * from './Inventory';
```

### Task F4: Commit integration

```bash
git add src/game/ui/index.ts src/game/items/index.ts
git commit -m "chore: export new ui and items modules"
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/game/hazards/TerrainHazardEngine.ts` | Modify | Flying lava immunity |
| `src/game/hazards/__tests__/TerrainHazardEngine.test.ts` | Modify | Tests for flying immunity |
| `src/game/state/ActionQueue.ts` | Modify | Add `path` and `GridPoint` to Action |
| `src/game/ai/Commander.ts` | Modify | Compute and attach cardinal paths |
| `src/game/ai/__tests__/Commander.test.ts` | Modify | Test path attachment |
| `src/game/ui/BattleMenu.ts` | Modify | Add STATUS, ITEMS, weapon selection states |
| `src/game/ui/__tests__/BattleMenu.test.ts` | Modify | Tests for new actions |
| `src/game/ui/StatusWindow.ts` | Create | Pure status modal state |
| `src/game/ui/__tests__/StatusWindow.test.ts` | Create | StatusWindow tests |
| `src/game/ui/ItemMenu.ts` | Create | Pure item menu state |
| `src/game/ui/__tests__/ItemMenu.test.ts` | Create | ItemMenu tests |
| `src/game/items/ItemTypes.ts` | Create | Item discriminated union + factories |
| `src/game/items/__tests__/ItemTypes.test.ts` | Create | Factory tests |
| `src/game/items/Inventory.ts` | Create | 5-slot inventory manager |
| `src/game/items/__tests__/Inventory.test.ts` | Create | Inventory tests |
| `src/game/units/Unit.ts` | Modify | Attach Inventory |
| `src/game/units/__tests__/Unit.test.ts` | Modify | Unit inventory tests |
| `src/game/GameEngine.ts` | Modify | Seed weapons, resolve with weapon index |
| `src/game/__tests__/GameEngine.test.ts` | Modify | Weapon selection tests |
| `src/scenes/BattleScene.ts` | Modify | Render all new UI overlays |
| `src/game/ui/index.ts` | Modify | Export StatusWindow, ItemMenu |
| `src/game/items/index.ts` | Create | Export ItemTypes, Inventory |

---

**Plan complete.** Ready to execute via subagent-driven-development.
