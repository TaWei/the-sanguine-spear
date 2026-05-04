import { describe, it, expect } from 'vitest';
import { Inventory } from '../Inventory';
import { createRecoveryItem, createWeaponItem } from '../ItemTypes';

describe('Inventory', () => {
  it('starts empty (size=0, isFull=false)', () => {
    const inv = new Inventory();
    expect(inv.size).toBe(0);
    expect(inv.isFull).toBe(false);
    expect(inv.items).toEqual([]);
  });

  it('adds items up to max 5, rejects 6th', () => {
    const inv = new Inventory();
    const item = createRecoveryItem('Vulnerary', 10);
    for (let i = 0; i < 5; i++) {
      expect(inv.add({ ...item, name: `Vulnerary ${i}` })).toBe(true);
    }
    expect(inv.size).toBe(5);
    expect(inv.isFull).toBe(true);
    expect(inv.add({ ...item, name: 'Vulnerary 5' })).toBe(false);
    expect(inv.size).toBe(5);
  });

  it('removeAt(index) returns item and decrements size', () => {
    const inv = new Inventory();
    const item1 = createRecoveryItem('Vulnerary', 10);
    const item2 = createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
    inv.add(item1);
    inv.add(item2);
    expect(inv.size).toBe(2);
    const removed = inv.removeAt(0);
    expect(removed).toBe(item1);
    expect(inv.size).toBe(1);
    expect(inv.items[0]).toBe(item2);
  });

  it('useAt decrements uses on recovery item, does not remove', () => {
    const inv = new Inventory();
    const item = createRecoveryItem('Vulnerary', 10);
    inv.add(item);
    const result = inv.useAt(0);
    expect(result.item).toBe(item);
    expect(result.consumed).toBe(false);
    expect(item.uses).toBe(2);
    expect(inv.size).toBe(1);
  });

  it('useAt on last use removes item (consumed=true)', () => {
    const inv = new Inventory();
    const item = createRecoveryItem('Vulnerary', 10);
    item.uses = 1;
    inv.add(item);
    const result = inv.useAt(0);
    expect(result.item).toBe(item);
    expect(result.consumed).toBe(true);
    expect(inv.size).toBe(0);
  });

  it('throws on invalid index', () => {
    const inv = new Inventory();
    expect(() => inv.removeAt(0)).toThrow();
    expect(() => inv.useAt(0)).toThrow();
    const item = createRecoveryItem('Vulnerary', 10);
    inv.add(item);
    expect(() => inv.removeAt(5)).toThrow();
    expect(() => inv.useAt(5)).toThrow();
    expect(() => inv.removeAt(-1)).toThrow();
    expect(() => inv.useAt(-1)).toThrow();
  });

  it('items is read-only', () => {
    const inv = new Inventory();
    const item = createRecoveryItem('Vulnerary', 10);
    inv.add(item);
    const items = inv.items;
    expect(() => {
      (items as any[]).push(item);
    }).toThrow();
  });
});
