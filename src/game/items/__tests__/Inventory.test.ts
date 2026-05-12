import { describe, it, expect } from 'vitest';
import { Inventory } from '../Inventory';
import { createWeaponItem } from '../ItemTypes';

describe('Inventory', () => {
  const sword = () => createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
  const lance = () => createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false);
  const axe = () => createWeaponItem('Iron Axe', 'axe', 8, 70, 0, 1, 1, false);

  it('adds items', () => {
    const inv = new Inventory();
    expect(inv.add(sword())).toBe(true);
    expect(inv.size).toBe(1);
  });

  it('refuses add when full', () => {
    const inv = new Inventory();
    for (let i = 0; i < 5; i++) {
      expect(inv.add(sword())).toBe(true);
    }
    expect(inv.add(sword())).toBe(false);
    expect(inv.size).toBe(5);
  });

  it('inserts at valid index', () => {
    const inv = new Inventory();
    inv.add(sword());
    inv.add(axe());
    expect(inv.insertAt(1, lance())).toBe(true);
    expect(inv.size).toBe(3);
    expect(inv.items[1].name).toBe('Iron Lance');
  });

  it('inserts at end (index === length)', () => {
    const inv = new Inventory();
    inv.add(sword());
    expect(inv.insertAt(1, lance())).toBe(true);
    expect(inv.size).toBe(2);
    expect(inv.items[1].name).toBe('Iron Lance');
  });

  it('insertAt returns false for negative index', () => {
    const inv = new Inventory();
    inv.add(sword());
    expect(inv.insertAt(-1, lance())).toBe(false);
    expect(inv.size).toBe(1);
    expect(inv.items[0].name).toBe('Iron Sword');
  });

  it('insertAt returns false for index > length', () => {
    const inv = new Inventory();
    inv.add(sword());
    expect(inv.insertAt(5, lance())).toBe(false);
    expect(inv.size).toBe(1);
    expect(inv.items[0].name).toBe('Iron Sword');
  });

  it('insertAt returns false when full', () => {
    const inv = new Inventory();
    for (let i = 0; i < 5; i++) {
      inv.add(sword());
    }
    expect(inv.insertAt(0, lance())).toBe(false);
    expect(inv.size).toBe(5);
  });

  it('removeAt throws for negative index', () => {
    const inv = new Inventory();
    inv.add(sword());
    expect(() => inv.removeAt(-1)).toThrow('Invalid index: -1');
  });

  it('removeAt throws for index >= length', () => {
    const inv = new Inventory();
    inv.add(sword());
    expect(() => inv.removeAt(1)).toThrow('Invalid index: 1');
  });

  it('useAt throws for out-of-bounds index', () => {
    const inv = new Inventory();
    inv.add(sword());
    expect(() => inv.useAt(-1)).toThrow('Invalid index: -1');
    expect(() => inv.useAt(1)).toThrow('Invalid index: 1');
  });
});
