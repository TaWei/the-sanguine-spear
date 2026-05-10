export type WeaponType = 'sword' | 'axe' | 'lance' | 'bow' | 'magic';

export interface BaseItem {
  kind: string;
  name: string;
  uses: number;
}

export interface WeaponItem {
  kind: 'weapon';
  name: string;
  weaponType: WeaponType;
  mt: number;
  hit: number;
  crit: number;
  minRange: number;
  maxRange: number;
  usesMagic: boolean;
  uses: number;
  consecutiveAttacks?: number;
  weight?: number;
  requiredRank?: number;
}

export interface RecoveryItem {
  kind: 'recovery';
  name: string;
  healAmount: number;
  uses: number;
}

export interface KeyItem {
  kind: 'key';
  name: string;
  uses: number;
}

export type StatBoosterStat =
  | 'str'
  | 'mag'
  | 'skl'
  | 'spd'
  | 'luk'
  | 'def'
  | 'res'
  | 'mov'
  | 'maxHp';

export interface StatBoosterItem {
  kind: 'stat_booster';
  name: string;
  stat: StatBoosterStat;
  bonus: number;
  uses: number;
}

export interface StaffItem {
  kind: 'staff';
  name: string;
  healAmount: number;
  minRange: number;
  maxRange: number;
  uses: number;
}

export interface PromotionItem {
  kind: 'promotion';
  name: string;
  targetClasses?: string[]; // null/undefined = any base class
  uses: number;
}

export type Item = WeaponItem | RecoveryItem | KeyItem | StatBoosterItem | StaffItem | PromotionItem;

export function createWeaponItem(
  name: string,
  weaponType: WeaponType,
  mt: number,
  hit: number,
  crit: number,
  minRange: number,
  maxRange: number,
  usesMagic: boolean,
  uses = 40,
  consecutiveAttacks?: number,
  weight?: number,
  requiredRank?: number,
): WeaponItem {
  return {
    kind: 'weapon',
    name,
    weaponType,
    mt,
    hit,
    crit,
    minRange,
    maxRange,
    usesMagic,
    uses,
    ...(consecutiveAttacks !== undefined && { consecutiveAttacks }),
    ...(weight !== undefined && { weight }),
    ...(requiredRank !== undefined && { requiredRank }),
  };
}

export function createRecoveryItem(name: string, healAmount: number): RecoveryItem {
  return {
    kind: 'recovery',
    name,
    healAmount,
    uses: 3,
  };
}

export function createKeyItem(name: string): KeyItem {
  return {
    kind: 'key',
    name,
    uses: 1,
  };
}

export function createStatBoosterItem(
  name: string,
  stat: StatBoosterStat,
  bonus: number,
): StatBoosterItem {
  return {
    kind: 'stat_booster',
    name,
    stat,
    bonus,
    uses: 1,
  };
}

export function createStaffItem(
  name: string,
  healAmount: number,
  minRange: number,
  maxRange: number,
): StaffItem {
  return {
    kind: 'staff',
    name,
    healAmount,
    minRange,
    maxRange,
    uses: 20,
  };
}

export function createPromotionItem(name: string, targetClasses?: string[]): PromotionItem {
  return {
    kind: 'promotion',
    name,
    targetClasses,
    uses: 1,
  };
}
