import { describe, it, expect } from 'vitest';
import { ArmyGold } from '../ArmyGold';

describe('ArmyGold', () => {
  it('starts at 0 by default', () => {
    const purse = new ArmyGold();
    expect(purse.amount).toBe(0);
  });

  it('can initialize with starting amount', () => {
    const purse = new ArmyGold(500);
    expect(purse.amount).toBe(500);
  });

  it('add increases amount', () => {
    const purse = new ArmyGold(100);
    purse.add(50);
    expect(purse.amount).toBe(150);
  });

  it('canAfford true when sufficient', () => {
    const purse = new ArmyGold(200);
    expect(purse.canAfford(100)).toBe(true);
    expect(purse.canAfford(200)).toBe(true);
  });

  it('canAfford false when insufficient', () => {
    const purse = new ArmyGold(100);
    expect(purse.canAfford(101)).toBe(false);
    expect(purse.canAfford(500)).toBe(false);
  });

  it('spend deducts and returns true', () => {
    const purse = new ArmyGold(300);
    const result = purse.spend(100);
    expect(result).toBe(true);
    expect(purse.amount).toBe(200);
  });

  it('spend returns false when insufficient', () => {
    const purse = new ArmyGold(50);
    const result = purse.spend(100);
    expect(result).toBe(false);
    expect(purse.amount).toBe(50);
  });

  it('amount never goes below 0', () => {
    const purse = new ArmyGold(-100);
    expect(purse.amount).toBe(0);
  });
});
