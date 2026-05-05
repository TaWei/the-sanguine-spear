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
