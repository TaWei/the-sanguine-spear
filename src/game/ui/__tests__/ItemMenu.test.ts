import { describe, it, expect } from 'vitest';
import { ItemMenu } from '../ItemMenu';

describe('ItemMenu', () => {
  const items = [
    { name: 'Vulnerary', uses: 3 },
    { name: 'Iron Sword', uses: 40 },
    { name: 'Elixir', uses: 1 },
  ];

  it('is inactive by default', () => {
    const menu = new ItemMenu();
    expect(menu.state).toBe('inactive');
    expect(menu.isActive).toBe(false);
    expect(menu.items).toHaveLength(0);
    expect(menu.selectedIndex).toBe(-1);
  });

  it('opens with inventory and shows items', () => {
    const menu = new ItemMenu();
    menu.open(items);
    expect(menu.state).toBe('item_list');
    expect(menu.isActive).toBe(true);
    expect(menu.items).toHaveLength(3);
    expect(menu.items[0].name).toBe('Vulnerary');
    expect(menu.selectedIndex).toBe(-1);
  });

  it('selectItem enters confirm state', () => {
    const menu = new ItemMenu();
    menu.open(items);
    menu.selectItem(1);
    expect(menu.state).toBe('confirm_use');
    expect(menu.selectedIndex).toBe(1);
    expect(menu.items[menu.selectedIndex].name).toBe('Iron Sword');
  });

  it('confirmUse returns used=true and closes', () => {
    const menu = new ItemMenu();
    menu.open(items);
    menu.selectItem(0);
    const result = menu.confirmUse();
    expect(result.used).toBe(true);
    expect(result.itemIndex).toBe(0);
    expect(menu.state).toBe('inactive');
    expect(menu.isActive).toBe(false);
  });

  it('cancel returns to item list', () => {
    const menu = new ItemMenu();
    menu.open(items);
    menu.selectItem(2);
    expect(menu.state).toBe('confirm_use');
    menu.cancel();
    expect(menu.state).toBe('item_list');
    expect(menu.selectedIndex).toBe(-1);
  });

  it('close resets state', () => {
    const menu = new ItemMenu();
    menu.open(items);
    menu.selectItem(1);
    menu.close();
    expect(menu.state).toBe('inactive');
    expect(menu.items).toHaveLength(0);
    expect(menu.selectedIndex).toBe(-1);
    expect(menu.isActive).toBe(false);
  });
});
