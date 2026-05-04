import { UnitClass } from '../units/Unit';
import { UnitStats } from '../units/Stats';

export interface PromoBonus {
  hp: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export const PROMOTION_TREE: Record<string, string> = {
  [UnitClass.LORD]: 'paladin',
  [UnitClass.MERCENARY]: 'swordmaster',
  [UnitClass.MAGE]: 'sage',
  [UnitClass.ARCHER]: 'sniper',
  [UnitClass.CAVALRY]: 'paladin',
  [UnitClass.PEGASUS_KNIGHT]: 'falcon_knight',
  [UnitClass.SOLDIER]: 'general',
  [UnitClass.BRIGAND]: 'berserker',
};

export function getPromotedClass(unitClass: UnitClass): string | null {
  return PROMOTION_TREE[unitClass] ?? null;
}

export const CLASS_PROMO_BONUSES: Record<string, PromoBonus> = {
  paladin: { hp: 4, str: 3, mag: 0, skl: 2, spd: 2, luk: 2, def: 3, res: 2, mov: 1 },
  swordmaster: { hp: 3, str: 2, mag: 0, skl: 3, spd: 3, luk: 2, def: 1, res: 1, mov: 1 },
  sage: { hp: 3, str: 0, mag: 4, skl: 2, spd: 2, luk: 2, def: 1, res: 3, mov: 1 },
  sniper: { hp: 3, str: 2, mag: 0, skl: 3, spd: 2, luk: 2, def: 2, res: 1, mov: 1 },
  falcon_knight: { hp: 3, str: 2, mag: 2, skl: 2, spd: 3, luk: 2, def: 1, res: 3, mov: 1 },
  general: { hp: 5, str: 2, mag: 0, skl: 1, spd: 0, luk: 1, def: 4, res: 2, mov: 0 },
  berserker: { hp: 4, str: 4, mag: 0, skl: 1, spd: 2, luk: 0, def: 2, res: 0, mov: 1 },
};

export const PROMOTED_CLASS_BASES: Record<string, Partial<UnitStats>> = {
  paladin: { hp: 24, str: 9, mag: 3, skl: 8, spd: 8, luk: 7, def: 8, res: 5, mov: 7 },
  swordmaster: { hp: 22, str: 8, mag: 2, skl: 10, spd: 10, luk: 7, def: 6, res: 4, mov: 6 },
  sage: { hp: 20, str: 3, mag: 9, skl: 8, spd: 7, luk: 7, def: 4, res: 8, mov: 6 },
  sniper: { hp: 22, str: 8, mag: 2, skl: 10, spd: 8, luk: 7, def: 6, res: 4, mov: 6 },
  falcon_knight: { hp: 22, str: 7, mag: 4, skl: 8, spd: 10, luk: 8, def: 5, res: 8, mov: 8 },
  general: { hp: 28, str: 9, mag: 2, skl: 6, spd: 5, luk: 5, def: 10, res: 5, mov: 5 },
  berserker: { hp: 26, str: 11, mag: 1, skl: 6, spd: 7, luk: 4, def: 6, res: 3, mov: 6 },
};
