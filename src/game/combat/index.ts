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
