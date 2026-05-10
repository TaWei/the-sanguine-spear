import type { WeaponType } from './Weapons';

export enum WeaponRankLevel {
  E = 0,
  D = 1,
  C = 2,
  B = 3,
  A = 4,
  S = 5,
}

export const RANK_LABELS: Record<WeaponRankLevel, string> = {
  [WeaponRankLevel.E]: 'E',
  [WeaponRankLevel.D]: 'D',
  [WeaponRankLevel.C]: 'C',
  [WeaponRankLevel.B]: 'B',
  [WeaponRankLevel.A]: 'A',
  [WeaponRankLevel.S]: 'S',
};

/** WEXP thresholds for each rank: E=0, D=31, C=71, B=121, A=181, S=251 */
export const WEXP_THRESHOLDS: Record<WeaponRankLevel, number> = {
  [WeaponRankLevel.E]: 0,
  [WeaponRankLevel.D]: 31,
  [WeaponRankLevel.C]: 71,
  [WeaponRankLevel.B]: 121,
  [WeaponRankLevel.A]: 181,
  [WeaponRankLevel.S]: 251,
};

export function wexpToRank(wexp: number): WeaponRankLevel {
  if (wexp >= 251) return WeaponRankLevel.S;
  if (wexp >= 181) return WeaponRankLevel.A;
  if (wexp >= 121) return WeaponRankLevel.B;
  if (wexp >= 71) return WeaponRankLevel.C;
  if (wexp >= 31) return WeaponRankLevel.D;
  return WeaponRankLevel.E;
}

export function canWield(rankLevel: WeaponRankLevel, requiredLevel: WeaponRankLevel): boolean {
  return rankLevel >= requiredLevel;
}

export interface WeaponRankData {
  rank: WeaponRankLevel;
  wexp: number;
}

export function createWeaponRank(rank: WeaponRankLevel = WeaponRankLevel.E, wexp = 0): WeaponRankData {
  return { rank, wexp };
}

/** Primary weapon type per class for WEXP bonus (+2 instead of +1). */
export function getPrimaryWeaponType(unitClass: string): WeaponType | null {
  const map: Record<string, WeaponType> = {
    lord: 'sword',
    mercenary: 'sword',
    swordmaster: 'sword',
    brigand: 'axe',
    berserker: 'axe',
    soldier: 'lance',
    cavalry: 'lance',
    paladin: 'lance',
    pegasus_knight: 'lance',
    falcon_knight: 'lance',
    general: 'lance',
    archer: 'bow',
    sniper: 'bow',
    mage: 'magic',
    sage: 'magic',
    thief: 'sword',
  };
  return map[unitClass] ?? null;
}
