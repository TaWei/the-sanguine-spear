export interface Item {
  name: string;
  uses: number;
}

export interface ItemUseResult {
  used: boolean;
  itemIndex: number;
}

export type ItemMenuState = 'inactive' | 'item_list' | 'confirm_use';

export class ItemMenu {
  private _state: ItemMenuState = 'inactive';
  private _items: Item[] = [];
  private _selectedIndex: number = -1;

  get state(): ItemMenuState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state !== 'inactive';
  }

  get items(): readonly Item[] {
    return this._items;
  }

  get selectedIndex(): number {
    return this._selectedIndex;
  }

  open(items: Item[]): void {
    this._items = [...items];
    this._selectedIndex = -1;
    this._state = 'item_list';
  }

  selectItem(index: number): void {
    if (this._state !== 'item_list') {
      throw new Error(`Cannot select item in state ${this._state}`);
    }
    if (index < 0 || index >= this._items.length) {
      throw new Error(`Invalid item index ${index}`);
    }
    this._selectedIndex = index;
    this._state = 'confirm_use';
  }

  confirmUse(): ItemUseResult {
    if (this._state !== 'confirm_use') {
      throw new Error(`Cannot confirm use in state ${this._state}`);
    }
    const result: ItemUseResult = {
      used: true,
      itemIndex: this._selectedIndex,
    };
    this._state = 'inactive';
    this._items = [];
    this._selectedIndex = -1;
    return result;
  }

  cancel(): void {
    if (this._state !== 'confirm_use') {
      throw new Error(`Cannot cancel in state ${this._state}`);
    }
    this._selectedIndex = -1;
    this._state = 'item_list';
  }

  close(): void {
    this._state = 'inactive';
    this._items = [];
    this._selectedIndex = -1;
  }
}
