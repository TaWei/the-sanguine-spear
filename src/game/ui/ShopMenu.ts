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
