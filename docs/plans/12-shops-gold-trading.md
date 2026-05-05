# Phase 12: Shops, Gold, and Trading

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task. Enforce strict TDD: write failing test, watch it fail, write minimal code, watch it pass, commit.

**Goal:** Implement a Fire Emblem-style economy and trading system. The player army shares a single gold purse. Shops on the map sell items at fixed prices (sell price = buy price / 2). Adjacent allied units can trade items without consuming their turn action. All pure logic is TDD'd in `src/game/`. Phaser rendering is thin glue in `src/scenes/BattleScene.ts`.

**Architecture:**
- `ArmyGold` — shared purse with `add` / `spend` / `canAfford`
- `ShopEngine` — buy/sell validation and execution
- `TradeEngine` — adjacency check and item exchange between two units
- `ShopMenu` / `TradeMenu` — pure UI state machines (no Phaser)
- `BattleMenu` extended with `TRADE` and `SHOP` actions
- `GameEngine` owns `ArmyGold`, exposes shop/trade operations
- `SaveData` persists gold across saves

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phase 11 (promotion system) complete.

---

## Fire Emblem Mechanics Reference

### Gold
- **Shared purse:** All player units draw from one army-wide gold pool.
- **Starting amount:** Typically 3,000–5,000G in early FE GBA chapters.
- **Income:** Defeating enemies, selling items, chapter clear bonuses.

### Shops
- **Stock:** Fixed per chapter. Weapons come at full durability (40 uses). Consumables at default uses.
- **Buy price:** Fixed per item type.
- **Sell price:** `floor(buyPrice / 2)`.
- **Access:** Unit must be standing on (or adjacent to) a shop tile.
- **Inventory limit:** Cannot buy if unit inventory is full (5 items max).

### Trading
- **Range:** Cardinal-adjacent allied units only (same faction: player + ally).
- **Action cost:** None. Trading does NOT exhaust the unit.
- **Exchange:** Swap items 1-for-1, or give freely if recipient has space.
- **After trade:** The initiator remains in MENU state and can still fight/move.

---

## Task 12.1: ArmyGold — Shared Gold Purse

**Objective:** Create a simple `ArmyGold` class that tracks the player's gold. All player units share this purse.

**Files:**
- Create: `src/game/shop/ArmyGold.ts`
- Create: `src/game/shop/__tests__/ArmyGold.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/shop/__tests__/ArmyGold.test.ts
import { describe, it, expect } from 'vitest';
import { ArmyGold } from '../ArmyGold';

describe('ArmyGold', () => {
  it('starts at 0 by default', () => {
    const gold = new ArmyGold();
    expect(gold.amount).toBe(0);
  });

  it('can initialize with starting amount', () => {
    const gold = new ArmyGold(5000);
    expect(gold.amount).toBe(5000);
  });

  it('add increases amount', () => {
    const gold = new ArmyGold(1000);
    gold.add(500);
    expect(gold.amount).toBe(1500);
  });

  it('canAfford returns true when balance is sufficient', () => {
    const gold = new ArmyGold(1000);
    expect(gold.canAfford(500)).toBe(true);
    expect(gold.canAfford(1000)).toBe(true);
  });

  it('canAfford returns false when balance is insufficient', () => {
    const gold = new ArmyGold(1000);
    expect(gold.canAfford(1001)).toBe(false);
  });

  it('spend deducts amount and returns true on success', () => {
    const gold = new ArmyGold(1000);
    expect(gold.spend(300)).toBe(true);
    expect(gold.amount).toBe(700);
  });

  it('spend returns false and does not deduct when insufficient', () => {
    const gold = new ArmyGold(100);
    expect(gold.spend(200)).toBe(false);
    expect(gold.amount).toBe(100);
  });

  it('amount never goes below 0', () => {
    const gold = new ArmyGold(100);
    gold.add(-500);
    expect(gold.amount).toBe(100);
  });
});
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/shop/__tests__/ArmyGold.test.ts
```

Expected: FAIL — `ArmyGold` not defined.

**Step 3: Write minimal implementation**

```typescript
// src/game/shop/ArmyGold.ts
export class ArmyGold {
  private _amount: number;

  constructor(startingAmount = 0) {
    this._amount = Math.max(0, startingAmount);
  }

  get amount(): number {
    return this._amount;
  }

  add(amount: number): void {
    if (amount > 0) {
      this._amount += amount;
    }
  }

  canAfford(amount: number): boolean {
    return this._amount >= amount;
  }

  spend(amount: number): boolean {
    if (!this.canAfford(amount) || amount <= 0) {
      return false;
    }
    this._amount -= amount;
    return true;
  }
}
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/shop/__tests__/ArmyGold.test.ts
```

**Step 5: Commit**

```bash
git add src/game/shop/ArmyGold.ts src/game/shop/__tests__/ArmyGold.test.ts
git commit -m "feat(shop): add ArmyGold shared purse"
```

---

## Task 12.2: Item Prices and Factory

**Objective:** Define buy prices for all existing items and add a `createItemByName` factory so shops can instantiate items by name.

**Files:**
- Create: `src/game/items/ItemPrices.ts`
- Create: `src/game/items/__tests__/ItemPrices.test.ts`
- Create: `src/game/items/ItemFactory.ts`
- Create: `src/game/items/__tests__/ItemFactory.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/items/__tests__/ItemPrices.test.ts
import { describe, it, expect } from 'vitest';
import { ITEM_PRICES, getSellPrice } from '../ItemPrices';

describe('ItemPrices', () => {
  it('has prices for all base weapons', () => {
    expect(ITEM_PRICES['Iron Sword']).toBeGreaterThan(0);
    expect(ITEM_PRICES['Iron Lance']).toBeGreaterThan(0);
    expect(ITEM_PRICES['Iron Axe']).toBeGreaterThan(0);
    expect(ITEM_PRICES['Iron Bow']).toBeGreaterThan(0);
    expect(ITEM_PRICES['Fire']).toBeGreaterThan(0);
  });

  it('has prices for staves and consumables', () => {
    expect(ITEM_PRICES['Heal']).toBeGreaterThan(0);
    expect(ITEM_PRICES['Vulnerary']).toBeGreaterThan(0);
  });

  it('getSellPrice returns half of buy price (floor)', () => {
    expect(getSellPrice('Iron Sword')).toBe(Math.floor(ITEM_PRICES['Iron Sword'] / 2));
    expect(getSellPrice('Vulnerary')).toBe(Math.floor(ITEM_PRICES['Vulnerary'] / 2));
  });

  it('getSellPrice returns 0 for unknown items', () => {
    expect(getSellPrice('Unknown Item')).toBe(0);
  });
});
```

```typescript
// src/game/items/__tests__/ItemFactory.test.ts
import { describe, it, expect } from 'vitest';
import { createItemByName } from '../ItemFactory';

describe('ItemFactory', () => {
  it('creates Iron Sword weapon', () => {
    const item = createItemByName('Iron Sword');
    expect(item).not.toBeNull();
    expect(item!.kind).toBe('weapon');
    expect(item!.name).toBe('Iron Sword');
  });

  it('creates Heal staff', () => {
    const item = createItemByName('Heal');
    expect(item).not.toBeNull();
    expect(item!.kind).toBe('staff');
    expect(item!.name).toBe('Heal');
  });

  it('creates Vulnerary recovery item', () => {
    const item = createItemByName('Vulnerary');
    expect(item).not.toBeNull();
    expect(item!.kind).toBe('recovery');
    expect(item!.name).toBe('Vulnerary');
  });

  it('returns null for unknown item name', () => {
    expect(createItemByName('Unknown')).toBeNull();
  });

  it('creates unique instances', () => {
    const a = createItemByName('Iron Sword');
    const b = createItemByName('Iron Sword');
    expect(a).not.toBe(b);
  });
});
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/items/__tests__/ItemPrices.test.ts
npx vitest run src/game/items/__tests__/ItemFactory.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/items/ItemPrices.ts
export const ITEM_PRICES: Record<string, number> = {
  'Iron Sword': 460,
  'Iron Lance': 360,
  'Iron Axe': 270,
  'Iron Bow': 540,
  'Fire': 560,
  'Killer Sword': 1200,
  'Killer Axe': 1000,
  'Heal': 600,
  'Vulnerary': 300,
  'Elixir': 900,
  'Door Key': 50,
  'Chest Key': 150,
  'Speedwing': 2500,
  'Goddess Icon': 2500,
  'Master Seal': 2500,
};

export function getSellPrice(itemName: string): number {
  const buy = ITEM_PRICES[itemName];
  if (!buy) return 0;
  return Math.floor(buy / 2);
}
```

```typescript
// src/game/items/ItemFactory.ts
import { Item, createWeaponItem, createRecoveryItem, createStaffItem, createKeyItem, createStatBoosterItem, createPromotionItem } from './ItemTypes';

export function createItemByName(name: string): Item | null {
  switch (name) {
    case 'Iron Sword':
      return createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
    case 'Iron Lance':
      return createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false);
    case 'Iron Axe':
      return createWeaponItem('Iron Axe', 'axe', 8, 70, 0, 1, 1, false);
    case 'Iron Bow':
      return createWeaponItem('Iron Bow', 'bow', 6, 85, 0, 2, 2, false);
    case 'Fire':
      return createWeaponItem('Fire', 'magic', 5, 90, 0, 1, 2, true);
    case 'Killer Sword':
      return createWeaponItem('Killer Sword', 'sword', 7, 85, 30, 1, 1, false);
    case 'Killer Axe':
      return createWeaponItem('Killer Axe', 'axe', 9, 70, 30, 1, 1, false);
    case 'Heal':
      return createStaffItem('Heal', 10, 1, 1);
    case 'Vulnerary':
      return createRecoveryItem('Vulnerary', 10);
    case 'Elixir':
      return createRecoveryItem('Elixir', 20);
    case 'Door Key':
      return createKeyItem('Door Key');
    case 'Chest Key':
      return createKeyItem('Chest Key');
    case 'Speedwing':
      return createStatBoosterItem('Speedwing', 'spd', 2);
    case 'Goddess Icon':
      return createStatBoosterItem('Goddess Icon', 'luk', 2);
    case 'Master Seal':
      return createPromotionItem('Master Seal');
    default:
      return null;
  }
}
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/items/__tests__/ItemPrices.test.ts
npx vitest run src/game/items/__tests__/ItemFactory.test.ts
```

**Step 5: Commit**

```bash
git add src/game/items/ItemPrices.ts src/game/items/ItemFactory.ts
git add src/game/items/__tests__/ItemPrices.test.ts src/game/items/__tests__/ItemFactory.test.ts
git commit -m "feat(items): add price lookup and item factory by name"
```

---

## Task 12.3: ShopEngine — Buy/Sell Logic

**Objective:** Implement pure shop logic: validate buy/sell, deduct/add gold, add/remove items from unit inventory.

**Files:**
- Create: `src/game/shop/ShopEngine.ts`
- Create: `src/game/shop/__tests__/ShopEngine.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/shop/__tests__/ShopEngine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ShopEngine, ShopItem } from '../ShopEngine';
import { ArmyGold } from '../ArmyGold';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createWeaponItem, createRecoveryItem } from '../../items/ItemTypes';

describe('ShopEngine', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  let gold: ArmyGold;
  let engine: ShopEngine;
  let unit: Unit;

  beforeEach(() => {
    gold = new ArmyGold(5000);
    const stock: ShopItem[] = [
      { item: createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false), price: 460 },
      { item: createRecoveryItem('Vulnerary', 10), price: 300 },
    ];
    engine = new ShopEngine(gold, stock);
    unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
  });

  it('returns the current stock', () => {
    expect(engine.stock).toHaveLength(2);
    expect(engine.stock[0].item.name).toBe('Iron Sword');
    expect(engine.stock[0].price).toBe(460);
  });

  it('canBuy returns true when unit has space and gold is sufficient', () => {
    expect(engine.canBuy(unit, engine.stock[0])).toBe(true);
  });

  it('canBuy returns false when unit inventory is full', () => {
    for (let i = 0; i < 5; i++) {
      unit.inventory.add(createRecoveryItem('Vulnerary', 10));
    }
    expect(engine.canBuy(unit, engine.stock[0])).toBe(false);
  });

  it('canBuy returns false when army gold is insufficient', () => {
    gold = new ArmyGold(100);
    engine = new ShopEngine(gold, engine.stock);
    expect(engine.canBuy(unit, engine.stock[0])).toBe(false);
  });

  it('buy succeeds, adds item to inventory and deducts gold', () => {
    const result = engine.buy(unit, engine.stock[0]);
    expect(result.success).toBe(true);
    expect(unit.inventory.size).toBe(1);
    expect(unit.inventory.items[0].name).toBe('Iron Sword');
    expect(gold.amount).toBe(5000 - 460);
  });

  it('buy fails with reason when inventory full', () => {
    for (let i = 0; i < 5; i++) {
      unit.inventory.add(createRecoveryItem('Vulnerary', 10));
    }
    const result = engine.buy(unit, engine.stock[0]);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('inventory_full');
    expect(gold.amount).toBe(5000);
  });

  it('buy fails with reason when gold insufficient', () => {
    gold = new ArmyGold(100);
    engine = new ShopEngine(gold, engine.stock);
    const result = engine.buy(unit, engine.stock[0]);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('no_gold');
  });

  it('canSell returns true when unit has an item', () => {
    unit.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    expect(engine.canSell(unit, 0)).toBe(true);
  });

  it('canSell returns false for invalid index', () => {
    expect(engine.canSell(unit, 0)).toBe(false);
    expect(engine.canSell(unit, -1)).toBe(false);
  });

  it('sell removes item and adds gold', () => {
    unit.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    const result = engine.sell(unit, 0);
    expect(result.success).toBe(true);
    expect(result.goldReceived).toBe(230); // floor(460 / 2)
    expect(unit.inventory.size).toBe(0);
    expect(gold.amount).toBe(5230);
  });

  it('sell returns 0 gold for unsellable items', () => {
    unit.inventory.add(createRecoveryItem('Unknown', 10));
    const result = engine.sell(unit, 0);
    expect(result.success).toBe(true);
    expect(result.goldReceived).toBe(0);
  });

  it('getSellPrice returns half buy price for stocked items', () => {
    expect(engine.getSellPrice(engine.stock[0].item)).toBe(230);
  });

  it('buying reduces stock when stock is limited', () => {
    const limitedStock: ShopItem[] = [
      { item: createRecoveryItem('Vulnerary', 10), price: 300, stock: 2 },
    ];
    engine = new ShopEngine(gold, limitedStock);
    engine.buy(unit, limitedStock[0]);
    engine.buy(unit, limitedStock[0]);
    expect(engine.stock[0].stock).toBe(0);
    const third = engine.buy(unit, limitedStock[0]);
    expect(third.success).toBe(false);
    expect(third.reason).toBe('out_of_stock');
  });
});
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/shop/__tests__/ShopEngine.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/shop/ShopEngine.ts
import { ArmyGold } from './ArmyGold';
import { Unit } from '../units/Unit';
import { Item } from '../items/ItemTypes';
import { getSellPrice } from '../items/ItemPrices';

export interface ShopItem {
  item: Item;
  price: number;
  stock?: number; // undefined = infinite
}

export interface BuyResult {
  success: boolean;
  reason?: string;
}

export interface SellResult {
  success: boolean;
  goldReceived: number;
}

export class ShopEngine {
  constructor(
    private gold: ArmyGold,
    private _stock: ShopItem[],
  ) {}

  get stock(): ShopItem[] {
    return this._stock;
  }

  canBuy(unit: Unit, shopItem: ShopItem): boolean {
    if (shopItem.stock !== undefined && shopItem.stock <= 0) return false;
    if (!this.gold.canAfford(shopItem.price)) return false;
    if (unit.inventory.isFull) return false;
    return true;
  }

  buy(unit: Unit, shopItem: ShopItem): BuyResult {
    if (shopItem.stock !== undefined && shopItem.stock <= 0) {
      return { success: false, reason: 'out_of_stock' };
    }
    if (!this.gold.canAfford(shopItem.price)) {
      return { success: false, reason: 'no_gold' };
    }
    if (unit.inventory.isFull) {
      return { success: false, reason: 'inventory_full' };
    }

    this.gold.spend(shopItem.price);
    unit.inventory.add({ ...shopItem.item }); // clone
    if (shopItem.stock !== undefined) {
      shopItem.stock -= 1;
    }
    return { success: true };
  }

  canSell(unit: Unit, itemIndex: number): boolean {
    return itemIndex >= 0 && itemIndex < unit.inventory.size;
  }

  sell(unit: Unit, itemIndex: number): SellResult {
    if (!this.canSell(unit, itemIndex)) {
      return { success: false, goldReceived: 0 };
    }
    const item = unit.inventory.items[itemIndex];
    const price = this.getSellPrice(item);
    unit.inventory.removeAt(itemIndex);
    this.gold.add(price);
    return { success: true, goldReceived: price };
  }

  getSellPrice(item: Item): number {
    return getSellPrice(item.name);
  }
}
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/shop/__tests__/ShopEngine.test.ts
```

**Step 5: Commit**

```bash
git add src/game/shop/ShopEngine.ts src/game/shop/__tests__/ShopEngine.test.ts
git commit -m "feat(shop): add ShopEngine with buy, sell, and stock"
```

---

## Task 12.4: TradeEngine — Adjacent Unit Item Exchange

**Objective:** Implement trading between two adjacent allied units. Trading does not exhaust either unit.

**Files:**
- Create: `src/game/trade/TradeEngine.ts`
- Create: `src/game/trade/__tests__/TradeEngine.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/trade/__tests__/TradeEngine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TradeEngine } from '../TradeEngine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createWeaponItem, createRecoveryItem } from '../../items/ItemTypes';
import { Grid } from '../../map/Grid';

describe('TradeEngine', () => {
  const engine = new TradeEngine();
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid(10, 10);
  });

  it('canTrade returns true for adjacent player units', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
    grid.placeUnit(a, 2, 2);
    grid.placeUnit(b, 3, 2);
    expect(engine.canTrade(a, b, grid)).toBe(true);
  });

  it('canTrade returns true for player and ally', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('a1', 'B', Faction.ALLY, UnitClass.ARCHER, stats, 2, 3);
    grid.placeUnit(a, 2, 2);
    grid.placeUnit(b, 2, 3);
    expect(engine.canTrade(a, b, grid)).toBe(true);
  });

  it('canTrade returns false when not adjacent', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 5, 5);
    grid.placeUnit(a, 2, 2);
    grid.placeUnit(b, 5, 5);
    expect(engine.canTrade(a, b, grid)).toBe(false);
  });

  it('canTrade returns false with enemy unit', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('e1', 'B', Faction.ENEMY, UnitClass.BRIGAND, stats, 3, 2);
    grid.placeUnit(a, 2, 2);
    grid.placeUnit(b, 3, 2);
    expect(engine.canTrade(a, b, grid)).toBe(false);
  });

  it('canTrade returns false when units are diagonally adjacent', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 3);
    grid.placeUnit(a, 2, 2);
    grid.placeUnit(b, 3, 3);
    expect(engine.canTrade(a, b, grid)).toBe(false);
  });

  it('trade swaps items between units', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    b.inventory.add(createRecoveryItem('Vulnerary', 10));

    const result = engine.trade(a, 0, b, 0);
    expect(result.success).toBe(true);
    expect(a.inventory.items[0].name).toBe('Vulnerary');
    expect(b.inventory.items[0].name).toBe('Iron Sword');
  });

  it('trade allows giving when recipient has space', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));

    const result = engine.trade(a, 0, b, -1);
    expect(result.success).toBe(true);
    expect(a.inventory.size).toBe(0);
    expect(b.inventory.size).toBe(1);
    expect(b.inventory.items[0].name).toBe('Iron Sword');
  });

  it('trade fails when giver has no item at index', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
    const result = engine.trade(a, 0, b, -1);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('invalid_item');
  });

  it('trade fails when recipient is full and not swapping', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    for (let i = 0; i < 5; i++) {
      b.inventory.add(createRecoveryItem('Vulnerary', 10));
    }
    const result = engine.trade(a, 0, b, -1);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('inventory_full');
  });

  it('swap succeeds even when both inventories are full', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
    for (let i = 0; i < 5; i++) {
      a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
      b.inventory.add(createRecoveryItem('Vulnerary', 10));
    }
    const result = engine.trade(a, 0, b, 0);
    expect(result.success).toBe(true);
    expect(a.inventory.size).toBe(5);
    expect(b.inventory.size).toBe(5);
  });
});
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/trade/__tests__/TradeEngine.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/trade/TradeEngine.ts
import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { Item } from '../items/ItemTypes';

export interface TradeResult {
  success: boolean;
  reason?: string;
}

export class TradeEngine {
  canTrade(unitA: Unit, unitB: Unit, grid: Grid): boolean {
    if (unitA.faction === Faction.ENEMY || unitB.faction === Faction.ENEMY) return false;
    if (unitA.faction !== Faction.PLAYER && unitA.faction !== Faction.ALLY) return false;
    if (unitB.faction !== Faction.PLAYER && unitB.faction !== Faction.ALLY) return false;

    // Cardinal adjacency check
    const dx = Math.abs(unitA.gridX - unitB.gridX);
    const dy = Math.abs(unitA.gridY - unitB.gridY);
    if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) return false;

    // Verify grid positions match
    const unitAtA = grid.getUnit(unitA.gridX, unitA.gridY);
    const unitAtB = grid.getUnit(unitB.gridX, unitB.gridY);
    if (unitAtA !== unitA || unitAtB !== unitB) return false;

    return true;
  }

  trade(unitA: Unit, itemIndexA: number, unitB: Unit, itemIndexB: number): TradeResult {
    const itemA = unitA.inventory.items[itemIndexA];
    const itemB = itemIndexB >= 0 ? unitB.inventory.items[itemIndexB] : undefined;

    if (itemIndexA >= 0 && !itemA) {
      return { success: false, reason: 'invalid_item' };
    }
    if (itemIndexB >= 0 && !itemB) {
      return { success: false, reason: 'invalid_item' };
    }

    // Giving (not swapping)
    if (itemIndexA >= 0 && itemIndexB === -1) {
      if (unitB.inventory.isFull) {
        return { success: false, reason: 'inventory_full' };
      }
      unitA.inventory.removeAt(itemIndexA);
      unitB.inventory.add(itemA);
      return { success: true };
    }

    // Receiving (not swapping)
    if (itemIndexA === -1 && itemIndexB >= 0) {
      if (unitA.inventory.isFull) {
        return { success: false, reason: 'inventory_full' };
      }
      unitB.inventory.removeAt(itemIndexB);
      unitA.inventory.add(itemB!);
      return { success: true };
    }

    // Swapping
    if (itemIndexA >= 0 && itemIndexB >= 0) {
      unitA.inventory.removeAt(itemIndexA);
      unitB.inventory.removeAt(itemIndexB);
      unitA.inventory.add(itemB!);
      unitB.inventory.add(itemA);
      return { success: true };
    }

    return { success: false, reason: 'invalid_item' };
  }
}
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/trade/__tests__/TradeEngine.test.ts
```

**Step 5: Commit**

```bash
git add src/game/trade/TradeEngine.ts src/game/trade/__tests__/TradeEngine.test.ts
git commit -m "feat(trade): add TradeEngine for adjacent unit item exchange"
```

---

## Task 12.5: ShopMenu UI State Machine

**Objective:** Pure UI state machine for navigating shop buy/sell menus. No Phaser imports.

**Files:**
- Create: `src/game/ui/ShopMenu.ts`
- Create: `src/game/ui/__tests__/ShopMenu.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/ui/__tests__/ShopMenu.test.ts
import { describe, it, expect } from 'vitest';
import { ShopMenu, ShopMenuState } from '../ShopMenu';
import { createWeaponItem, createRecoveryItem } from '../../items/ItemTypes';
import type { ShopItem } from '../../shop/ShopEngine';

describe('ShopMenu', () => {
  const stock: ShopItem[] = [
    { item: createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false), price: 460 },
    { item: createRecoveryItem('Vulnerary', 10), price: 300 },
  ];

  it('starts inactive', () => {
    const menu = new ShopMenu();
    expect(menu.state).toBe(ShopMenuState.INACTIVE);
    expect(menu.isActive).toBe(false);
  });

  it('opens to browse stock', () => {
    const menu = new ShopMenu();
    menu.open(stock);
    expect(menu.state).toBe(ShopMenuState.BROWSE_BUY);
    expect(menu.stock).toHaveLength(2);
    expect(menu.selectedItemIndex).toBe(-1);
  });

  it('selectBuyItem transitions to confirm buy', () => {
    const menu = new ShopMenu();
    menu.open(stock);
    menu.selectBuyItem(0);
    expect(menu.state).toBe(ShopMenuState.CONFIRM_BUY);
    expect(menu.selectedItemIndex).toBe(0);
  });

  it('confirmBuy returns item and transitions to resolved', () => {
    const menu = new ShopMenu();
    menu.open(stock);
    menu.selectBuyItem(1);
    const result = menu.confirmBuy();
    expect(result.confirmed).toBe(true);
    expect(result.shopItemIndex).toBe(1);
    expect(menu.state).toBe(ShopMenuState.INACTIVE);
  });

  it('cancel returns from confirm to browse', () => {
    const menu = new ShopMenu();
    menu.open(stock);
    menu.selectBuyItem(0);
    expect(menu.state).toBe(ShopMenuState.CONFIRM_BUY);
    menu.cancel();
    expect(menu.state).toBe(ShopMenuState.BROWSE_BUY);
    expect(menu.selectedItemIndex).toBe(-1);
  });

  it('switchToSell changes mode', () => {
    const menu = new ShopMenu();
    menu.open(stock);
    menu.switchToSell();
    expect(menu.state).toBe(ShopMenuState.BROWSE_SELL);
  });

  it('selectSellItem transitions to confirm sell', () => {
    const menu = new ShopMenu();
    menu.open(stock);
    menu.switchToSell();
    menu.selectSellItem(2);
    expect(menu.state).toBe(ShopMenuState.CONFIRM_SELL);
    expect(menu.selectedItemIndex).toBe(2);
  });

  it('confirmSell returns item index and closes', () => {
    const menu = new ShopMenu();
    menu.open(stock);
    menu.switchToSell();
    menu.selectSellItem(0);
    const result = menu.confirmSell();
    expect(result.confirmed).toBe(true);
    expect(result.unitItemIndex).toBe(0);
    expect(menu.state).toBe(ShopMenuState.INACTIVE);
  });

  it('close resets state', () => {
    const menu = new ShopMenu();
    menu.open(stock);
    menu.selectBuyItem(0);
    menu.close();
    expect(menu.state).toBe(ShopMenuState.INACTIVE);
    expect(menu.stock).toHaveLength(0);
  });
});
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/ui/__tests__/ShopMenu.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/ui/ShopMenu.ts
import type { ShopItem } from '../shop/ShopEngine';

export enum ShopMenuState {
  INACTIVE = 'inactive',
  BROWSE_BUY = 'browse_buy',
  CONFIRM_BUY = 'confirm_buy',
  BROWSE_SELL = 'browse_sell',
  CONFIRM_SELL = 'confirm_sell',
}

export interface BuyConfirmResult {
  confirmed: boolean;
  shopItemIndex: number;
}

export interface SellConfirmResult {
  confirmed: boolean;
  unitItemIndex: number;
}

export class ShopMenu {
  private _state = ShopMenuState.INACTIVE;
  private _stock: ShopItem[] = [];
  private _selectedIndex = -1;

  get state(): ShopMenuState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state !== ShopMenuState.INACTIVE;
  }

  get stock(): ShopItem[] {
    return this._stock;
  }

  get selectedItemIndex(): number {
    return this._selectedIndex;
  }

  open(stock: ShopItem[]): void {
    this._stock = [...stock];
    this._selectedIndex = -1;
    this._state = ShopMenuState.BROWSE_BUY;
  }

  selectBuyItem(index: number): void {
    if (this._state !== ShopMenuState.BROWSE_BUY) throw new Error('Not in browse buy');
    this._selectedIndex = index;
    this._state = ShopMenuState.CONFIRM_BUY;
  }

  confirmBuy(): BuyConfirmResult {
    if (this._state !== ShopMenuState.CONFIRM_BUY) throw new Error('Not in confirm buy');
    const idx = this._selectedIndex;
    this.close();
    return { confirmed: true, shopItemIndex: idx };
  }

  switchToSell(): void {
    if (!this.isActive) throw new Error('Shop not open');
    this._selectedIndex = -1;
    this._state = ShopMenuState.BROWSE_SELL;
  }

  switchToBuy(): void {
    if (!this.isActive) throw new Error('Shop not open');
    this._selectedIndex = -1;
    this._state = ShopMenuState.BROWSE_BUY;
  }

  selectSellItem(index: number): void {
    if (this._state !== ShopMenuState.BROWSE_SELL) throw new Error('Not in browse sell');
    this._selectedIndex = index;
    this._state = ShopMenuState.CONFIRM_SELL;
  }

  confirmSell(): SellConfirmResult {
    if (this._state !== ShopMenuState.CONFIRM_SELL) throw new Error('Not in confirm sell');
    const idx = this._selectedIndex;
    this.close();
    return { confirmed: true, unitItemIndex: idx };
  }

  cancel(): void {
    if (this._state === ShopMenuState.CONFIRM_BUY || this._state === ShopMenuState.CONFIRM_SELL) {
      this._selectedIndex = -1;
      this._state = this._state === ShopMenuState.CONFIRM_BUY ? ShopMenuState.BROWSE_BUY : ShopMenuState.BROWSE_SELL;
    }
  }

  close(): void {
    this._state = ShopMenuState.INACTIVE;
    this._stock = [];
    this._selectedIndex = -1;
  }
}
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/ui/__tests__/ShopMenu.test.ts
```

**Step 5: Commit**

```bash
git add src/game/ui/ShopMenu.ts src/game/ui/__tests__/ShopMenu.test.ts
git commit -m "feat(ui): add ShopMenu state machine"
```

---

## Task 12.6: TradeMenu UI State Machine

**Objective:** Pure UI state machine for the trade overlay showing two units' inventories.

**Files:**
- Create: `src/game/ui/TradeMenu.ts`
- Create: `src/game/ui/__tests__/TradeMenu.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/ui/__tests__/TradeMenu.test.ts
import { describe, it, expect } from 'vitest';
import { TradeMenu, TradeMenuState } from '../TradeMenu';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createWeaponItem, createRecoveryItem } from '../../items/ItemTypes';

describe('TradeMenu', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('starts inactive', () => {
    const menu = new TradeMenu();
    expect(menu.state).toBe(TradeMenuState.INACTIVE);
    expect(menu.isActive).toBe(false);
  });

  it('opens with both units inventories', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 1, 0);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    b.inventory.add(createRecoveryItem('Vulnerary', 10));

    const menu = new TradeMenu();
    menu.open(a, b);
    expect(menu.state).toBe(TradeMenuState.SELECT_LEFT);
    expect(menu.leftUnit).toBe(a);
    expect(menu.rightUnit).toBe(b);
    expect(menu.leftItems).toHaveLength(1);
    expect(menu.rightItems).toHaveLength(1);
  });

  it('selectLeftItem transitions to select right', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 1, 0);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    b.inventory.add(createRecoveryItem('Vulnerary', 10));

    const menu = new TradeMenu();
    menu.open(a, b);
    menu.selectLeftItem(0);
    expect(menu.state).toBe(TradeMenuState.SELECT_RIGHT);
    expect(menu.leftSelectedIndex).toBe(0);
  });

  it('selectRightItem with -1 means gift (no swap)', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 1, 0);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));

    const menu = new TradeMenu();
    menu.open(a, b);
    menu.selectLeftItem(0);
    menu.selectRightItem(-1);
    expect(menu.state).toBe(TradeMenuState.RESOLVED);
    expect(menu.leftSelectedIndex).toBe(0);
    expect(menu.rightSelectedIndex).toBe(-1);
  });

  it('selectRightItem with valid index means swap', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 1, 0);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    b.inventory.add(createRecoveryItem('Vulnerary', 10));

    const menu = new TradeMenu();
    menu.open(a, b);
    menu.selectLeftItem(0);
    menu.selectRightItem(0);
    expect(menu.state).toBe(TradeMenuState.RESOLVED);
    expect(menu.leftSelectedIndex).toBe(0);
    expect(menu.rightSelectedIndex).toBe(0);
  });

  it('cancel from select right returns to select left', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 1, 0);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));

    const menu = new TradeMenu();
    menu.open(a, b);
    menu.selectLeftItem(0);
    menu.cancel();
    expect(menu.state).toBe(TradeMenuState.SELECT_LEFT);
    expect(menu.leftSelectedIndex).toBe(-1);
  });

  it('close resets state', () => {
    const a = new Unit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const b = new Unit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 1, 0);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));

    const menu = new TradeMenu();
    menu.open(a, b);
    menu.selectLeftItem(0);
    menu.close();
    expect(menu.state).toBe(TradeMenuState.INACTIVE);
    expect(menu.leftUnit).toBeNull();
    expect(menu.rightUnit).toBeNull();
  });
});
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/ui/__tests__/TradeMenu.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/ui/TradeMenu.ts
import { Unit } from '../units/Unit';
import { Item } from '../items/ItemTypes';

export enum TradeMenuState {
  INACTIVE = 'inactive',
  SELECT_LEFT = 'select_left',
  SELECT_RIGHT = 'select_right',
  RESOLVED = 'resolved',
}

export class TradeMenu {
  private _state = TradeMenuState.INACTIVE;
  private _leftUnit: Unit | null = null;
  private _rightUnit: Unit | null = null;
  private _leftIndex = -1;
  private _rightIndex = -1;

  get state(): TradeMenuState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state !== TradeMenuState.INACTIVE;
  }

  get leftUnit(): Unit | null {
    return this._leftUnit;
  }

  get rightUnit(): Unit | null {
    return this._rightUnit;
  }

  get leftItems(): readonly Item[] {
    return this._leftUnit?.inventory.items ?? [];
  }

  get rightItems(): readonly Item[] {
    return this._rightUnit?.inventory.items ?? [];
  }

  get leftSelectedIndex(): number {
    return this._leftIndex;
  }

  get rightSelectedIndex(): number {
    return this._rightIndex;
  }

  open(leftUnit: Unit, rightUnit: Unit): void {
    this._leftUnit = leftUnit;
    this._rightUnit = rightUnit;
    this._leftIndex = -1;
    this._rightIndex = -1;
    this._state = TradeMenuState.SELECT_LEFT;
  }

  selectLeftItem(index: number): void {
    if (this._state !== TradeMenuState.SELECT_LEFT) throw new Error('Not in select left');
    if (index < 0 || index >= this.leftItems.length) throw new Error('Invalid left index');
    this._leftIndex = index;
    this._state = TradeMenuState.SELECT_RIGHT;
  }

  selectRightItem(index: number): void {
    if (this._state !== TradeMenuState.SELECT_RIGHT) throw new Error('Not in select right');
    if (index !== -1 && (index < 0 || index >= this.rightItems.length)) throw new Error('Invalid right index');
    this._rightIndex = index;
    this._state = TradeMenuState.RESOLVED;
  }

  cancel(): void {
    if (this._state === TradeMenuState.SELECT_RIGHT) {
      this._leftIndex = -1;
      this._state = TradeMenuState.SELECT_LEFT;
    }
  }

  close(): void {
    this._state = TradeMenuState.INACTIVE;
    this._leftUnit = null;
    this._rightUnit = null;
    this._leftIndex = -1;
    this._rightIndex = -1;
  }
}
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/ui/__tests__/TradeMenu.test.ts
```

**Step 5: Commit**

```bash
git add src/game/ui/TradeMenu.ts src/game/ui/__tests__/TradeMenu.test.ts
git commit -m "feat(ui): add TradeMenu state machine"
```

---

## Task 12.7: BattleMenu — Add TRADE and SHOP Actions

**Objective:** Extend `BattleMenu` with `TRADE` and `SHOP` actions and their state transitions.

**Files:**
- Modify: `src/game/ui/BattleMenu.ts`
- Modify: `src/game/ui/__tests__/BattleMenu.test.ts`

**Step 1: Write failing tests**

Add to `src/game/ui/__tests__/BattleMenu.test.ts`:

```typescript
  it('selecting TRADE transitions to CHOOSE_TRADE_TARGET', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.TRADE);
    expect(menu.state).toBe(MenuState.CHOOSE_TRADE_TARGET);
    expect(menu.selectedAction).toBe(MenuAction.TRADE);
  });

  it('selecting SHOP transitions to CHOOSE_SHOP', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.SHOP);
    expect(menu.state).toBe(MenuState.CHOOSE_SHOP);
    expect(menu.selectedAction).toBe(MenuAction.SHOP);
  });

  it('selectTradeTarget transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.TRADE);
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.selectTradeTarget(ally);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedTarget).toBe(ally);
  });

  it('cancelTradeSelection returns to CHOOSE_ACTION', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.TRADE);
    menu.cancelTradeSelection();
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.selectedAction).toBeNull();
  });

  it('stores adjacent allies when shown', () => {
    const menu = new BattleMenu();
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.show(player, [enemy], [], [ally]);
    expect(menu.adjacentAllies).toHaveLength(1);
    expect(menu.adjacentAllies[0].id).toBe('a1');
  });

  it('reset from CHOOSE_TRADE_TARGET returns to hidden', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.TRADE);
    menu.reset();
    expect(menu.state).toBe(MenuState.HIDDEN);
  });
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```

**Step 3: Modify BattleMenu**

In `src/game/ui/BattleMenu.ts`:

1. Add new states:
```typescript
export const MenuState = {
  // ... existing states ...
  CHOOSE_TRADE_TARGET: 'choose_trade_target',
  CHOOSE_SHOP: 'choose_shop',
} as const;
```

2. Add new actions:
```typescript
export const MenuAction = {
  // ... existing actions ...
  TRADE: 'trade',
  SHOP: 'shop',
} as const;
```

3. Add private field:
```typescript
  private _allies: Unit[] = [];
```

4. Add getters:
```typescript
  get adjacentAllies(): readonly Unit[] {
    return this._allies;
  }
```

5. Update `show()` to accept allies:
```typescript
  show(unit: Unit, enemies: Unit[], healTargets: Unit[] = [], allies: Unit[] = []): void {
    this._allies = allies;
    // ... rest of existing show() ...
  }
```

6. Update `selectAction()`:
```typescript
    } else if (action === MenuAction.TRADE) {
      this._state = MenuState.CHOOSE_TRADE_TARGET;
    } else if (action === MenuAction.SHOP) {
      this._state = MenuState.CHOOSE_SHOP;
    }
```

7. Add new methods:
```typescript
  selectTradeTarget(target: Unit): void {
    if (this._state !== MenuState.CHOOSE_TRADE_TARGET) {
      throw new Error(`Cannot select trade target in state ${this._state}`);
    }
    this._selectedTarget = target;
    this._state = MenuState.RESOLVED;
  }

  cancelTradeSelection(): void {
    if (this._state !== MenuState.CHOOSE_TRADE_TARGET) {
      throw new Error(`Cannot cancel trade selection in state ${this._state}`);
    }
    this._selectedTarget = null;
    this._selectedAction = null;
    this._state = MenuState.CHOOSE_ACTION;
  }
```

8. Update `reset()` to clear allies:
```typescript
    this._allies = [];
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/ui/__tests__/BattleMenu.test.ts
```

**Step 5: Commit**

```bash
git add src/game/ui/BattleMenu.ts src/game/ui/__tests__/BattleMenu.test.ts
git commit -m "feat(ui): add TRADE and SHOP actions to BattleMenu"
```

---

## Task 12.8: GameEngine Integration

**Objective:** Wire `ArmyGold`, `ShopEngine`, and `TradeEngine` into `GameEngine`. Add shop placement support to `LevelDefinition`.

**Files:**
- Modify: `src/game/levels/LevelDefinition.ts`
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing tests**

Add to `src/game/__tests__/GameEngine.test.ts`:

```typescript
  it('has starting gold of 0 by default', () => {
    const engine = new GameEngine(10, 10);
    expect(engine.gold.amount).toBe(0);
  });

  it('can add gold to army purse', () => {
    const engine = new GameEngine(10, 10);
    engine.gold.add(5000);
    expect(engine.gold.amount).toBe(5000);
  });

  it('can create a shop from level definition', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    engine.gold.add(5000);

    const shopDef = {
      x: 2,
      y: 2,
      stock: [
        { itemName: 'Iron Sword', price: 460 },
        { itemName: 'Vulnerary', price: 300 },
      ],
    };

    const shop = engine.createShop(shopDef.stock);
    expect(shop.stock).toHaveLength(2);
    expect(shop.canBuy(unit, shop.stock[0])).toBe(true);
  });

  it('canTrade returns true for adjacent allies', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const a = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
    expect(engine.canTrade(a, b)).toBe(true);
  });

  it('canTrade returns false for non-adjacent units', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const a = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 5, 5);
    expect(engine.canTrade(a, b)).toBe(false);
  });

  it('executeTrade swaps items between units', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const a = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const b = engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
    a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    b.inventory.add(createRecoveryItem('Vulnerary', 10));

    const result = engine.executeTrade(a, 0, b, 0);
    expect(result.success).toBe(true);
    expect(a.inventory.items[0].name).toBe('Vulnerary');
    expect(b.inventory.items[0].name).toBe('Iron Sword');
  });

  it('getAdjacentAllies returns player units next to a unit', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const a = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
    engine.addUnit('e1', 'E', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 3);
    const allies = engine.getAdjacentAllies(a);
    expect(allies).toHaveLength(1);
    expect(allies[0].id).toBe('p2');
  });
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```

**Step 3: Modify GameEngine**

In `src/game/GameEngine.ts`:

1. Add imports:
```typescript
import { ArmyGold } from './shop/ArmyGold';
import { ShopEngine, ShopItem } from './shop/ShopEngine';
import { TradeEngine } from './trade/TradeEngine';
import { createItemByName } from './items/ItemFactory';
```

2. Add fields:
```typescript
  readonly gold: ArmyGold;
  private tradeEngine = new TradeEngine();
```

3. Initialize in constructor:
```typescript
  constructor(cols: number, rows: number) {
    // ... existing init ...
    this.gold = new ArmyGold();
  }
```

4. Add methods:
```typescript
  createShop(stockDefs: { itemName: string; price: number; stock?: number }[]): ShopEngine {
    const stock: ShopItem[] = stockDefs
      .map((def) => {
        const item = createItemByName(def.itemName);
        if (!item) return null;
        return { item, price: def.price, stock: def.stock };
      })
      .filter((s): s is ShopItem => s !== null);
    return new ShopEngine(this.gold, stock);
  }

  canTrade(unitA: Unit, unitB: Unit): boolean {
    return this.tradeEngine.canTrade(unitA, unitB, this.grid);
  }

  executeTrade(unitA: Unit, itemIndexA: number, unitB: Unit, itemIndexB: number): import('./trade/TradeEngine').TradeResult {
    return this.tradeEngine.trade(unitA, itemIndexA, unitB, itemIndexB);
  }

  getAdjacentAllies(unit: Unit): Unit[] {
    const neighbors = this.grid.getNeighbors(unit.gridX, unit.gridY);
    const allies: Unit[] = [];
    for (const n of neighbors) {
      const other = this.grid.getUnit(n.x, n.y);
      if (other && other !== unit && other.faction !== Faction.ENEMY) {
        allies.push(other);
      }
    }
    return allies;
  }
```

5. Update `loadLevel` to optionally set starting gold from level def (if present):
```typescript
    // In loadLevel, after existing code:
    if ((def as any).startingGold !== undefined) {
      this.gold = new ArmyGold((def as any).startingGold);
    }
```

6. Update `snapshot` to include gold:
```typescript
      gold: this.gold.amount,
```

7. Update `restore` to restore gold:
```typescript
    this.gold = new ArmyGold(data.gold ?? 0);
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/levels/LevelDefinition.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat(engine): integrate gold, shop, and trade into GameEngine"
```

---

## Task 12.9: SaveData Integration

**Objective:** Persist gold amount in save files.

**Files:**
- Modify: `src/game/save/SaveData.ts`
- Modify: `src/game/save/UnitSerializer.ts` (if needed — no, gold is in SaveData not Unit)
- Modify: `src/game/__tests__/GameEngine.save.test.ts`

**Step 1: Write failing test**

Add to `src/game/__tests__/GameEngine.save.test.ts`:

```typescript
  it('snapshot includes gold amount', () => {
    const engine = new GameEngine(10, 10);
    engine.gold.add(7500);
    const snap = engine.snapshot('test-level');
    expect(snap.gold).toBe(7500);
  });

  it('restore restores gold amount', () => {
    const engine = new GameEngine(10, 10);
    engine.gold.add(5000);
    const snap = engine.snapshot('test-level');

    const engine2 = new GameEngine(10, 10);
    engine2.restore(snap);
    expect(engine2.gold.amount).toBe(5000);
  });
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/__tests__/GameEngine.save.test.ts
```

**Step 3: Modify SaveData**

In `src/game/save/SaveData.ts`, add `gold` field:

```typescript
export interface SaveData {
  // ... existing fields ...
  gold: number;
  // ... rest ...
}
```

In `src/game/GameEngine.ts` `snapshot()`:
```typescript
      gold: this.gold.amount,
```

In `src/game/GameEngine.ts` `restore()`:
```typescript
    this.gold = new ArmyGold(data.gold ?? 0);
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/__tests__/GameEngine.save.test.ts
```

**Step 5: Commit**

```bash
git add src/game/save/SaveData.ts src/game/GameEngine.ts src/game/__tests__/GameEngine.save.test.ts
git commit -m "feat(save): persist army gold in save data"
```

---

## Task 12.10: BattleScene Wiring — Trade Menu

**Objective:** Add Phaser rendering for the trade overlay. When TRADE is selected from the battle menu, show adjacent allies, let the player pick one, then show the trade window.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Understand current flow**

In `BattleScene.ts`, the post-move menu is rendered in `showPostMoveMenu()`. It already shows `[ Fight ]`, `[ Staff ]`, `[ Items ]`, `[ Status ]`, `[ End Turn ]`. We need to add `[ Trade ]` conditionally when `getAdjacentAllies()` returns non-empty.

**Step 2: Add TradeMenu instance**

Add field:
```typescript
  private tradeMenu: TradeMenu = new TradeMenu();
  private tradeOverlay: Phaser.GameObjects.Container | null = null;
```

**Step 3: Add TRADE button to post-move menu**

In `showPostMoveMenu()`, after the Staff button check, add:

```typescript
    // Trade button
    const allies = this.engine.getAdjacentAllies(unit);
    if (allies.length > 0) {
      const tradeBtn = this.add.text(
        menuX,
        menuY + 60 + (hasStaff ? 40 : 0) + (hasItems ? 40 : 0),
        '[ Trade ]',
        { fontSize: '14px', color: '#ffffff', backgroundColor: '#8e44ad', padding: { x: 8, y: 4 } },
      ).setOrigin(0.5).setInteractive({ useHandCursor: true });
      // ... pointerdown handler: select TRADE, clear menu, show trade target selection
    }
```

**Step 4: Implement showTradeTargetSelection**

```typescript
  private showTradeTargetSelection(unit: Unit, allies: Unit[]): void {
    this.clearMenuTexts();
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const overlay = this.add.container(0, 0);
    const bg = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
    overlay.add(bg);

    const panel = this.add.rectangle(cx, cy, 280, 260, 0x2c3e50, 0.95);
    panel.setStrokeStyle(2, 0x8e44ad);
    overlay.add(panel);

    const title = this.add.text(cx, cy - 100, 'Trade with', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    overlay.add(title);

    for (let i = 0; i < allies.length; i++) {
      const ally = allies[i];
      const y = cy - 60 + i * 40;
      const btn = this.add.text(cx, y, `${ally.name}`, {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#34495e', padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.battleMenu.selectTradeTarget(ally);
        this.tradeOverlay?.destroy();
        this.tradeOverlay = null;
        this.showTradeMenu(unit, ally);
      });
      overlay.add(btn);
    }

    const cancelBtn = this.add.text(cx, cy + 80, '[ Cancel ]', {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#c0392b', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.battleMenu.cancelTradeSelection();
      this.tradeOverlay?.destroy();
      this.tradeOverlay = null;
      this.showPostMoveMenu(unit);
    });
    overlay.add(cancelBtn);

    this.tradeOverlay = overlay;
    this.updateSaveBtnVisibility();
  }
```

**Step 5: Implement showTradeMenu**

```typescript
  private showTradeMenu(leftUnit: Unit, rightUnit: Unit): void {
    this.tradeMenu.open(leftUnit, rightUnit);
    this.inputEnabled = false;

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const overlay = this.add.container(0, 0);

    const bg = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
    overlay.add(bg);

    // Left panel
    const leftPanel = this.add.rectangle(cx - 160, cy, 280, 360, 0x2c3e50, 0.95);
    leftPanel.setStrokeStyle(2, 0x3498db);
    overlay.add(leftPanel);

    const leftTitle = this.add.text(cx - 160, cy - 150, leftUnit.name, {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    overlay.add(leftTitle);

    for (let i = 0; i < leftUnit.inventory.items.length; i++) {
      const item = leftUnit.inventory.items[i];
      const y = cy - 100 + i * 36;
      const btn = this.add.text(cx - 160, y, `${item.name} x${item.uses}`, {
        fontSize: '13px', color: '#ffffff', backgroundColor: '#34495e', padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.tradeMenu.selectLeftItem(i);
        this.refreshTradeOverlay(overlay, leftUnit, rightUnit);
      });
      overlay.add(btn);
    }

    // Right panel
    const rightPanel = this.add.rectangle(cx + 160, cy, 280, 360, 0x2c3e50, 0.95);
    rightPanel.setStrokeStyle(2, 0x2ecc71);
    overlay.add(rightPanel);

    const rightTitle = this.add.text(cx + 160, cy - 150, rightUnit.name, {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    overlay.add(rightTitle);

    for (let i = 0; i < rightUnit.inventory.items.length; i++) {
      const item = rightUnit.inventory.items[i];
      const y = cy - 100 + i * 36;
      const btn = this.add.text(cx + 160, y, `${item.name} x${item.uses}`, {
        fontSize: '13px', color: '#ffffff', backgroundColor: '#34495e', padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.tradeMenu.selectRightItem(i);
        this.executeTradeAndClose(leftUnit, rightUnit);
      });
      overlay.add(btn);
    }

    // Give button (select -1 on right)
    const giveBtn = this.add.text(cx + 160, cy + 100, '[ Give ]', {
      fontSize: '13px', color: '#ffffff', backgroundColor: '#8e44ad', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    giveBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.tradeMenu.selectRightItem(-1);
      this.executeTradeAndClose(leftUnit, rightUnit);
    });
    overlay.add(giveBtn);

    // Cancel
    const cancelBtn = this.add.text(cx, cy + 160, '[ Cancel ]', {
      fontSize: '14px', color: '#ffffff', backgroundColor: '#c0392b', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.tradeMenu.close();
      this.tradeOverlay?.destroy();
      this.tradeOverlay = null;
      this.showPostMoveMenu(leftUnit);
    });
    overlay.add(cancelBtn);

    this.tradeOverlay = overlay;
  }
```

**Step 6: Implement executeTradeAndClose**

```typescript
  private executeTradeAndClose(leftUnit: Unit, rightUnit: Unit): void {
    const result = this.engine.executeTrade(leftUnit, this.tradeMenu.leftSelectedIndex, rightUnit, this.tradeMenu.rightSelectedIndex);
    this.tradeMenu.close();
    this.tradeOverlay?.destroy();
    this.tradeOverlay = null;

    if (result.success) {
      // Trade succeeded — unit can still act
      this.showPostMoveMenu(leftUnit);
    } else {
      // Show error briefly then return
      this.showPostMoveMenu(leftUnit);
    }
  }
```

**Step 7: Update showPostMoveMenu call site**

In the existing `showPostMoveMenu()` method, find where it calls `this.battleMenu.show(unit, enemies, healTargets)` and change to:
```typescript
    const allies = this.engine.getAdjacentAllies(unit);
    this.battleMenu.show(unit, enemies, healTargets, allies);
```

**Step 8: Update Escape/backspace handlers**

Ensure Escape/backspace close trade overlays. Add checks:
```typescript
    if (this.tradeOverlay) {
      this.battleMenu.cancelTradeSelection();
      this.tradeMenu.close();
      this.tradeOverlay.destroy();
      this.tradeOverlay = null;
      if (this.selectedUnit) this.showPostMoveMenu(this.selectedUnit);
      return;
    }
```

**Step 9: Run full test suite**

```bash
npx vitest run
```

**Step 10: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(scene): add trade overlay to BattleScene"
```

---

## Task 12.11: BattleScene Wiring — Gold Display

**Objective:** Show the current gold amount somewhere on the battle screen (top-right corner is standard in FE).

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Add gold text field**

Add field:
```typescript
  private goldText: Phaser.GameObjects.Text | null = null;
```

**Step 2: Create gold display in createUI**

In `createUI()`, add:
```typescript
    this.goldText = this.add.text(
      this.cameras.main.width - 16,
      16,
      `G: ${this.engine.gold.amount}`,
      { fontSize: '14px', color: '#f1c40f', fontStyle: 'bold' },
    ).setOrigin(1, 0);
```

**Step 3: Update gold display after shop/trade**

Add helper:
```typescript
  private updateGoldDisplay(): void {
    if (this.goldText) {
      this.goldText.setText(`G: ${this.engine.gold.amount}`);
    }
  }
```

Call `this.updateGoldDisplay()` after any shop buy/sell or at the end of every turn.

**Step 4: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(scene): add gold display to BattleScene"
```

---

## Task 12.12: BattleScene Wiring — Shop Menu (Optional Extension)

**Objective:** If a level defines shop coordinates, render a SHOP action when the unit is on that tile. This is optional if shops are accessed from a pre-battle menu instead.

> **Note:** If you want map-based shops, add `shops?: ShopPlacement[]` to `LevelDefinition` and check unit position against shop coordinates in `showPostMoveMenu()`. If you want between-level shops, implement a `ShopScene` or preparations screen instead. The pure logic (`ShopEngine`, `ShopMenu`) is already built and tested either way.

**For map-based shops:**

1. Add to `LevelDefinition`:
```typescript
export interface ShopPlacement {
  x: number;
  y: number;
  stock: { itemName: string; price: number; stock?: number }[];
}
```

2. In `BattleScene.showPostMoveMenu()`, check if the unit's current tile matches any shop placement. If so, show `[ Shop ]` button that opens the shop overlay using `ShopMenu` and `ShopEngine`.

3. The shop overlay is similar to the trade overlay but uses `ShopMenu` states (`BROWSE_BUY`, `CONFIRM_BUY`, `BROWSE_SELL`, `CONFIRM_SELL`).

4. After buying/selling, the unit remains in MENU state (shopping does not exhaust).

---

## Verification Checklist

Before marking Phase 12 complete:

- [ ] `npx vitest run src/game/shop/__tests__/ArmyGold.test.ts` — all pass
- [ ] `npx vitest run src/game/items/__tests__/ItemPrices.test.ts` — all pass
- [ ] `npx vitest run src/game/items/__tests__/ItemFactory.test.ts` — all pass
- [ ] `npx vitest run src/game/shop/__tests__/ShopEngine.test.ts` — all pass
- [ ] `npx vitest run src/game/trade/__tests__/TradeEngine.test.ts` — all pass
- [ ] `npx vitest run src/game/ui/__tests__/ShopMenu.test.ts` — all pass
- [ ] `npx vitest run src/game/ui/__tests__/TradeMenu.test.ts` — all pass
- [ ] `npx vitest run src/game/ui/__tests__/BattleMenu.test.ts` — all pass
- [ ] `npx vitest run src/game/__tests__/GameEngine.test.ts` — all pass
- [ ] `npx vitest run src/game/__tests__/GameEngine.save.test.ts` — all pass
- [ ] `npx vitest run` — full suite passes
- [ ] In-browser smoke test: load a level, move a unit next to an ally, trade an item, verify unit can still act
- [ ] Gold display updates correctly

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Shared army gold (not per-unit) | Matches FE GBA behavior. Simpler bookkeeping. |
| `createItemByName` factory | Shops need to instantiate fresh items by name. Keeps item creation DRY. |
| Sell price = `floor(buy / 2)` | Canonical FE formula. Prevents buy-sell arbitrage. |
| Trading does not exhaust unit | Matches FE. Trading is a free action. |
| `ShopEngine` takes `ArmyGold` in constructor | Encapsulates gold mutation. Easy to test. |
| `TradeEngine` takes `Grid` for adjacency | Uses actual grid positions, not cached values. |
| Pure `ShopMenu` / `TradeMenu` classes | Follows architecture rule: all UI logic in `src/game/ui/` is testable without Phaser. |
| SaveData stores `gold: number` | Simple scalar. Easy to migrate. |
