export const WeaponType = {
  SWORD: 'sword',
  AXE: 'axe',
  LANCE: 'lance',
  BOW: 'bow',
  MAGIC: 'magic',
} as const;
export type WeaponType = (typeof WeaponType)[keyof typeof WeaponType];

export interface WeaponData {
  name: string;
  type: WeaponType;
  mt: number;
  hit: number;
  crit: number;
  minRange: number;
  maxRange: number;
  usesMagic: boolean;
}

export const WEAPON_DB: Record<string, WeaponData> = {
  'Iron Sword':  { name: 'Iron Sword',  type: WeaponType.SWORD, mt: 5, hit: 90, crit: 0, minRange: 1, maxRange: 1, usesMagic: false },
  'Iron Axe':    { name: 'Iron Axe',    type: WeaponType.AXE,   mt: 8, hit: 70, crit: 0, minRange: 1, maxRange: 1, usesMagic: false },
  'Iron Lance':  { name: 'Iron Lance',  type: WeaponType.LANCE, mt: 6, hit: 80, crit: 0, minRange: 1, maxRange: 1, usesMagic: false },
  'Iron Bow':    { name: 'Iron Bow',    type: WeaponType.BOW,   mt: 6, hit: 85, crit: 0, minRange: 2, maxRange: 2, usesMagic: false },
  'Fire':        { name: 'Fire',        type: WeaponType.MAGIC, mt: 5, hit: 90, crit: 0, minRange: 1, maxRange: 2, usesMagic: true },
};

export interface TriangleMod {
  mtBonus: number;
  hitBonus: number;
}

const ADVANTAGE: Record<string, WeaponType> = {
  [WeaponType.SWORD]: WeaponType.AXE,
  [WeaponType.AXE]:   WeaponType.LANCE,
  [WeaponType.LANCE]: WeaponType.SWORD,
};

export function getWeaponTriangleMod(attacker: WeaponType, defender: WeaponType): TriangleMod {
  if (ADVANTAGE[attacker] === defender) {
    return { mtBonus: 1, hitBonus: 15 };
  }
  if (ADVANTAGE[defender] === attacker) {
    return { mtBonus: -1, hitBonus: -15 };
  }
  return { mtBonus: 0, hitBonus: 0 };
}
