import { describe, it, expect } from 'vitest';
import { ITEM_PRICES, getSellPrice } from '../ItemPrices';

describe('ItemPrices', () => {
  it('has prices for base weapons', () => {
    expect(ITEM_PRICES['Iron Sword']).toBe(460);
    expect(ITEM_PRICES['Iron Lance']).toBe(360);
    expect(ITEM_PRICES['Iron Axe']).toBe(270);
    expect(ITEM_PRICES['Iron Bow']).toBe(540);
    expect(ITEM_PRICES['Fire']).toBe(560);
    expect(ITEM_PRICES['Killer Sword']).toBe(1200);
    expect(ITEM_PRICES['Killer Axe']).toBe(1000);
  });

  it('has prices for staves', () => {
    expect(ITEM_PRICES['Heal']).toBe(600);
  });

  it('has prices for consumables', () => {
    expect(ITEM_PRICES['Vulnerary']).toBe(300);
    expect(ITEM_PRICES['Elixir']).toBe(900);
    expect(ITEM_PRICES['Door Key']).toBe(50);
    expect(ITEM_PRICES['Chest Key']).toBe(150);
  });

  it('has prices for stat boosters and promotion items', () => {
    expect(ITEM_PRICES['Speedwing']).toBe(2500);
    expect(ITEM_PRICES['Goddess Icon']).toBe(2500);
    expect(ITEM_PRICES['Master Seal']).toBe(2500);
  });

  it('getSellPrice returns half the buy price floored', () => {
    expect(getSellPrice('Iron Sword')).toBe(230);
    expect(getSellPrice('Iron Lance')).toBe(180);
    expect(getSellPrice('Iron Axe')).toBe(135);
    expect(getSellPrice('Iron Bow')).toBe(270);
    expect(getSellPrice('Fire')).toBe(280);
    expect(getSellPrice('Heal')).toBe(300);
    expect(getSellPrice('Vulnerary')).toBe(150);
    expect(getSellPrice('Door Key')).toBe(25);
    expect(getSellPrice('Master Seal')).toBe(1250);
  });

  it('getSellPrice returns 0 for unknown items', () => {
    expect(getSellPrice('Unknown Item')).toBe(0);
  });
});
