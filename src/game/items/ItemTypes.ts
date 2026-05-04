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

export type Item = WeaponItem | RecoveryItem | KeyItem | StatBoosterItem;

export function createWeaponItem(
  name: string,
  weaponType: WeaponType,
  mt: number,
  hit: number,
  crit: number,
  minRange: number,
  maxRange: number,
  usesMagic: boolean,
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
    uses: 40,
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
