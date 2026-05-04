import { describe, it, expect } from 'vitest';
import {
  createWeaponItem,
  createRecoveryItem,
  createKeyItem,
  createStatBoosterItem,
  type Item,
  type WeaponItem,
  type RecoveryItem,
  type KeyItem,
  type StatBoosterItem,
} from '../ItemTypes';

describe('createWeaponItem', () => {
  it('returns a weapon item with correct properties', () => {
    const item = createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
    expect(item.kind).toBe('weapon');
    expect(item.name).toBe('Iron Sword');
    expect(item.weaponType).toBe('sword');
    expect(item.mt).toBe(5);
    expect(item.hit).toBe(90);
    expect(item.crit).toBe(0);
    expect(item.minRange).toBe(1);
    expect(item.maxRange).toBe(1);
    expect(item.usesMagic).toBe(false);
    expect(item.uses).toBe(40);
  });

  it('defaults uses to 40', () => {
    const item = createWeaponItem('Fire', 'magic', 5, 90, 0, 1, 2, true);
    expect(item.uses).toBe(40);
  });

  it('can be typed as Item', () => {
    const item: Item = createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false);
    expect(item.kind).toBe('weapon');
  });
});

describe('createRecoveryItem', () => {
  it('returns a recovery item with correct properties', () => {
    const item = createRecoveryItem('Vulnerary', 10);
    expect(item.kind).toBe('recovery');
    expect(item.name).toBe('Vulnerary');
    expect(item.healAmount).toBe(10);
    expect(item.uses).toBe(3);
  });

  it('defaults uses to 3', () => {
    const item = createRecoveryItem('Elixir', 20);
    expect(item.uses).toBe(3);
  });

  it('can be typed as Item', () => {
    const item: Item = createRecoveryItem('Vulnerary', 10);
    expect(item.kind).toBe('recovery');
  });
});

describe('createKeyItem', () => {
  it('returns a key item with correct properties', () => {
    const item = createKeyItem('Door Key');
    expect(item.kind).toBe('key');
    expect(item.name).toBe('Door Key');
    expect(item.uses).toBe(1);
  });

  it('defaults uses to 1', () => {
    const item = createKeyItem('Chest Key');
    expect(item.uses).toBe(1);
  });

  it('can be typed as Item', () => {
    const item: Item = createKeyItem('Door Key');
    expect(item.kind).toBe('key');
  });
});

describe('createStatBoosterItem', () => {
  it('returns a stat booster item with correct properties', () => {
    const item = createStatBoosterItem('Energy Ring', 'str', 2);
    expect(item.kind).toBe('stat_booster');
    expect(item.name).toBe('Energy Ring');
    expect(item.stat).toBe('str');
    expect(item.bonus).toBe(2);
    expect(item.uses).toBe(1);
  });

  it('defaults uses to 1', () => {
    const item = createStatBoosterItem('Secret Book', 'skl', 2);
    expect(item.uses).toBe(1);
  });

  it('accepts all valid stat types', () => {
    const stats: StatBoosterItem['stat'][] = ['str', 'mag', 'skl', 'spd', 'luk', 'def', 'res', 'mov', 'maxHp'];
    for (const stat of stats) {
      const item = createStatBoosterItem(`Boost-${stat}`, stat, 1);
      expect(item.stat).toBe(stat);
    }
  });

  it('can be typed as Item', () => {
    const item: Item = createStatBoosterItem('Energy Ring', 'str', 2);
    expect(item.kind).toBe('stat_booster');
  });
});

describe('Item discriminated union', () => {
  it('narrows types via kind property', () => {
    const items: Item[] = [
      createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false),
      createRecoveryItem('Vulnerary', 10),
      createKeyItem('Door Key'),
      createStatBoosterItem('Energy Ring', 'str', 2),
    ];

    for (const item of items) {
      if (item.kind === 'weapon') {
        expect(item.weaponType).toBeDefined();
      } else if (item.kind === 'recovery') {
        expect(item.healAmount).toBeDefined();
      } else if (item.kind === 'key') {
        expect(item.name).toBeDefined();
      } else if (item.kind === 'stat_booster') {
        expect(item.stat).toBeDefined();
        expect(item.bonus).toBeDefined();
      }
    }
  });
});
