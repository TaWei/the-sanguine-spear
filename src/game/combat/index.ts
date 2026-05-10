export { WEAPON_DB, WeaponType, getWeaponTriangleMod } from './Weapons';
export type { WeaponData, TriangleMod } from './Weapons';
export {
  calcHitRate,
  calcAvoid,
  calcDisplayHit,
  calcCritRate,
  calcCritAvoid,
  calcDamage,
  rollTrueHit,
  rollCrit,
} from './Formulas';
export { CombatEngine } from './Engine';
export type { CombatLogEntry, CombatResult } from './Engine';
export { computeAttackRange } from './AttackRange';
export { getClassTags, EFFECTIVE_MULTIPLIER } from './Effectiveness';
export type { UnitClassTag } from './Effectiveness';
export {
  WeaponRankLevel,
  wexpToRank,
  canWield,
  getPrimaryWeaponType,
  createWeaponRank,
  RANK_LABELS,
  WEXP_THRESHOLDS,
} from './WeaponRank';
export type { WeaponRankData } from './WeaponRank';
