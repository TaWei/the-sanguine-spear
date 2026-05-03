import { describe, it, expect } from 'vitest';
import { WEAPON_DB, WeaponType, getWeaponTriangleMod } from '../Weapons';

describe('Weapon DB', () => {
  it('Iron Sword has correct stats', () => {
    const sword = WEAPON_DB['Iron Sword'];
    expect(sword).toBeDefined();
    expect(sword.type).toBe(WeaponType.SWORD);
    expect(sword.mt).toBe(5);
    expect(sword.hit).toBe(90);
    expect(sword.crit).toBe(0);
    expect(sword.minRange).toBe(1);
    expect(sword.maxRange).toBe(1);
  });

  it('Fire tome uses magic', () => {
    const fire = WEAPON_DB.Fire;
    expect(fire.type).toBe(WeaponType.MAGIC);
    expect(fire.mt).toBe(5);
    expect(fire.hit).toBe(90);
    expect(fire.minRange).toBe(1);
    expect(fire.maxRange).toBe(2);
  });

  it('Iron Bow has 2 range', () => {
    const bow = WEAPON_DB['Iron Bow'];
    expect(bow.minRange).toBe(2);
    expect(bow.maxRange).toBe(2);
  });
});

describe('Weapon Triangle', () => {
  it('sword beats axe (+1 mt, +15 hit)', () => {
    const mod = getWeaponTriangleMod(WeaponType.SWORD, WeaponType.AXE);
    expect(mod.mtBonus).toBe(1);
    expect(mod.hitBonus).toBe(15);
  });

  it('axe beats lance (+1 mt, +15 hit)', () => {
    const mod = getWeaponTriangleMod(WeaponType.AXE, WeaponType.LANCE);
    expect(mod.mtBonus).toBe(1);
    expect(mod.hitBonus).toBe(15);
  });

  it('lance beats sword (+1 mt, +15 hit)', () => {
    const mod = getWeaponTriangleMod(WeaponType.LANCE, WeaponType.SWORD);
    expect(mod.mtBonus).toBe(1);
    expect(mod.hitBonus).toBe(15);
  });

  it('disadvantage: lance vs axe (-1 mt, -15 hit)', () => {
    const mod = getWeaponTriangleMod(WeaponType.LANCE, WeaponType.AXE);
    expect(mod.mtBonus).toBe(-1);
    expect(mod.hitBonus).toBe(-15);
  });

  it('neutral: same weapon type (0, 0)', () => {
    const mod = getWeaponTriangleMod(WeaponType.SWORD, WeaponType.SWORD);
    expect(mod.mtBonus).toBe(0);
    expect(mod.hitBonus).toBe(0);
  });

  it('neutral: magic vs sword (0, 0)', () => {
    const mod = getWeaponTriangleMod(WeaponType.MAGIC, WeaponType.SWORD);
    expect(mod.mtBonus).toBe(0);
    expect(mod.hitBonus).toBe(0);
  });

  it('neutral: bow vs anything (0, 0)', () => {
    const mod = getWeaponTriangleMod(WeaponType.BOW, WeaponType.AXE);
    expect(mod.mtBonus).toBe(0);
    expect(mod.hitBonus).toBe(0);
  });
});
