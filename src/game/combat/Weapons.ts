export const WeaponType = {
  SWORD: 'sword',
  AXE: 'axe',
  LANCE: 'lance',
  BOW: 'bow',
  MAGIC: 'magic',
} as const;
export type WeaponType = (typeof WeaponType)[keyof typeof WeaponType];

import type { UnitClassTag } from './Effectiveness';
import { WeaponRankLevel } from './WeaponRank';

export interface WeaponData {
  name: string;
  type: WeaponType;
  mt: number;
  hit: number;
  crit: number;
  minRange: number;
  maxRange: number;
  usesMagic: boolean;
  effectiveAgainst?: UnitClassTag[];
  consecutiveAttacks?: number;
  weight?: number;
  requiredRank?: WeaponRankLevel;
}

export const WEAPON_DB: Record<string, WeaponData> = {
  'Iron Sword': {
    name: 'Iron Sword',
    type: WeaponType.SWORD,
    mt: 5,
    hit: 90,
    crit: 0,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
  },
  'Iron Axe': {
    name: 'Iron Axe',
    type: WeaponType.AXE,
    mt: 8,
    hit: 70,
    crit: 0,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
  },
  'Iron Lance': {
    name: 'Iron Lance',
    type: WeaponType.LANCE,
    mt: 6,
    hit: 80,
    crit: 0,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
  },
  'Iron Bow': {
    name: 'Iron Bow',
    type: WeaponType.BOW,
    mt: 6,
    hit: 85,
    crit: 0,
    minRange: 2,
    maxRange: 2,
    usesMagic: false,
    effectiveAgainst: ['flying'],
  },
  Fire: {
    name: 'Fire',
    type: WeaponType.MAGIC,
    mt: 5,
    hit: 90,
    crit: 0,
    minRange: 1,
    maxRange: 2,
    usesMagic: true,
  },
  'Killer Sword': {
    name: 'Killer Sword',
    type: WeaponType.SWORD,
    mt: 7,
    hit: 85,
    crit: 30,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
    requiredRank: WeaponRankLevel.C,
  },
  'Killer Axe': {
    name: 'Killer Axe',
    type: WeaponType.AXE,
    mt: 9,
    hit: 70,
    crit: 30,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
    requiredRank: WeaponRankLevel.C,
  },
  'Killer Lance': {
    name: 'Killer Lance',
    type: WeaponType.LANCE,
    mt: 8,
    hit: 75,
    crit: 30,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
    requiredRank: WeaponRankLevel.C,
  },
  'Killer Bow': {
    name: 'Killer Bow',
    type: WeaponType.BOW,
    mt: 7,
    hit: 80,
    crit: 30,
    minRange: 2,
    maxRange: 2,
    usesMagic: false,
    effectiveAgainst: ['flying'],
    requiredRank: WeaponRankLevel.C,
  },
  Armorslayer: {
    name: 'Armorslayer',
    type: WeaponType.SWORD,
    mt: 8,
    hit: 80,
    crit: 0,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
    effectiveAgainst: ['armored'],
    requiredRank: WeaponRankLevel.D,
  },
  Hammer: {
    name: 'Hammer',
    type: WeaponType.AXE,
    mt: 8,
    hit: 55,
    crit: 0,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
    effectiveAgainst: ['armored'],
    requiredRank: WeaponRankLevel.D,
  },
  Horseslayer: {
    name: 'Horseslayer',
    type: WeaponType.LANCE,
    mt: 7,
    hit: 70,
    crit: 0,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
    effectiveAgainst: ['cavalry'],
    requiredRank: WeaponRankLevel.D,
  },
  'Heavy Spear': {
    name: 'Heavy Spear',
    type: WeaponType.LANCE,
    mt: 9,
    hit: 70,
    crit: 0,
    minRange: 1,
    maxRange: 1,
    usesMagic: false,
    effectiveAgainst: ['armored'],
    requiredRank: WeaponRankLevel.D,
  },
  'Steel Sword': {
    name: 'Steel Sword', type: WeaponType.SWORD,
    mt: 8, hit: 75, crit: 0,
    minRange: 1, maxRange: 1, usesMagic: false,
    weight: 10, requiredRank: WeaponRankLevel.D,
  },
  'Steel Axe': {
    name: 'Steel Axe', type: WeaponType.AXE,
    mt: 11, hit: 65, crit: 0,
    minRange: 1, maxRange: 1, usesMagic: false,
    weight: 15, requiredRank: WeaponRankLevel.D,
  },
  'Steel Lance': {
    name: 'Steel Lance', type: WeaponType.LANCE,
    mt: 10, hit: 70, crit: 0,
    minRange: 1, maxRange: 1, usesMagic: false,
    weight: 13, requiredRank: WeaponRankLevel.D,
  },
  'Steel Bow': {
    name: 'Steel Bow', type: WeaponType.BOW,
    mt: 9, hit: 70, crit: 0,
    minRange: 2, maxRange: 2, usesMagic: false,
    effectiveAgainst: ['flying'],
    weight: 9, requiredRank: WeaponRankLevel.D,
  },
  'Silver Sword': {
    name: 'Silver Sword', type: WeaponType.SWORD,
    mt: 13, hit: 80, crit: 0,
    minRange: 1, maxRange: 1, usesMagic: false,
    weight: 8, requiredRank: WeaponRankLevel.C,
  },
  'Silver Axe': {
    name: 'Silver Axe', type: WeaponType.AXE,
    mt: 15, hit: 70, crit: 0,
    minRange: 1, maxRange: 1, usesMagic: false,
    weight: 12, requiredRank: WeaponRankLevel.C,
  },
  'Silver Lance': {
    name: 'Silver Lance', type: WeaponType.LANCE,
    mt: 14, hit: 75, crit: 0,
    minRange: 1, maxRange: 1, usesMagic: false,
    weight: 10, requiredRank: WeaponRankLevel.C,
  },
  'Silver Bow': {
    name: 'Silver Bow', type: WeaponType.BOW,
    mt: 13, hit: 75, crit: 0,
    minRange: 2, maxRange: 2, usesMagic: false,
    effectiveAgainst: ['flying'],
    weight: 6, requiredRank: WeaponRankLevel.C,
  },
  'Brave Sword': {
    name: 'Brave Sword', type: WeaponType.SWORD,
    mt: 9, hit: 80, crit: 0,
    minRange: 1, maxRange: 1, usesMagic: false,
    consecutiveAttacks: 2, weight: 12, requiredRank: WeaponRankLevel.B,
  },
  'Brave Axe': {
    name: 'Brave Axe', type: WeaponType.AXE,
    mt: 10, hit: 65, crit: 0,
    minRange: 1, maxRange: 1, usesMagic: false,
    consecutiveAttacks: 2, weight: 16, requiredRank: WeaponRankLevel.B,
  },
  'Brave Lance': {
    name: 'Brave Lance', type: WeaponType.LANCE,
    mt: 10, hit: 70, crit: 0,
    minRange: 1, maxRange: 1, usesMagic: false,
    consecutiveAttacks: 2, weight: 14, requiredRank: WeaponRankLevel.B,
  },
  'Brave Bow': {
    name: 'Brave Bow', type: WeaponType.BOW,
    mt: 10, hit: 75, crit: 0,
    minRange: 2, maxRange: 2, usesMagic: false,
    effectiveAgainst: ['flying'],
    consecutiveAttacks: 2, weight: 10, requiredRank: WeaponRankLevel.B,
  },
  Javelin: {
    name: 'Javelin',
    type: WeaponType.LANCE,
    mt: 5,
    hit: 65,
    crit: 0,
    minRange: 1,
    maxRange: 2,
    usesMagic: false,
    requiredRank: WeaponRankLevel.D,
  },
  'Hand Axe': {
    name: 'Hand Axe',
    type: WeaponType.AXE,
    mt: 6,
    hit: 60,
    crit: 0,
    minRange: 1,
    maxRange: 2,
    usesMagic: false,
    requiredRank: WeaponRankLevel.D,
  },
};

export interface TriangleMod {
  mtBonus: number;
  hitBonus: number;
}

const ADVANTAGE: Record<string, WeaponType> = {
  [WeaponType.SWORD]: WeaponType.AXE,
  [WeaponType.AXE]: WeaponType.LANCE,
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
