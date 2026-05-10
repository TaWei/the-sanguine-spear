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

  it('Killer weapons have +30 crit', () => {
    expect(WEAPON_DB['Killer Sword'].crit).toBe(30);
    expect(WEAPON_DB['Killer Axe'].crit).toBe(30);
    expect(WEAPON_DB['Killer Lance'].crit).toBe(30);
    expect(WEAPON_DB['Killer Bow'].crit).toBe(30);
  });

  it('Killer weapons preserve their weapon types', () => {
    expect(WEAPON_DB['Killer Sword'].type).toBe(WeaponType.SWORD);
    expect(WEAPON_DB['Killer Axe'].type).toBe(WeaponType.AXE);
    expect(WEAPON_DB['Killer Lance'].type).toBe(WeaponType.LANCE);
    expect(WEAPON_DB['Killer Bow'].type).toBe(WeaponType.BOW);
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

describe('ranged physical weapons', () => {
  it('Javelin exists with correct stats', () => {
    const j = WEAPON_DB['Javelin'];
    expect(j).toBeDefined();
    expect(j.type).toBe(WeaponType.LANCE);
    expect(j.mt).toBe(5);
    expect(j.hit).toBe(65);
    expect(j.crit).toBe(0);
    expect(j.minRange).toBe(1);
    expect(j.maxRange).toBe(2);
    expect(j.usesMagic).toBe(false);
  });

  it('Hand Axe exists with correct stats', () => {
    const h = WEAPON_DB['Hand Axe'];
    expect(h).toBeDefined();
    expect(h.type).toBe(WeaponType.AXE);
    expect(h.mt).toBe(6);
    expect(h.hit).toBe(60);
    expect(h.crit).toBe(0);
    expect(h.minRange).toBe(1);
    expect(h.maxRange).toBe(2);
    expect(h.usesMagic).toBe(false);
  });

  it('Javelin gets triangle advantage vs swords (lance > sword)', () => {
    const mod = getWeaponTriangleMod(WeaponType.LANCE, WeaponType.SWORD);
    expect(mod.mtBonus).toBe(1);
    expect(mod.hitBonus).toBe(15);
  });

  it('Hand Axe gets triangle advantage vs lances (axe > lance)', () => {
    const mod = getWeaponTriangleMod(WeaponType.AXE, WeaponType.LANCE);
    expect(mod.mtBonus).toBe(1);
    expect(mod.hitBonus).toBe(15);
  });

  it('Javelin gets triangle disadvantage vs axes', () => {
    const mod = getWeaponTriangleMod(WeaponType.LANCE, WeaponType.AXE);
    expect(mod.mtBonus).toBe(-1);
    expect(mod.hitBonus).toBe(-15);
  });
});

describe('Effective weapons', () => {
  it('Armorslayer has effectiveAgainst armored', () => {
    const w = WEAPON_DB['Armorslayer'];
    expect(w.effectiveAgainst).toContain('armored');
  });

  it('Hammer has effectiveAgainst armored', () => {
    const w = WEAPON_DB['Hammer'];
    expect(w.effectiveAgainst).toContain('armored');
  });

  it('Horseslayer has effectiveAgainst cavalry', () => {
    const w = WEAPON_DB['Horseslayer'];
    expect(w.effectiveAgainst).toContain('cavalry');
  });

  it('Heavy Spear has effectiveAgainst armored', () => {
    const w = WEAPON_DB['Heavy Spear'];
    expect(w.effectiveAgainst).toContain('armored');
  });

  it('Iron Bow has effectiveAgainst flying', () => {
    const w = WEAPON_DB['Iron Bow'];
    expect(w.effectiveAgainst).toContain('flying');
  });

  it('Killer Bow has effectiveAgainst flying', () => {
    const w = WEAPON_DB['Killer Bow'];
    expect(w.effectiveAgainst).toContain('flying');
  });

  it('non-effective weapons have no effectiveAgainst', () => {
    const w = WEAPON_DB['Iron Sword'];
    expect(w.effectiveAgainst).toBeUndefined();
  });

  it('Fire tome has no effectiveAgainst', () => {
    const w = WEAPON_DB['Fire'];
    expect(w.effectiveAgainst).toBeUndefined();
  });
});

describe('Steel weapons', () => {
  it.each([
    ['Steel Sword', 'sword', 8, 75, 30],
    ['Steel Axe', 'axe', 11, 65, 30],
    ['Steel Lance', 'lance', 10, 70, 30],
    ['Steel Bow', 'bow', 9, 70, 30],
  ])('%s has mt=%i hit=%i', (name, _expectedType, mt, hit) => {
    const w = WEAPON_DB[name];
    expect(w).toBeDefined();
    expect(w.mt).toBe(mt);
    expect(w.hit).toBe(hit);
  });
});

describe('Silver weapons', () => {
  it.each([
    ['Silver Sword', 'sword', 13, 80, 20],
    ['Silver Axe', 'axe', 15, 70, 20],
    ['Silver Lance', 'lance', 14, 75, 20],
    ['Silver Bow', 'bow', 13, 75, 20],
  ])('%s has mt=%i hit=%i', (name, _expectedType, mt, hit) => {
    const w = WEAPON_DB[name];
    expect(w).toBeDefined();
    expect(w.mt).toBe(mt);
    expect(w.hit).toBe(hit);
  });
});

describe('Brave weapons', () => {
  it('Brave weapons have consecutiveAttacks=2', () => {
    expect(WEAPON_DB['Brave Sword'].consecutiveAttacks).toBe(2);
    expect(WEAPON_DB['Brave Axe'].consecutiveAttacks).toBe(2);
    expect(WEAPON_DB['Brave Lance'].consecutiveAttacks).toBe(2);
    expect(WEAPON_DB['Brave Bow'].consecutiveAttacks).toBe(2);
  });
});
