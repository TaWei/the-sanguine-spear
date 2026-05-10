import { Unit, UnitClass } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData, getWeaponTriangleMod } from './Weapons';
import { getClassTags } from './Effectiveness';
import { getPrimaryWeaponType } from './WeaponRank';
import type { DurabilityTracker } from './DurabilityTracker';

export function calcCombatExp(
  attackerLevel: number,
  defenderLevel: number,
  hit: boolean,
  killed: boolean,
): number {
  if (!hit) {
    return 0;
  }

  const levelDiff = defenderLevel - attackerLevel;
  const hitExp = Math.max(1, Math.floor((31 + levelDiff) / 3));

  if (!killed) {
    return hitExp;
  }

  const killBonus = Math.max(0, levelDiff * 3 + 20);
  return hitExp + killBonus;
}
import {
  calcHitRate,
  calcAvoid,
  calcDisplayHit,
  calcCritRate,
  calcCritAvoid,
  calcDisplayCrit,
  getClassCritBonus,
  calcDamage,
  rollTrueHit,
  rollCrit,
} from './Formulas';

export interface CombatLogEntry {
  attacker: Unit;
  defender: Unit;
  hit: boolean;
  critical: boolean;
  damage: number;
  displayHit: number;
  displayCrit: number;
}

export interface CombatResult {
  log: CombatLogEntry[];
  attackerDied: boolean;
  defenderDied: boolean;
  expAward: number;
  /** Whether the attacker's weapon durability was consumed (at least 1 use) */
  attackerWeaponUsed: boolean;
  /** Whether the defender's weapon durability was consumed (at least 1 use) */
  defenderWeaponUsed: boolean;
}

export interface AttackPreview {
  hit: number;
  crit: number;
  damage: number;
  doubleAttack: boolean;
}

export interface CombatPreview {
  attacker: AttackPreview;
  defender: AttackPreview | null;
}

export class CombatEngine {
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  resolveCombat(
    attacker: Unit,
    defender: Unit,
    attackerWeapon: WeaponData,
    defenderWeapon: WeaponData,
    rng: () => number = Math.random,
    attTracker?: DurabilityTracker,
    defTracker?: DurabilityTracker,
  ): CombatResult {
    const log: CombatLogEntry[] = [];
    let attackerWeaponUsed = false;
    let defenderWeaponUsed = false;

    // Helper: perform attacks (Brave weapons fire consecutiveAttacks times)
    const performAttacks = (
      att: Unit,
      def: Unit,
      wpn: WeaponData,
      defWpn: WeaponData,
      tracker?: DurabilityTracker,
    ): CombatLogEntry[] => {
      const entries: CombatLogEntry[] = [];
      const count = wpn.consecutiveAttacks ?? 1;

      for (let i = 0; i < count; i++) {
        // Don't attack if weapon is broken
        if (tracker && tracker.isBroken) break;
        if (!att.isAlive || !def.isAlive) break;

        const entry = this.resolveHit(att, def, wpn, defWpn, rng);
        if (entry.hit) {
          def.takeDamage(entry.damage);
        }

        // Consume durability (weapon was swung, hit or miss)
        if (tracker) {
          tracker.consume();
        }

        entries.push(entry);
      }
      return entries;
    };

    // Determine follow-up eligibility using Attack Speed
    const attAS = this.computeAttackSpeed(attacker, attackerWeapon);
    const defAS = this.computeAttackSpeed(defender, defenderWeapon);
    const attackerDoubles = attAS - defAS >= 4;
    const defenderDoubles = defAS - attAS >= 4;

    // === Attacker's first attack(s) ===
    const a1entries = performAttacks(attacker, defender, attackerWeapon, defenderWeapon, attTracker);
    log.push(...a1entries);
    if (a1entries.length > 0 && attTracker?.wasUsed) attackerWeaponUsed = true;

    // Check if defender died before counter
    if (!defender.isAlive) {
      const attackerHit = log.some((e) => e.attacker === attacker && e.hit);
      const expAward = calcCombatExp(attacker.level, defender.level, attackerHit, true);
      return { log, attackerDied: false, defenderDied: true, expAward, attackerWeaponUsed, defenderWeaponUsed };
    }

    // === Defender's counterattack(s) ===
    if (
      this.isInRange(defender.gridX, defender.gridY, attacker.gridX, attacker.gridY, defenderWeapon)
    ) {
      // First counter
      const d1entries = performAttacks(defender, attacker, defenderWeapon, attackerWeapon, defTracker);
      log.push(...d1entries);
      if (d1entries.length > 0 && defTracker?.wasUsed) defenderWeaponUsed = true;

      // Defender follow-up (if eligible, attacker alive, weapon not broken)
      if (defenderDoubles && attacker.isAlive) {
        const d2entries = performAttacks(defender, attacker, defenderWeapon, attackerWeapon, defTracker);
        log.push(...d2entries);
      }
    }

    // === Attacker follow-up (GBA FE order: attacker → counter → attacker follow-up) ===
    if (attackerDoubles && attacker.isAlive && defender.isAlive) {
      const a2entries = performAttacks(attacker, defender, attackerWeapon, defenderWeapon, attTracker);
      log.push(...a2entries);
    }

    const attackerDied = !attacker.isAlive;
    const defenderDied = !defender.isAlive;
    const attackerHit = log.some((e) => e.attacker === attacker && e.hit);
    const expAward = attackerDied
      ? 0
      : calcCombatExp(attacker.level, defender.level, attackerHit, defenderDied);

    // Award WEXP — 1 per combat round, +1 bonus for primary weapon type
    this.awardCombatWeaponExp(attacker, attackerWeapon);
    if (defender.isAlive) {
      this.awardCombatWeaponExp(defender, defenderWeapon);
    }

    return { log, attackerDied, defenderDied, expAward, attackerWeaponUsed, defenderWeaponUsed };
  }

  private awardCombatWeaponExp(unit: Unit, weapon: WeaponData): void {
    const isPrimary = getPrimaryWeaponType(unit.unitClass) === weapon.type;
    const wexp = isPrimary ? 2 : 1;
    unit.awardWeaponExp(weapon.type, wexp);
  }

  previewCombat(
    attacker: Unit,
    defender: Unit,
    attackerWeapon: WeaponData,
    defenderWeapon: WeaponData,
  ): CombatPreview {
    const attackerPreview = this.previewAttack(attacker, defender, attackerWeapon, defenderWeapon);

    let defenderPreview: AttackPreview | null = null;
    if (
      this.isInRange(defender.gridX, defender.gridY, attacker.gridX, attacker.gridY, defenderWeapon)
    ) {
      defenderPreview = this.previewAttack(defender, attacker, defenderWeapon, attackerWeapon);
    }

    return { attacker: attackerPreview, defender: defenderPreview };
  }
  private previewAttack(
    attacker: Unit,
    defender: Unit,
    weapon: WeaponData,
    defenderWeapon: WeaponData,
  ): AttackPreview {
    const attStats = attacker.stats;
    const defStats = defender.stats;

    const triangle = getWeaponTriangleMod(weapon.type, defenderWeapon.type);

    const hitRate = calcHitRate(weapon.hit, attStats.skl, attStats.luk) + triangle.hitBonus;
    const defAS = this.computeAttackSpeed(defender, defenderWeapon);
    const terrainData = this.grid.getTerrainData(defender.gridX, defender.gridY);
    const avoid = calcAvoid(defAS, defStats.luk, terrainData.avoidBonus);
    const hit = calcDisplayHit(hitRate, avoid);

    const atkStat = weapon.usesMagic ? attStats.mag : attStats.str;
    const defStat = weapon.usesMagic ? defStats.res : defStats.def;
    const effective = this.isEffective(weapon, defender.unitClass);
    const damage = calcDamage(atkStat, weapon.mt, defStat, weapon.usesMagic, effective, triangle.mtBonus);

    const classBonus = getClassCritBonus(attacker.unitClass);
    const critRate = calcCritRate(weapon.crit, attStats.skl, classBonus);
    const critAvoid = calcCritAvoid(defStats.luk);
    const crit = calcDisplayCrit(critRate, critAvoid);

    const attAS = this.computeAttackSpeed(attacker, weapon);
    const doubleAttack = attAS - defAS >= 4;

    return { hit, crit, damage, doubleAttack };
  }

  private isEffective(weapon: WeaponData, targetClass: UnitClass): boolean {
    if (!weapon.effectiveAgainst) return false;
    const tags = getClassTags(targetClass);
    return weapon.effectiveAgainst.some(tag => tags.has(tag));
  }

  private computeAttackSpeed(unit: Unit, weapon: WeaponData): number {
    const wt = weapon.weight ?? 0;
    const con = unit.stats.con;
    const penalty = Math.max(0, wt - con);
    return Math.max(0, unit.stats.spd - penalty);
  }

  private resolveHit(
    attacker: Unit,
    defender: Unit,
    weapon: WeaponData,
    defenderWeapon: WeaponData,
    rng: () => number,
  ): CombatLogEntry {
    const attStats = attacker.stats;
    const defStats = defender.stats;

    const triangle = getWeaponTriangleMod(weapon.type, defenderWeapon.type);

    const hitRate = calcHitRate(weapon.hit, attStats.skl, attStats.luk) + triangle.hitBonus;
    const defAS = this.computeAttackSpeed(defender, defenderWeapon);
    const terrainData = this.grid.getTerrainData(defender.gridX, defender.gridY);
    const avoid = calcAvoid(defAS, defStats.luk, terrainData.avoidBonus);
    const displayHit = calcDisplayHit(hitRate, avoid);
    const hit = rollTrueHit(displayHit, rng);

    let damage = 0;
    let critical = false;
    let displayCrit = 0;

    if (hit) {
      const atkStat = weapon.usesMagic ? attStats.mag : attStats.str;
      const defStat = weapon.usesMagic ? defStats.res : defStats.def;
      const effective = this.isEffective(weapon, defender.unitClass);
      damage = calcDamage(atkStat, weapon.mt, defStat, weapon.usesMagic, effective, triangle.mtBonus);

      const classBonus = getClassCritBonus(attacker.unitClass);
      const critRate = calcCritRate(weapon.crit, attStats.skl, classBonus);
      const critAvoid = calcCritAvoid(defStats.luk);
      displayCrit = calcDisplayCrit(critRate, critAvoid);
      critical = rollCrit(displayCrit, rng);
      if (critical) {
        damage *= 3;
      }
    }

    return { attacker, defender, hit, critical, damage, displayHit, displayCrit };
  }

  private isInRange(ax: number, ay: number, bx: number, by: number, weapon: WeaponData): boolean {
    const dist = Math.abs(ax - bx) + Math.abs(ay - by);
    return dist >= weapon.minRange && dist <= weapon.maxRange;
  }
}
