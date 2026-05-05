import { describe, it, expect } from 'vitest';
import { createItemByName } from '../ItemFactory';

describe('ItemFactory', () => {
  it('creates Iron Sword weapon', () => {
    const item = createItemByName('Iron Sword');
    expect(item).not.toBeNull();
    expect(item!.kind).toBe('weapon');
    expect(item!.name).toBe('Iron Sword');
    expect((item as any).weaponType).toBe('sword');
    expect((item as any).mt).toBe(5);
    expect((item as any).hit).toBe(90);
    expect((item as any).crit).toBe(0);
    expect((item as any).minRange).toBe(1);
    expect((item as any).maxRange).toBe(1);
    expect((item as any).usesMagic).toBe(false);
    expect((item as any).uses).toBe(40);
  });

  it('creates Heal staff', () => {
    const item = createItemByName('Heal');
    expect(item).not.toBeNull();
    expect(item!.kind).toBe('staff');
    expect(item!.name).toBe('Heal');
    expect((item as any).healAmount).toBe(10);
    expect((item as any).minRange).toBe(1);
    expect((item as any).maxRange).toBe(1);
    expect((item as any).uses).toBe(20);
  });

  it('creates Vulnerary recovery item', () => {
    const item = createItemByName('Vulnerary');
    expect(item).not.toBeNull();
    expect(item!.kind).toBe('recovery');
    expect(item!.name).toBe('Vulnerary');
    expect((item as any).healAmount).toBe(10);
    expect((item as any).uses).toBe(3);
  });

  it('returns null for unknown names', () => {
    expect(createItemByName('Unknown Item')).toBeNull();
  });

  it('creates unique instances', () => {
    const a = createItemByName('Iron Sword');
    const b = createItemByName('Iron Sword');
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
