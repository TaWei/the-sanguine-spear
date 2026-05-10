export const UnitClass = {
  LORD: 'lord',
  MERCENARY: 'mercenary',
  MAGE: 'mage',
  ARCHER: 'archer',
  CAVALRY: 'cavalry',
  PEGASUS_KNIGHT: 'pegasus_knight',
  SOLDIER: 'soldier',
  BRIGAND: 'brigand',
  SWORDMASTER: 'swordmaster',
  BERSERKER: 'berserker',
  PALADIN: 'paladin',
  SAGE: 'sage',
  SNIPER: 'sniper',
  FALCON_KNIGHT: 'falcon_knight',
  GENERAL: 'general',
  THIEF: 'thief',
  ASSASSIN: 'assassin',
  WRAITH_KNIGHT: 'wraith_knight',
} as const;

export type UnitTier = 'base' | 'promoted';

export type UnitClass = (typeof UnitClass)[keyof typeof UnitClass];
