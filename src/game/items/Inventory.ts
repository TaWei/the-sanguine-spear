import type { Item } from './ItemTypes';

export interface UseResult {
  item: Item;
  consumed: boolean;
}

export class Inventory {
  private readonly _items: Item[] = [];
  private readonly _max = 5;

  add(item: Item): boolean {
    if (this._items.length >= this._max) {
      return false;
    }
    this._items.push(item);
    return true;
  }

  removeAt(index: number): Item | undefined {
    if (index < 0 || index >= this._items.length) {
      throw new Error(`Invalid index: ${index}`);
    }
    const [removed] = this._items.splice(index, 1);
    return removed;
  }

  insertAt(index: number, item: Item): boolean {
    if (this._items.length >= this._max) {
      return false;
    }
    this._items.splice(index, 0, item);
    return true;
  }

  useAt(index: number): UseResult {
    if (index < 0 || index >= this._items.length) {
      throw new Error(`Invalid index: ${index}`);
    }
    const item = this._items[index];
    item.uses -= 1;
    if (item.uses <= 0) {
      this._items.splice(index, 1);
      return { item, consumed: true };
    }
    return { item, consumed: false };
  }

  get items(): readonly Item[] {
    return Object.freeze([...this._items]);
  }

  get size(): number {
    return this._items.length;
  }

  get isFull(): boolean {
    return this._items.length >= this._max;
  }
}
