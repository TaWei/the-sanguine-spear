import { describe, it, expect } from 'vitest';
import { WeaponRankLevel, wexpToRank, canWield, getPrimaryWeaponType, WEXP_THRESHOLDS } from '../WeaponRank';

describe('wexpToRank', () => {
  it('E rank for WEXP 0-30', () => {
    expect(wexpToRank(0)).toBe(WeaponRankLevel.E);
    expect(wexpToRank(15)).toBe(WeaponRankLevel.E);
    expect(wexpToRank(30)).toBe(WeaponRankLevel.E);
  });
  it('D rank for WEXP 31-70', () => {
    expect(wexpToRank(31)).toBe(WeaponRankLevel.D);
    expect(wexpToRank(70)).toBe(WeaponRankLevel.D);
  });
  it('C rank for WEXP 71-120', () => {
    expect(wexpToRank(71)).toBe(WeaponRankLevel.C);
    expect(wexpToRank(120)).toBe(WeaponRankLevel.C);
  });
  it('B rank for WEXP 121-180', () => {
    expect(wexpToRank(121)).toBe(WeaponRankLevel.B);
  });
  it('A rank for WEXP 181-250', () => {
    expect(wexpToRank(181)).toBe(WeaponRankLevel.A);
  });
  it('S rank for WEXP 251+', () => {
    expect(wexpToRank(251)).toBe(WeaponRankLevel.S);
    expect(wexpToRank(999)).toBe(WeaponRankLevel.S);
  });
});

describe('canWield', () => {
  it('can wield if rank >= required', () => {
    expect(canWield(WeaponRankLevel.C, WeaponRankLevel.C)).toBe(true);
    expect(canWield(WeaponRankLevel.B, WeaponRankLevel.C)).toBe(true);
  });
  it('cannot wield if rank < required', () => {
    expect(canWield(WeaponRankLevel.C, WeaponRankLevel.B)).toBe(false);
  });
});

describe('getPrimaryWeaponType', () => {
  it.each([
    ['lord', 'sword'],
    ['mercenary', 'sword'],
    ['swordmaster', 'sword'],
    ['brigand', 'axe'],
    ['berserker', 'axe'],
    ['cavalry', 'lance'],
    ['paladin', 'lance'],
    ['pegasus_knight', 'lance'],
    ['falcon_knight', 'lance'],
    ['general', 'lance'],
    ['soldier', 'lance'],
    ['archer', 'bow'],
    ['sniper', 'bow'],
    ['mage', 'magic'],
    ['sage', 'magic'],
  ])('%s primary is %s', (cls, wpn) => {
    expect(getPrimaryWeaponType(cls)).toBe(wpn);
  });
});
