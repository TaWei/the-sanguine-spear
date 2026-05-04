import { describe, it, expect } from 'vitest';
import { PROMOTION_TREE, getPromotedClass, CLASS_PROMO_BONUSES, PROMOTED_CLASS_BASES } from '../PromotionData';
import { UnitClass } from '../../units/Unit';

describe('PromotionData', () => {
  it('every unpromoted class has a promotion target', () => {
    const baseClasses = [
      UnitClass.LORD,
      UnitClass.MERCENARY,
      UnitClass.MAGE,
      UnitClass.ARCHER,
      UnitClass.CAVALRY,
      UnitClass.PEGASUS_KNIGHT,
      UnitClass.SOLDIER,
      UnitClass.BRIGAND,
    ];
    for (const cls of baseClasses) {
      expect(getPromotedClass(cls)).toBeDefined();
      expect(getPromotedClass(cls)).not.toBeNull();
    }
  });

  it('lord promotes to paladin', () => {
    expect(getPromotedClass(UnitClass.LORD)).toBe('paladin');
  });

  it('mercenary promotes to swordmaster', () => {
    expect(getPromotedClass(UnitClass.MERCENARY)).toBe('swordmaster');
  });

  it('mage promotes to sage', () => {
    expect(getPromotedClass(UnitClass.MAGE)).toBe('sage');
  });

  it('archer promotes to sniper', () => {
    expect(getPromotedClass(UnitClass.ARCHER)).toBe('sniper');
  });

  it('cavalry promotes to paladin', () => {
    expect(getPromotedClass(UnitClass.CAVALRY)).toBe('paladin');
  });

  it('pegasus_knight promotes to falcon_knight', () => {
    expect(getPromotedClass(UnitClass.PEGASUS_KNIGHT)).toBe('falcon_knight');
  });

  it('soldier promotes to general', () => {
    expect(getPromotedClass(UnitClass.SOLDIER)).toBe('general');
  });

  it('brigand promotes to berserker', () => {
    expect(getPromotedClass(UnitClass.BRIGAND)).toBe('berserker');
  });

  it('promoted classes have bonus definitions', () => {
    const bonuses = CLASS_PROMO_BONUSES.paladin;
    expect(bonuses).toBeDefined();
    expect(bonuses.hp).toBeGreaterThanOrEqual(0);
  });

  it('promoted classes do not promote further', () => {
    expect(getPromotedClass(UnitClass.SWORDMASTER)).toBeNull();
    expect(getPromotedClass(UnitClass.BERSERKER)).toBeNull();
  });

  it('every promotion target has base stats defined', () => {
    const targets = Object.values(PROMOTION_TREE);
    for (const target of targets) {
      expect(PROMOTED_CLASS_BASES[target]).toBeDefined();
    }
  });
});
