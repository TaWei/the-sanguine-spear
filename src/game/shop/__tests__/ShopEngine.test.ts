import { describe, it, expect } from 'vitest';
import { ShopEngine, ShopItem } from '../ShopEngine';
import { ArmyGold } from '../ArmyGold';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createWeaponItem, createRecoveryItem } from '../../items/ItemTypes';

describe('ShopEngine', () => {
  const makeUnit = (gold?: number) => {
    const stats = createStats({
      hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
    });
    return new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
  };

  const makeSword = () => createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
  const makeVulnerary = () => createRecoveryItem('Vulnerary', 10);

  it('returns current stock', () => {
    const gold = new ArmyGold(1000);
    const stock: ShopItem[] = [
      { item: makeSword(), price: 460 },
      { item: makeVulnerary(), price: 300 },
    ];
    const engine = new ShopEngine(gold, stock);
    expect(engine.stock).toBe(stock);
    expect(engine.stock.length).toBe(2);
  });

  it('canBuy true when space and gold sufficient', () => {
    const gold = new ArmyGold(1000);
    const stock: ShopItem[] = [{ item: makeSword(), price: 460 }];
    const engine = new ShopEngine(gold, stock);
    const unit = makeUnit();
    expect(engine.canBuy(unit, stock[0])).toBe(true);
  });

  it('canBuy false when inventory full', () => {
    const gold = new ArmyGold(1000);
    const stock: ShopItem[] = [{ item: makeSword(), price: 460 }];
    const engine = new ShopEngine(gold, stock);
    const unit = makeUnit();
    for (let i = 0; i < 5; i++) {
      unit.inventory.add(makeVulnerary());
    }
    expect(unit.inventory.isFull).toBe(true);
    expect(engine.canBuy(unit, stock[0])).toBe(false);
  });

  it('canBuy false when gold insufficient', () => {
    const gold = new ArmyGold(100);
    const stock: ShopItem[] = [{ item: makeSword(), price: 460 }];
    const engine = new ShopEngine(gold, stock);
    const unit = makeUnit();
    expect(engine.canBuy(unit, stock[0])).toBe(false);
  });

  it('buy succeeds, adds item, deducts gold', () => {
    const gold = new ArmyGold(1000);
    const stock: ShopItem[] = [{ item: makeSword(), price: 460 }];
    const engine = new ShopEngine(gold, stock);
    const unit = makeUnit();
    const result = engine.buy(unit, stock[0]);
    expect(result.success).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(gold.amount).toBe(540);
    expect(unit.inventory.size).toBe(1);
    expect(unit.inventory.items[0].name).toBe('Iron Sword');
  });

  it('buy fails inventory_full with reason', () => {
    const gold = new ArmyGold(1000);
    const stock: ShopItem[] = [{ item: makeSword(), price: 460 }];
    const engine = new ShopEngine(gold, stock);
    const unit = makeUnit();
    for (let i = 0; i < 5; i++) {
      unit.inventory.add(makeVulnerary());
    }
    const result = engine.buy(unit, stock[0]);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('inventory_full');
    expect(gold.amount).toBe(1000);
    expect(unit.inventory.size).toBe(5);
  });

  it('buy fails no_gold with reason', () => {
    const gold = new ArmyGold(100);
    const stock: ShopItem[] = [{ item: makeSword(), price: 460 }];
    const engine = new ShopEngine(gold, stock);
    const unit = makeUnit();
    const result = engine.buy(unit, stock[0]);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('no_gold');
    expect(gold.amount).toBe(100);
    expect(unit.inventory.size).toBe(0);
  });

  it('canSell true when unit has item', () => {
    const gold = new ArmyGold(1000);
    const engine = new ShopEngine(gold, []);
    const unit = makeUnit();
    unit.inventory.add(makeSword());
    expect(engine.canSell(unit, 0)).toBe(true);
  });

  it('canSell false for invalid index', () => {
    const gold = new ArmyGold(1000);
    const engine = new ShopEngine(gold, []);
    const unit = makeUnit();
    expect(engine.canSell(unit, 0)).toBe(false);
    expect(engine.canSell(unit, -1)).toBe(false);
    expect(engine.canSell(unit, 5)).toBe(false);
  });

  it('sell removes item and adds gold (half buy price)', () => {
    const gold = new ArmyGold(1000);
    const engine = new ShopEngine(gold, []);
    const unit = makeUnit();
    unit.inventory.add(makeSword());
    const result = engine.sell(unit, 0);
    expect(result.success).toBe(true);
    expect(result.goldReceived).toBe(230);
    expect(gold.amount).toBe(1230);
    expect(unit.inventory.size).toBe(0);
  });

  it('sell returns 0 for unsellable items', () => {
    const gold = new ArmyGold(1000);
    const engine = new ShopEngine(gold, []);
    const unit = makeUnit();
    // Unknown item not in ITEM_PRICES
    const unknown = createWeaponItem('Mystery Blade', 'sword', 99, 99, 99, 1, 1, false);
    unit.inventory.add(unknown);
    const result = engine.sell(unit, 0);
    expect(result.success).toBe(true);
    expect(result.goldReceived).toBe(0);
    expect(gold.amount).toBe(1000);
    expect(unit.inventory.size).toBe(0);
  });

  it('getSellPrice returns half buy price', () => {
    const gold = new ArmyGold(1000);
    const engine = new ShopEngine(gold, []);
    const sword = makeSword();
    expect(engine.getSellPrice(sword)).toBe(230);
  });

  it('buying reduces stock when limited, out_of_stock on third try', () => {
    const gold = new ArmyGold(2000);
    const stock: ShopItem[] = [{ item: makeSword(), price: 460, stock: 2 }];
    const engine = new ShopEngine(gold, stock);
    const unit = makeUnit();

    const r1 = engine.buy(unit, stock[0]);
    expect(r1.success).toBe(true);
    expect(stock[0].stock).toBe(1);

    const r2 = engine.buy(unit, stock[0]);
    expect(r2.success).toBe(true);
    expect(stock[0].stock).toBe(0);

    const r3 = engine.buy(unit, stock[0]);
    expect(r3.success).toBe(false);
    expect(r3.reason).toBe('out_of_stock');
    expect(stock[0].stock).toBe(0);
  });
});
