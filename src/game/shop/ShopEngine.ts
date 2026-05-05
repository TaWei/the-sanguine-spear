import type { Item } from '../items/ItemTypes';
import { getSellPrice } from '../items/ItemPrices';
import type { Unit } from '../units/Unit';
import type { ArmyGold } from './ArmyGold';

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
  private readonly _gold: ArmyGold;
  private readonly _stock: ShopItem[];

  constructor(gold: ArmyGold, stock: ShopItem[]) {
    this._gold = gold;
    this._stock = stock;
  }

  get stock(): ShopItem[] {
    return this._stock;
  }

  canBuy(unit: Unit, shopItem: ShopItem): boolean {
    if (shopItem.stock !== undefined && shopItem.stock <= 0) {
      return false;
    }
    if (!this._gold.canAfford(shopItem.price)) {
      return false;
    }
    if (unit.inventory.isFull) {
      return false;
    }
    return true;
  }

  buy(unit: Unit, shopItem: ShopItem): BuyResult {
    if (shopItem.stock !== undefined && shopItem.stock <= 0) {
      return { success: false, reason: 'out_of_stock' };
    }
    if (!this._gold.canAfford(shopItem.price)) {
      return { success: false, reason: 'no_gold' };
    }
    if (unit.inventory.isFull) {
      return { success: false, reason: 'inventory_full' };
    }

    const spent = this._gold.spend(shopItem.price);
    if (!spent) {
      return { success: false, reason: 'no_gold' };
    }

    const cloned = { ...shopItem.item };
    unit.inventory.add(cloned);

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

    const item = unit.inventory.removeAt(itemIndex);
    if (!item) {
      return { success: false, goldReceived: 0 };
    }

    const price = getSellPrice(item.name);
    this._gold.add(price);
    return { success: true, goldReceived: price };
  }

  getSellPrice(item: Item): number {
    return getSellPrice(item.name);
  }
}
